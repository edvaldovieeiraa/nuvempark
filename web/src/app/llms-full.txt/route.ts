import { llmsFullTxt } from "@/lib/agentes/llms";

/**
 * /llms-full.txt — o site inteiro em um arquivo de texto.
 *
 * Para o agente que precisa de CONTEÚDO, não de mapa: as páginas institucionais
 * e os 20 posts mais recentes, em Markdown, sem navegação nem HTML. Evita 30
 * requisições para responder "quanto custa e funciona offline?".
 *
 * Limite de 20 posts é deliberado: o arquivo cresce ~4 KB por post e ninguém
 * ganha nada com um .txt de 2 MB. O índice completo continua no /llms.txt.
 */
export const revalidate = 3600;

export async function GET() {
  return new Response(await llmsFullTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
