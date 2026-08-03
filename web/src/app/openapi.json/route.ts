import { urlSite } from "@/lib/urls";

/**
 * GET /openapi.json — descrição da API PÚBLICA do ticket (OpenAPI 3.1).
 *
 * Escopo, e por que só isso: de tudo que a nuvempark-api expõe, apenas o grupo
 * `/api/public/v1/ticket` é aberto sem credencial e destinado a quem não é a
 * nossa própria operação — o cliente que escaneou o QR do cupom. As rotas
 * `/api/mobile/v1/patio` (app do operador) e os webhooks do PSP NÃO entram aqui:
 * exigem token de dispositivo ou assinatura do gateway e documentá-las só
 * ajudaria quem quer sondá-las.
 *
 * A identidade da requisição é o próprio UUID do ticket, que está impresso no
 * cupom de quem o tem. Por isso todo caminho de recusa devolve o MESMO 404
 * genérico (ver `api/src/routes/publico.ts`) — o que está documentado abaixo de
 * propósito, para ninguém interpretar 404 como "não existe".
 *
 * Servido em `text/plain`? Não: `application/vnd.oai.openapi+json` é o tipo
 * registrado, e é ele que o `rel="service-desc"` do Link header anuncia.
 */
export const dynamic = "force-static";

const API = "https://api.nuvempark.com/api/public/v1";

const ERRO = {
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
} as const;

