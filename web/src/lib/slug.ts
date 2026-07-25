/**
 * Slug em pt-BR — fonte ÚNICA do algoritmo.
 *
 * Usado em dois lugares que precisam concordar: o slug do post (URL pública,
 * gerado no console master) e o id das âncoras dos títulos dentro do Markdown.
 * Duas implementações separadas divergiriam no primeiro caso esquisito
 * ("Ação & Reação", "3º turno"), então mora aqui.
 *
 * Sem dependências e sem `server-only`: roda no servidor (Server Actions) e no
 * navegador (o editor gera o slug enquanto o autor digita o título).
 */

/** Marcas de acento soltas pelo NFD (combining diacritical marks). */
const RE_ACENTOS = /[̀-ͯ]/g;

/**
 * "Como fechar o CAIXA por turno?" -> "como-fechar-o-caixa-por-turno".
 *
 * Normaliza para NFD e descarta os acentos (ç → c, ã → a), baixa a caixa,
 * troca tudo que não é [a-z0-9] por hífen e apara as pontas.
 * `limite` corta em 80 por padrão — slug longo não ajuda ninguém, e o corte
 * respeita a fronteira de palavra para não terminar em "estaciona-".
 */
export function slugify(texto: string, limite = 80): string {
  const base = texto
    .normalize("NFD")
    .replace(RE_ACENTOS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length <= limite) return base;

  const cortado = base.slice(0, limite);
  const ultimoHifen = cortado.lastIndexOf("-");
  // Só corta na palavra se sobrar slug suficiente; senão aceita a palavra partida.
  const final = ultimoHifen > limite * 0.6 ? cortado.slice(0, ultimoHifen) : cortado;
  return final.replace(/-+$/, "");
}

/** Formato aceito na URL: minúsculas, números e hífens simples. */
export function slugValido(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 120;
}
