import { llmsTxt } from "@/lib/agentes/llms";

/**
 * `/.well-known/agents.md` (reescrito para cá no `next.config.ts`).
 *
 * Mesmo conteúdo do `/llms.txt`, servido como `text/markdown` — que é o que
 * agentes procurando por um "guia do site" esperam encontrar sob
 * `/.well-known/`. Um arquivo só de conteúdo, dois tipos de mídia: se o texto
 * fosse duplicado aqui, divergiria na primeira mudança de preço.
 */
export const revalidate = 3600;

export async function GET() {
  return new Response(await llmsTxt(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
