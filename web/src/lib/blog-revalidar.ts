import "server-only";
import { revalidatePath } from "next/cache";
import { SITE_URL } from "@/lib/urls";

/**
 * Derruba o cache ISR do blog público depois de uma mudança no console master.
 *
 * Dois caminhos, nessa ordem:
 *
 * 1. POST /api/blog/revalidate (rota da Etapa 1, protegida por
 *    BLOG_REVALIDATE_SECRET). É o caminho oficial e o único que funciona se um
 *    dia o site e o master forem deploys separados.
 *
 * 2. `revalidatePath` local, como REDE. Hoje o site e o master são o mesmo
 *    processo Next (o middleware só roteia por Host), então invalidar aqui
 *    tem exatamente o mesmo efeito. Isso salva o fluxo quando o segredo não
 *    está configurado ou quando a chamada HTTP não completa — por exemplo se
 *    o WAF do Cloudflare barrar um POST vindo da própria VPS.
 *
 * Nunca falha "de vez": o pior caso é `via: "local"`, e a tela avisa que a
 * revalidação HTTP não passou.
 */

export type ResultadoRevalidacao =
  | { ok: true; via: "http" }
  | { ok: true; via: "local"; motivo: string };

/** Caminhos invalidados no modo local — os mesmos da rota HTTP. */
function revalidarLocalmente(slug?: string) {
  revalidatePath("/blog");
  revalidatePath("/blog/pagina/[n]", "page");
  revalidatePath("/blog/categoria/[slug]", "page");
  revalidatePath("/blog/categoria/[slug]/pagina/[n]", "page");
  if (slug) revalidatePath(`/blog/${slug}`);
  else revalidatePath("/blog/[slug]", "page");
  revalidatePath("/blog/rss.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
}

export async function revalidarBlog(
  slug?: string,
): Promise<ResultadoRevalidacao> {
  const segredo = process.env.BLOG_REVALIDATE_SECRET;

  if (!segredo) {
    revalidarLocalmente(slug);
    return {
      ok: true,
      via: "local",
      motivo:
        "BLOG_REVALIDATE_SECRET não está no .env — usei a revalidação local.",
    };
  }

  try {
    const resposta = await fetch(`${SITE_URL}/api/blog/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-blog-revalidate-secret": segredo,
      },
      body: JSON.stringify({ slug: slug ?? "" }),
      cache: "no-store",
      // O console não pode ficar pendurado esperando a rede: 8s e cai na rede
      // local, que é instantânea.
      signal: AbortSignal.timeout(8000),
    });

    if (resposta.ok) return { ok: true, via: "http" };

    revalidarLocalmente(slug);
    return {
      ok: true,
      via: "local",
      motivo: `${SITE_URL}/api/blog/revalidate respondeu ${resposta.status}.`,
    };
  } catch (erro) {
    revalidarLocalmente(slug);
    return {
      ok: true,
      via: "local",
      motivo:
        erro instanceof Error
          ? `Falha ao chamar ${SITE_URL}/api/blog/revalidate: ${erro.message}`
          : "Falha ao chamar a rota de revalidação.",
    };
  }
}
