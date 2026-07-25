import { listarPostsParaFeed } from "@/lib/blog";
import { SITE_URL, urlSite } from "@/lib/urls";

/**
 * Feed RSS 2.0 com os 20 posts mais recentes.
 *
 * Cacheado por 15 minutos: leitores de RSS batem com frequência e o conteúdo
 * muda pouco. O `POST /api/blog/revalidate` também derruba este cache ao
 * publicar, então o feed nunca fica mais de um ciclo atrás.
 */
export const revalidate = 900;

/** Escapa o que não pode aparecer cru dentro de um nó XML. */
function xml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await listarPostsParaFeed(20);
  const agora = new Date();
  const atualizadoEm =
    posts.length > 0 ? new Date(posts[0].publicado_em) : agora;

  const itens = posts
    .map((post) => {
      const link = urlSite(`/blog/${post.slug}`);
      return `    <item>
      <title>${xml(post.titulo)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="true">${xml(link)}</guid>
      <description>${xml(post.resumo)}</description>
      <pubDate>${new Date(post.publicado_em).toUTCString()}</pubDate>
      <author>contato@nuvempark.com (${xml(post.autor?.nome ?? "Equipe NuvemPark")})</author>${
        post.categoria ? `\n      <category>${xml(post.categoria.nome)}</category>` : ""
      }
    </item>`;
    })
    .join("\n");

  const corpo = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog NuvemPark</title>
    <link>${xml(urlSite("/blog"))}</link>
    <atom:link href="${xml(urlSite("/blog/rss.xml"))}" rel="self" type="application/rss+xml" />
    <description>Gestão de estacionamento na prática: caixa, tarifas, tecnologia de pátio e faturamento em tempo real.</description>
    <language>pt-BR</language>
    <copyright>© ${agora.getUTCFullYear()} NuvemPark</copyright>
    <lastBuildDate>${atualizadoEm.toUTCString()}</lastBuildDate>
    <generator>NuvemPark</generator>
    <image>
      <url>${xml(`${SITE_URL}/icon.png`)}</url>
      <title>Blog NuvemPark</title>
      <link>${xml(urlSite("/blog"))}</link>
    </image>
${itens}
  </channel>
</rss>
`;

  return new Response(corpo, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
