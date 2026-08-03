import { urlSite } from "@/lib/urls";

/**
 * Catálogo de APIs — RFC 9727 (`/.well-known/api-catalog`).
 *
 * Servido a partir de `/api/agentes/api-catalog` e reescrito no `next.config.ts`,
 * porque o App Router ignora diretórios que começam com ponto: não existe
 * `app/.well-known/`.
 *
 * Um "linkset" (RFC 9264): cada entrada tem um `anchor` (a URI da API) e os
 * links que a descrevem. Uma API só por enquanto — a pública do ticket. Quando
 * existir API autenticada para terceiros, ela entra aqui com o
 * `oauth-authorization-server` correspondente.
 */
export const dynamic = "force-static";

const API_PUBLICA = "https://api.nuvempark.com/api/public/v1";

export async function GET() {
  const linkset = {
    linkset: [
      {
        anchor: API_PUBLICA,
        "service-desc": [
          {
            href: urlSite("/openapi.json"),
            type: "application/vnd.oai.openapi+json",
            title: "NuvemPark — API pública do ticket (OpenAPI 3.1)",
          },
        ],
        "service-doc": [
          {
            href: urlSite("/llms.txt"),
            type: "text/plain",
            title: "Índice do site e das interfaces de máquina",
          },
        ],
        status: [
          {
            href: "https://api.nuvempark.com/health",
            type: "application/json",
            title: "Healthcheck",
          },
        ],
        author: [{ href: urlSite("/contato"), title: "Contato NuvemPark" }],
      },
    ],
  };

  return new Response(JSON.stringify(linkset, null, 2), {
    headers: {
      "Content-Type": "application/linkset+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
