import type { MetadataRoute } from "next";
import { listarCategorias, listarPostsParaFeed } from "@/lib/blog";
import { SITE_URL } from "@/lib/urls";

/**
 * Sitemap do SITE institucional + blog.
 *
 * Só entram páginas públicas e indexáveis: /painel, /master, /login, /cadastro,
 * /recibo e /t (ticket público de um cliente) ficam de fora — são áreas de
 * aplicação, não conteúdo. O robots.txt bloqueia essas rotas explicitamente.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categorias] = await Promise.all([
    listarPostsParaFeed(500),
    listarCategorias(),
  ]);

  const atualizadoBlog =
    posts.length > 0 ? new Date(posts[0].atualizado_em) : new Date();

  // O site institucional é ONEPAGE: recursos, preços, novidades, sobre e
  // contato são seções da home (as rotas antigas respondem 301 para a âncora).
  // Âncoras NÃO entram no sitemap — `/#precos` é a mesma URL que `/` para o
  // Google, e listar as duas seria pedir para ele escolher uma.
  const institucionais: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
  ];

  const blog: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/blog`,
      lastModified: atualizadoBlog,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...categorias.map((c) => ({
      url: `${SITE_URL}/blog/categoria/${c.slug}`,
      lastModified: atualizadoBlog,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.atualizado_em),
      changeFrequency: "monthly" as const,
      priority: p.destaque ? 0.9 : 0.7,
    })),
  ];

  return [...institucionais, ...blog];
}
