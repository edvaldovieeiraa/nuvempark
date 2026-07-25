import "server-only";
import type { FaqItem } from "@/app/master/(console)/blog/actions";

/**
 * Tipos e normalização dos posts lidos pelo CONSOLE MASTER.
 *
 * Separado de `lib/blog.ts` de propósito: aquele arquivo é a camada pública
 * (cliente anon, só posts publicados) e não deve ganhar nada que só o master
 * usa. Aqui as linhas chegam pelo admin client — inclusive rascunho e
 * arquivado.
 */

/** Linha crua de blog_posts como o editor precisa dela. */
export type PostCruMaster = {
  id: string;
  titulo: string;
  slug: string;
  resumo: string;
  conteudo_md: string;
  capa_url: string | null;
  categoria_id: string | null;
  autor_id: string | null;
  destaque: boolean;
  faq: unknown;
  seo_titulo: string | null;
  palavras_chave: string[] | null;
  status: string;
  publicado_em: string | null;
};

/**
 * `faq` é jsonb: valida item a item antes de virar estado do editor.
 * Mesma checagem que a camada pública faz — um jsonb editado à mão no banco
 * não pode derrubar a tela.
 */
export function normalizarFaq(valor: unknown): FaqItem[] {
  if (!Array.isArray(valor)) return [];
  const itens: FaqItem[] = [];
  for (const bruto of valor) {
    if (typeof bruto !== "object" || bruto === null) continue;
    const obj = bruto as Record<string, unknown>;
    const pergunta = typeof obj.pergunta === "string" ? obj.pergunta : "";
    const resposta = typeof obj.resposta === "string" ? obj.resposta : "";
    if (!pergunta && !resposta) continue;
    itens.push({ pergunta, resposta });
  }
  return itens;
}