const espec = {
  openapi: "3.1.0",
  info: {
    title: "NuvemPark — API pública do ticket",
    version: "1.0.0",
    summary:
      "Consulta da estadia e pagamento por Pix do ticket de estacionamento.",
    description: [
      "API sem autenticação usada pela página pública do ticket: o cliente",
      "escaneia o QR Code impresso no cupom, vê quanto a estadia custa agora e",
      "paga por Pix.",
      "",
      "**Identidade por posse do link.** Não há credencial: quem conhece o UUID",
      "do ticket é quem tem o cupom físico. Em consequência, *todo* caminho de",
      "recusa devolve o mesmo `404` genérico — ticket inexistente, já encerrado,",
      "pátio inativo e assinatura suspensa são indistinguíveis de fora. Um 404",
      "não significa que o ticket não existe.",
      "",
      "**Limite de uso:** 30 requisições por minuto por IP.",
      "",
      `Índice do site para agentes: ${urlSite("/llms.txt")}`,
    ].join("\n"),
    contact: { name: "NuvemPark", email: "contato@nuvempark.com" },
  },
  servers: [{ url: API, description: "Produção" }],
  paths: {
    "/ticket/{id}": {
      get: {
        operationId: "consultarTicket",
        summary: "Estado atual da estadia",
        description:
          "Valor calculado até este instante, usando o relógio do servidor (o do celular do cliente pode estar errado).",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "UUID do ticket, impresso no QR Code do cupom.",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Ticket visível.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Ticket" },
              },
            },
          },
          "404": {
            description: "Não visível (ver nota sobre o 404 genérico).",
            content: { "application/json": { schema: ERRO } },
          },
          "429": { description: "Limite de requisições excedido." },
        },
      },
    },
    "/ticket/{id}/pix": {
      post: {
        operationId: "gerarPixDoTicket",
        summary: "Gera (ou reaproveita) a cobrança Pix da estadia",
        description: [
          "Idempotente na prática: enquanto houver cobrança pendente e válida",
          "para o ticket, a mesma é devolvida — recarregar a página ou tocar duas",
          "vezes no botão não cria dois Pix. A cobrança expira em 30 minutos.",
          "",
          "Cobra a estadia inteira, ou apenas a diferença quando o cliente já",
          "pagou e passou da carência.",
        ].join("\n"),
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Cobrança pronta para pagamento.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CobrancaPix" },
              },
            },
          },
          "404": {
            description: "Não visível (ver nota sobre o 404 genérico).",
            content: { "application/json": { schema: ERRO } },
          },
          "409": {
            description:
              "Nada a cobrar: estadia já paga, dentro da tolerância, ou valor zero.",
            content: { "application/json": { schema: ERRO } },
          },
          "429": { description: "Limite de requisições excedido." },
        },
      },
    },
    "/ticket/{id}/pagamento": {
      get: {
        operationId: "consultarPagamentoDoTicket",
        summary: "Status do pagamento (para polling)",
        description:
          "O caminho normal de confirmação é o webhook do provedor. Este endpoint é a rede de segurança para webhook perdido: passados 60 segundos de pendência, ele consulta o provedor antes de responder.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Status atual.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status_pagamento: {
                      $ref: "#/components/schemas/StatusPagamento",
                    },
                  },
                  required: ["status_pagamento"],
                },
              },
            },
          },
          "404": {
            description: "Não visível (ver nota sobre o 404 genérico).",
            content: { "application/json": { schema: ERRO } },
          },
          "429": { description: "Limite de requisições excedido." },
        },
      },
    },
  },
  components: {
    schemas: {
      StatusPagamento: {
        type: "string",
        enum: ["nao_pago", "pago", "pago_diferenca_pendente"],
        description: [
          "`nao_pago` — nada pago ainda.",
          "`pago` — pago e sem diferença devida.",
          "`pago_diferenca_pendente` — pagou, ficou além da carência de 20",
          "minutos e a estadia já custa mais do que foi pago.",
        ].join(" "),
      },
      Ticket: {
        type: "object",
        properties: {
          placa: {
            type: "string",
            description:
              "Placa do veículo, sem máscara — o cliente precisa confirmar que o cupom é do carro dele.",
            examples: ["ABC1D23"],
          },
          entrada: {
            type: "string",
            format: "date-time",
            description: "Momento da entrada no pátio.",
          },
          agora: {
            type: "string",
            format: "date-time",
            description:
              "Relógio do servidor no instante da resposta. Use este valor como referência, não o do dispositivo.",
          },
          patio_nome: { type: "string" },
          status_pagamento: { $ref: "#/components/schemas/StatusPagamento" },
          valor_atual: {
            type: ["number", "null"],
            description:
              "Valor da estadia até `agora`, em reais. `null` quando pago e ainda dentro da carência (mostrar o número subindo confundiria o cliente), ou quando o pátio não tem tarifa aplicável.",
          },
          pago: {
            description: "Presente quando houve pagamento online.",
            oneOf: [
              {
                type: "object",
                properties: {
                  valor: { type: "number" },
                  pagoEm: { type: "string", format: "date-time" },
                  carenciaAte: {
                    type: "string",
                    format: "date-time",
                    description:
                      "Até quando o valor pago vale, mesmo com o carro no pátio.",
                  },
                },
                required: ["valor", "pagoEm", "carenciaAte"],
              },
              { type: "null" },
            ],
          },
          diferenca: {
            type: ["number", "null"],
            description:
              "Quanto ainda falta, em reais, quando a carência estourou. `null` nos demais casos.",
          },
          carencia_minutos: {
            type: "integer",
            description:
              "Janela em que o valor pago vale mesmo o carro continuando no pátio.",
            examples: [20],
          },
        },
        required: [
          "placa",
          "entrada",
          "agora",
          "patio_nome",
          "status_pagamento",
          "carencia_minutos",
        ],
      },
      CobrancaPix: {
        type: "object",
        properties: {
          pagamento_id: { type: "string", format: "uuid" },
          valor: { type: "number", description: "Em reais." },
          pix_copia_cola: {
            type: "string",
            description: "Payload EMV do Pix, para colar no app do banco.",
          },
          pix_qrcode_base64: {
            type: ["string", "null"],
            description: "PNG do QR Code em base64, quando o provedor devolve.",
          },
          expira_em: { type: "string", format: "date-time" },
        },
        required: ["pagamento_id", "valor", "pix_copia_cola", "expira_em"],
      },
    },
  },
} as const;

export async function GET() {
  return new Response(JSON.stringify(espec, null, 2), {
    headers: {
      "Content-Type": "application/vnd.oai.openapi+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
