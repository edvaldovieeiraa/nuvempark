import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/blog/revalidate — derruba o cache ISR do blog.
 *
 * Quem chama é o console master ao publicar/editar/despublicar um post
 * (Etapa 2). Protegido por segredo compartilhado no header
 * `x-blog-revalidate-secret`, comparado em tempo constante.
 *
 * Fail-closed: sem BLOG_REVALIDATE_SECRET no ambiente, a rota responde 503 —
 * nunca "libera geral por falta de configuração".
 *
 * Corpo (JSON, opcional): { "slug": "meu-post" }
 * Sem slug, revalida o blog inteiro (listagens, feed, sitemap e todos os posts).
 */
export const dynamic = "force-dynamic";

const HEADER_SEGREDO = "x-blog-revalidate-secret";

/** Comparação em tempo constante — não vaza o segredo por tempo de resposta. */
function segredoConfere(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido, "utf8");
  const b = Buffer.from(esperado, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const esperado = process.env.BLOG_REVALIDATE_SECRET;
  if (!esperado) {
    return NextResponse.json(
      { erro: "BLOG_REVALIDATE_SECRET não configurado no servidor." },
      { status: 503 },
    );
  }

  const recebido = request.headers.get(HEADER_SEGREDO) ?? "";
  if (!recebido || !segredoConfere(recebido, esperado)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let slug = "";
  try {
    const corpo: unknown = await request.json();
    if (typeof corpo === "object" && corpo !== null && "slug" in corpo) {
      const bruto = (corpo as { slug: unknown }).slug;
      if (typeof bruto === "string") slug = bruto.trim();
    }
  } catch {
    // Corpo vazio ou não-JSON: tratado como "revalida tudo".
  }

  const caminhos: string[] = [];

  // Listagens: o `"page"` faz o Next invalidar TODAS as variações do segmento
  // dinâmico (todas as categorias, todas as páginas), não uma URL específica.
  revalidatePath("/blog");
  caminhos.push("/blog");

  revalidatePath("/blog/pagina/[n]", "page");
  caminhos.push("/blog/pagina/[n]");

  revalidatePath("/blog/categoria/[slug]", "page");
  caminhos.push("/blog/categoria/[slug]");

  revalidatePath("/blog/categoria/[slug]/pagina/[n]", "page");
  caminhos.push("/blog/categoria/[slug]/pagina/[n]");

  // Post: só o que mudou, se veio slug; senão, o segmento inteiro.
  if (slug && /^[a-z0-9-]{1,120}$/.test(slug)) {
    revalidatePath(`/blog/${slug}`);
    caminhos.push(`/blog/${slug}`);
  } else {
    revalidatePath("/blog/[slug]", "page");
    caminhos.push("/blog/[slug]");
  }

  // Derivados: feed, sitemap e o arquivo de AEO listam posts.
  revalidatePath("/blog/rss.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
  caminhos.push("/blog/rss.xml", "/sitemap.xml", "/llms.txt");

  return NextResponse.json({ ok: true, revalidado: caminhos });
}
