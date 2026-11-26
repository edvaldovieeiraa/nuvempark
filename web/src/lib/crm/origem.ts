/**
 * Origem de primeiro toque (req. 20): cookie `np_origem`.
 *
 * Guarda só campanha (utm_source/medium/campaign), o caminho da primeira página
 * e a data — nada de dado pessoal (premissa 3 da spec).
 *
 * É gravado NO NAVEGADOR (`components/site/origem-primeiro-toque.tsx`), não pelo
 * servidor: o HTML do site sai do cache da Cloudflare (SEO.md §9.2) e um
 * `Set-Cookie` da origem não chegaria a quem recebe a cópia da borda.
 *
 * ⚠️ Tudo o que vem daqui é dado do visitante, portanto adulterável. Os cortes
 * (UTM ≤ 100, caminho ≤ 200, sem caractere de controle) são os mesmos limites
 * das colunas e da policy anônima de `leads_site` (db/47): sem eles, um UTM
 * longo faria a policy RECUSAR o formulário de contato e o lead se perderia.
 * Por isso o corte se repete na leitura — nunca confiar no que está no cookie.
 *
 * TS puro, sem import de servidor nem de browser: roda nos dois e no vitest.
 */

export const COOKIE_ORIGEM = "np_origem";
export const ORIGEM_DIAS = 90;

const UTM_MAX = 100;
const CAMINHO_MAX = 200;
const DATA_MAX = 40;
/** Navegador descarta cookie acima de ~4 KB sem avisar; nem tentamos chegar perto. */
const COOKIE_MAX = 3500;

export type Origem = {
  v: 1;
  src: string | null;
  med: string | null;
  camp: string | null;
  caminho: string | null;
  em: string | null;
};

// C0, DEL e C1.
const RE_CONTROLE = /[\u0000-\u001f\u007f-\u009f]/g;

/** Surrogate UTF-16 solto: `Array.from` o devolve sozinho como um "caractere". */
function ehSurrogateSolto(c: string): boolean {
  if (c.length !== 1) return false;
  const u = c.charCodeAt(0);
  return u >= 0xd800 && u <= 0xdfff;
}

/**
 * Tira caractere de controle e surrogate solto, apara e corta em `max`
 * caracteres. Corta por code point (`Array.from`), não por unidade UTF-16:
 * partir um emoji ao meio deixaria um surrogate solto, que faz
 * `encodeURIComponent` lançar e o Postgres recusar o JSON do insert.
 */
export function limparTexto(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null;
  const chars = Array.from(valor.replace(RE_CONTROLE, "")).filter((c) => !ehSurrogateSolto(c));
  const limpo = chars.join("").trim();
  if (!limpo) return null;
  const finais = Array.from(limpo);
  const cortado = finais.length > max ? finais.slice(0, max).join("").trim() : limpo;
  return cortado || null;
}

const limpar = limparTexto;

export function cortarUtm(valor: unknown): string | null {
  return limpar(valor, UTM_MAX);
}

export function cortarCaminho(valor: unknown): string | null {
  return limpar(valor, CAMINHO_MAX);
}

function lerData(valor: unknown): string | null {
  const s = limpar(valor, DATA_MAX);
  if (!s || Number.isNaN(Date.parse(s))) return null;
  return s;
}

/** Origem a partir da URL da página. URL inválida → null (não lança). */
export function extrairOrigem(url: URL | string, agora: Date = new Date()): Origem | null {
  let u: URL;
  try {
    u = typeof url === "string" ? new URL(url) : url;
  } catch {
    return null;
  }
  const q = u.searchParams;
  return {
    v: 1,
    src: cortarUtm(q.get("utm_source")),
    med: cortarUtm(q.get("utm_medium")),
    camp: cortarUtm(q.get("utm_campaign")),
    caminho: cortarCaminho(u.pathname),
    em: Number.isNaN(agora.getTime()) ? null : agora.toISOString(),
  };
}

/** Valor do cookie (JSON codificado para URL) ou null se passar do tamanho seguro. */
export function serializarOrigem(origem: Origem): string | null {
  try {
    const valor = encodeURIComponent(
      JSON.stringify({
        v: 1,
        src: cortarUtm(origem.src),
        med: cortarUtm(origem.med),
        camp: cortarUtm(origem.camp),
        caminho: cortarCaminho(origem.caminho),
        em: lerData(origem.em),
      }),
    );
    return valor.length > COOKIE_MAX ? null : valor;
  } catch {
    return null;
  }
}

function parse(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

/**
 * Lê o valor do cookie. Aceita o valor cru (`document.cookie`) e o já
 * decodificado (`request.cookies` / `cookies()` do Next decodificam). Ausente,
 * truncado, não-JSON, versão errada ou grande demais → null. NUNCA lança.
 */
export function lerOrigem(valor: string | null | undefined): Origem | null {
  if (typeof valor !== "string" || !valor || valor.length > COOKIE_MAX) return null;

  let bruto = parse(valor);
  if (bruto === undefined) {
    try {
      bruto = parse(decodeURIComponent(valor));
    } catch {
      return null;
    }
  }
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) return null;

  const o = bruto as Record<string, unknown>;
  if (o.v !== 1) return null;
  return {
    v: 1,
    src: cortarUtm(o.src),
    med: cortarUtm(o.med),
    camp: cortarUtm(o.camp),
    caminho: cortarCaminho(o.caminho),
    em: lerData(o.em),
  };
}

function normalizarHost(h: string | null | undefined): string {
  return (h ?? "").trim().toLowerCase().replace(/\.$/, "");
}

/**
 * `Domain` do cookie. Se o host do app é subdomínio do site
 * (`dashboard.nuvempark.com` × `nuvempark.com`), o cookie sai com
 * `Domain=.nuvempark.com` para o primeiro toque do site chegar ao cadastro no
 * host do app. Sem as variáveis (dev) ou sem relação entre os hosts, sem Domain.
 *
 * `hostAtual` (opcional): se a página está fora desse domínio (ex.: localhost
 * com env de produção no build), o navegador recusaria o cookie inteiro — então
 * também sai sem Domain.
 */
export function dominioDoCookie(
  appHost: string | null | undefined,
  siteHost: string | null | undefined,
  hostAtual?: string | null,
): string | undefined {
  const app = normalizarHost(appHost);
  const site = normalizarHost(siteHost);
  if (!app || !site || !app.endsWith("." + site)) return undefined;
  if (hostAtual !== undefined && hostAtual !== null) {
    const atual = normalizarHost(hostAtual);
    if (atual !== site && !atual.endsWith("." + site)) return undefined;
  }
  return "." + site;
}

/** Colunas `utm_*` de `leads_site`, já cortadas. */
export function utmParaLead(origem: Origem | null): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} {
  return {
    utm_source: cortarUtm(origem?.src),
    utm_medium: cortarUtm(origem?.med),
    utm_campaign: cortarUtm(origem?.camp),
  };
}
