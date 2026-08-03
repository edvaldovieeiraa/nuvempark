import { llmsTxt } from "@/lib/agentes/llms";

/**
 * /llms.txt — AEO (Answer Engine Optimization).
 *
 * Formato em texto simples que crawlers de IA leem para entender um site sem
 * precisar interpretar o HTML: o que é o produto, para quem, e onde está o
 * conteúdo canônico. É o análogo do robots.txt para modelos de linguagem.
 *
 * O corpo mora em `lib/agentes/llms.ts` — o `/llms-full.txt` compartilha o mesmo
 * cabeçalho, e conteúdo duplicado entre os dois arquivos seria a primeira coisa
 * a divergir.
 */
export const revalidate = 3600;

export async function GET() {
  return new Response(await llmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
