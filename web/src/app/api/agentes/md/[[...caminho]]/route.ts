import { markdownDoCaminho } from "@/lib/agentes/markdown";
import { urlSite } from "@/lib/urls";

/**
 * Versão em Markdown de qualquer página pública do site.
 *
 * NUNCA é acessado por esta URL de fora: o middleware (`src/middleware.ts`)
 * reescreve para cá quando a requisição pede Markdown — por
 * `Accept: text/markdown` na URL normal ou pelo sufixo `.md`. O agente vê
 * `/precos` ou `/precos.md`; este caminho `/api/agentes/md/...` é interno (e
 * bloqueado no robots.txt, junto com o resto de `/api/`).
 *
 * `Vary: Accept` é obrigatório aqui e no HTML: sem ele, um cache compartilhado
 * (Cloudflare, na nossa frente) pode servir Markdown para um navegador — ou HTML
 * para um agente.
 *
 * O `rel="canonical"` aponta para o HTML. Sem `noindex` de propósito: canonical
 * e noindex juntos são sinais contraditórios para o Google, e o canonical já
 * resolve a duplicidade de conteúdo.
 */
export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caminho?: string[] }> },
) {
  const { caminho } = await params;
  const rota = `/${(caminho ?? []).join("/")}`.replace(/\/+$/, "") || "/";

  const markdown = await markdownDoCaminho(rota);

  if (markdown === null) {
    return new Response(
      `# 404\n\nNão existe versão em Markdown de \`${rota}\`.\nO índice do site está em ${urlSite("/llms.txt")}.\n`,
      {
        status: 404,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept",
        },
      },
    );
  }

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
      Link: `<${urlSite(rota)}>; rel="canonical"`,
      "Cache-Control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
