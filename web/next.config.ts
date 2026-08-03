import type { NextConfig } from "next";

/**
 * Host do Storage do Supabase — de onde vêm as capas dos posts do blog.
 * Sai da mesma env que o cliente já usa; ausente (build sem .env), a lista fica
 * vazia e o `next/image` simplesmente não recebe nenhum host remoto liberado.
 */
function hostSupabase(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
}

const host = hostSupabase();

/**
 * ── DESCOBERTA POR AGENTES ───────────────────────────────────────────────────
 *
 * Um agente que chega no site não deveria ter que adivinhar onde estão o índice
 * em texto, a descrição da API ou o sitemap. Estes `Link` de resposta (RFC 8288)
 * anunciam tudo isso já no cabeçalho, antes de qualquer HTML ser baixado.
 *
 * URLs relativas de propósito: resolvem contra a URL da requisição, então o
 * mesmo cabeçalho vale em produção, em preview e em localhost.
 *
 * Só os `rel` que existem de fato: `describedby` e `sitemap` são registrados no
 * IANA, `api-catalog` vem da RFC 9727 e `service-desc` da RFC 8631. O
 * `llms-txt` é convenção emergente (llmstxt.org) e vai junto do `describedby`
 * para o mesmo alvo — quem entende um, entende.
 */
const DESCOBERTA_AGENTE = [
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</llms.txt>; rel="llms-txt"; type="text/plain"',
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</blog/rss.xml>; rel="alternate"; type="application/rss+xml"',
];

/**
 * Páginas do site que têm versão em Markdown.
 *
 * ⚠️ Esta lista é espelhada em DOIS outros lugares e as três têm de andar
 * juntas: `src/lib/agentes/paginas.ts` (o conteúdo) e `src/middleware.ts` (quem
 * decide reescrever). O middleware não importa daqui porque roda no Edge e não
 * deve carregar o Markdown inteiro do site no bundle.
 *
 * Encolheu de 7 para 2 quando o site virou ONEPAGE: recursos, preços,
 * novidades, sobre e contato deixaram de ser páginas (viraram seções da home,
 * com 301 das rotas antigas). O conteúdo delas não se perdeu — foi absorvido
 * pelo documento da home em `agentes/paginas.ts`, que agora descreve o site
 * inteiro. Um agente continua tendo tudo, só que num documento só.
 */
const PAGINAS_MARKDOWN = ["/", "/blog"];

/** `/precos` → `/precos.md`; a home vira `/index.md`. */
function alternadoMarkdown(caminho: string): string {
  const md = caminho === "/" ? "/index.md" : `${caminho}.md`;
  return `<${md}>; rel="alternate"; type="text/markdown"`;
}

/**
 * `Vary: Accept` não é decoração: a mesma URL devolve HTML ou Markdown conforme
 * o `Accept`, e sem este cabeçalho um cache compartilhado (Cloudflare, na nossa
 * frente) serviria Markdown para um navegador.
 */
function cabecalhosDescoberta(caminho: string) {
  return [
    {
      key: "Link",
      value: [...DESCOBERTA_AGENTE, alternadoMarkdown(caminho)].join(", "),
    },
    { key: "Vary", value: "Accept" },
  ];
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      ...PAGINAS_MARKDOWN.map((caminho) => ({
        source: caminho,
        headers: cabecalhosDescoberta(caminho),
      })),
      {
        // Um segmento só, sem ponto: pega `/blog/meu-post` e deixa de fora
        // `/blog/rss.xml`, `/blog/categoria/x` e `/blog/pagina/2`.
        source: "/blog/:slug([a-z0-9-]+)",
        headers: [
          {
            key: "Link",
            value: [
              ...DESCOBERTA_AGENTE,
              '</blog/:slug.md>; rel="alternate"; type="text/markdown"',
            ].join(", "),
          },
          { key: "Vary", value: "Accept" },
        ],
      },
    ];
  },

  /**
   * As páginas que viraram seção da home.
   *
   * 301 (permanente) e não 302: a mudança é definitiva e queremos que o Google
   * transfira a autoridade das URLs antigas para a home, em vez de manter as
   * duas concorrendo. Elas estiveram indexadas — sumir com 404 jogaria fora o
   * histórico e daria 404 para quem tem link salvo.
   *
   * O fragmento (`#recursos`) fica no Location e o navegador rola sozinho. Ele
   * NÃO chega ao servidor, então nada aqui depende disso funcionar — se o
   * cliente ignorar a âncora, cai na home, que é o destino certo de qualquer
   * forma.
   */
  async redirects() {
    // `statusCode: 301` e não `permanent: true`: este último emite 308, que
    // preserva o método HTTP. Aqui só chega GET, e 301 é o que toda ferramenta
    // de SEO e todo crawler antigo entende sem hesitar.
    const p301 = (source: string, destination: string) => ({
      source,
      destination,
      statusCode: 301 as const,
    });
    return [
      p301("/recursos", "/#recursos"),
      p301("/precos", "/#precos"),
      p301("/novidades", "/#novidades"),
      p301("/sobre", "/#sobre"),
      p301("/contato", "/#contato"),
      // As versões .md deixaram de existir junto com as páginas. Sem isto elas
      // cairiam no 404 do app em vez de levar ao documento que as substitui.
      p301("/recursos.md", "/index.md"),
      p301("/precos.md", "/index.md"),
      p301("/novidades.md", "/index.md"),
      p301("/sobre.md", "/index.md"),
      p301("/contato.md", "/index.md"),
    ];
  },

  async rewrites() {
    // O App Router ignora diretórios que começam com ponto, então não existe
    // `app/.well-known/`. Os handlers moram em `app/api/agentes/*` e a URL
    // pública é a canônica de cada spec.
    return [
      {
        source: "/.well-known/api-catalog",
        destination: "/api/agentes/api-catalog",
      },
      { source: "/.well-known/agents.md", destination: "/api/agentes/guia" },
    ];
  },

  experimental: {
    serverActions: {
      // O padrão é 1 MB, e o upload de capa do blog (Server Action com
      // multipart) vai até 5 MB — o mesmo limite do bucket `blog-assets`.
      // 6 MB deixa folga para o overhead do multipart.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    // Só os arquivos públicos do Storage. `next/image` recusa qualquer outro
    // host — é o que impede uma capa apontando para fora de virar proxy de
    // otimização de imagem para terceiros.
    remotePatterns: host
      ? [
          {
            protocol: "https",
            hostname: host,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
