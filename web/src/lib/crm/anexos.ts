/**
 * Prints das notas do CRM (spec, req. 17–25b). Regras puras, usadas no
 * navegador (antes de enviar) e no servidor (ao receber). O servidor nunca
 * confia no tipo nem no tamanho que o navegador diz: confere os bytes.
 */

export const LIMITE_PRINTS = 5;
export const LIMITE_BYTES = 5 * 1024 * 1024;
export const LADO_MAXIMO = 2560;

export const TIPOS_PRINT = ["image/webp", "image/jpeg", "image/png"] as const;
export type TipoPrint = (typeof TIPOS_PRINT)[number];

export function ehTipoPrint(v: unknown): v is TipoPrint {
  return typeof v === "string" && (TIPOS_PRINT as readonly string[]).includes(v);
}

/** Quantos dos prints novos cabem na nota, que já tem `atual`. */
export function cabeNaNota(atual: number, novos: number): { aceitos: number; recusados: number } {
  const aceitos = Math.max(0, Math.min(novos, LIMITE_PRINTS - atual));
  return { aceitos, recusados: novos - aceitos };
}

/** Lado maior até `max`, proporção mantida; nunca aumenta nem chega a zero. */
export function dimensoesReduzidas(
  largura: number,
  altura: number,
  max = LADO_MAXIMO,
): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (maior <= max) return { largura, altura };
  const f = max / maior;
  return {
    largura: Math.max(1, Math.round(largura * f)),
    altura: Math.max(1, Math.round(altura * f)),
  };
}

function ascii(b: Uint8Array, ini: number, n: number): string {
  if (b.length < ini + n) return "";
  return String.fromCharCode(...b.subarray(ini, ini + n));
}

/** Tipo pelos primeiros bytes (assinatura do formato), não pelo nome. */
export function tipoPorBytes(b: Uint8Array): TipoPrint | null {
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === "PNG" && b[4] === 0x0d && b[5] === 0x0a)
    return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image/webp";
  return null;
}

const be16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const be32 = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const le24 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);

type Dim = { largura: number; altura: number } | null;

function dimPng(b: Uint8Array): Dim {
  if (b.length < 24 || ascii(b, 12, 4) !== "IHDR") return null;
  return { largura: be32(b, 16), altura: be32(b, 20) };
}

/** Percorre os segmentos até o primeiro SOF (C0–CF, menos C4, C8 e CC). */
function dimJpeg(b: Uint8Array): Dim {
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      i += 2;
      continue;
    }
    if (m === 0xd9 || m === 0xda) return null;
    const tam = be16(b, i + 2);
    if (tam < 2) return null;
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      if (i + 9 > b.length) return null;
      return { altura: be16(b, i + 5), largura: be16(b, i + 7) };
    }
    i += 2 + tam;
  }
  return null;
}

function dimWebp(b: Uint8Array): Dim {
  const tipo = ascii(b, 12, 4);
  if (tipo === "VP8X" && b.length >= 30) return { largura: le24(b, 24) + 1, altura: le24(b, 27) + 1 };
  if (tipo === "VP8L" && b.length >= 25 && b[20] === 0x2f) {
    const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { largura: (v & 0x3fff) + 1, altura: ((v >>> 14) & 0x3fff) + 1 };
  }
  if (tipo === "VP8 " && b.length >= 30 && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) {
    return { largura: (b[26] | (b[27] << 8)) & 0x3fff, altura: (b[28] | (b[29] << 8)) & 0x3fff };
  }
  return null;
}

/** Largura e altura lidas do cabeçalho, sem decodificar a imagem. */
export function dimensoesDoCabecalho(b: Uint8Array, tipo: TipoPrint): Dim {
  const d = tipo === "image/png" ? dimPng(b) : tipo === "image/jpeg" ? dimJpeg(b) : dimWebp(b);
  if (!d || d.largura < 1 || d.altura < 1 || d.largura > 20000 || d.altura > 20000) return null;
  return d;
}

export function extensaoDoTipo(t: TipoPrint): "webp" | "jpg" | "png" {
  return t === "image/webp" ? "webp" : t === "image/jpeg" ? "jpg" : "png";
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RE_UUID = new RegExp(`^${UUID}$`);

/** Caminho no bucket: `{lead_id}/{uuid}.{ext}`. Só o servidor gera. */
export function novoCaminho(leadId: string, uuid: string, tipo: TipoPrint): string {
  return `${leadId}/${uuid}.${extensaoDoTipo(tipo)}`;
}

/** O caminho é um print deste lead? (a mesma regra da `fn_crm_registrar_interacao`) */
export function caminhoDoLead(leadId: string, caminho: string): boolean {
  if (!RE_UUID.test(leadId)) return false;
  return new RegExp(`^${leadId}/${UUID}\\.(webp|jpg|png)$`).test(caminho);
}
