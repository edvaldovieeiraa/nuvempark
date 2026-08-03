import "server-only";
import type { BlogPost } from "@/lib/blog";
import { listarPostsParaFeed, obterPostPorSlug } from "@/lib/blog";
import { urlSite } from "@/lib/urls";
import { markdownDaPagina, paginaPorCaminho } from "./paginas";

/**
 * Resolução de um caminho público → documento Markdown.
 *
 * Usado pelas duas portas de entrada da versão em Markdown do site:
 *
 *  1. negociação de conteúdo — `Accept: text/markdown` na URL normal;
 *  2. sufixo `.md` — `/precos.md`, `/blog/algum-post.md`.
 *
 * As duas caem no mesmo route handler (ver `app/api/agentes/md`), que o proxy
 * reescreve internamente. O agente nunca vê `/api/` na URL.
 *
 * `null` = não existe versão Markdown deste caminho (o handler devolve 404).
 */

/** Um post completo em Markdown: título, metadados, corpo e FAQ. */
export function markdownDoPost(post: BlogPost): string {
  const meta = [
    `Publicado em ${post.publicado_em.slice(0, 10)}`,
    post.categoria ? `Categoria: ${post.categoria.nome}` : null,
    post.autor ? `Autor: ${post.autor.nome}` : null,
    `${post.minutosLeitura} min de leitura`,
  ]
    .filter(Boolean)
    .join(" · ");

  const faq = post.faq.length
    ? `\n\n## Perguntas frequentes\n\n${post.faq
        .map((f) => `**${f.pergunta}**\n\n${f.resposta}`)
        .join("\n\n")}`
    : "";

  return `# ${post.titulo}\n\n${meta}\n\n> ${post.resumo}\n\n${post.conteudo_md}${faq}\n`;
}

/** Índice do blog em Markdown (o mesmo recorte da /blog, sem paginação). */
async function markdownIndiceBlog(): Promise<string> {
  const posts = await listarPostsParaFeed(100);

  const linhas = posts
    .map((p) => {
      const meta = [
        p.publicado_em.slice(0, 10),
        p.categoria?.nome,
        `${p.minutosLeitura} min`,
      ]
        .filter(Boolean)
        .join(" · ");
      return `- [${p.titulo}](${urlSite(`/blog/${p.slug}`)}) — ${meta}\n  ${p.resumo}`;
    })
    .join("\n");

  return `# Blog NuvemPark

> Gestão de estacionamento na prática: caixa, tarifas, tecnologia de pátio e
> faturamento em tempo real.

## Artigos

${linhas || "- (nenhum artigo publicado ainda)"}

Feed RSS: ${urlSite("/blog/rss.xml")}
`;
}

/**
 * Markdown do caminho, ou `null` se o caminho não tem versão em texto.
 * `caminho` já vem normalizado: começa com "/" e não tem o sufixo `.md`.
 */
export async function markdownDoCaminho(
  caminho: string,
): Promise<string | null> {
  const pagina = paginaPorCaminho(caminho);
  if (pagina) return markdownDaPagina(pagina);

  if (caminho === "/blog") return markdownIndiceBlog();

  // /blog/<slug> — só um nível, e nada de /blog/categoria|pagina|busca, que são
  // navegação e não conteúdo.
  const m = /^\/blog\/([a-z0-9-]+)$/.exec(caminho);
  if (m && !["categoria", "pagina", "busca"].includes(m[1])) {
    const post = await obterPostPorSlug(m[1]);
    if (post) return markdownDoPost(post);
  }

  return null;
}
