/**
 * JSON-LD do SITE (home + páginas de solução).
 *
 * O blog já publicava dados estruturados; a home não publicava nenhum. Isso
 * deixava o Google sem saber, em linguagem de máquina, o que a NuvemPark é, o
 * que ela vende e por quanto — justamente os dados que alimentam o painel de
 * conhecimento e a elegibilidade a resultado enriquecido.
 *
 * `schemaOrganizacao`, `schemaMigalhas` e `schemaFaq` moram em `blog-seo.ts` e
 * são reaproveitados aqui de propósito: o `@id` da organização precisa ser
 * BYTE A BYTE o mesmo em todas as páginas, senão o Google enxerga duas
 * entidades diferentes em vez de uma só citada várias vezes.
 */

import { schemaOrganizacao } from "@/lib/blog-seo";
import type { PaginaSolucao } from "@/lib/solucoes";
import { SITE_URL, urlSite } from "@/lib/urls";

type Schema = Record<string, unknown>;

/** Preço público do plano. Espelha `components/site/precos.tsx`. */
export const PRECO_MENSAL = "129.90";
export const MOEDA = "BRL";

/**
 * O site como entidade. Curto de propósito: sem `SearchAction`, porque a única
 * busca interna (`/blog/busca`) é bloqueada no robots.txt — anunciar uma caixa
 * de busca que o Google não pode rastrear não rende nada.
 */
export function schemaWebSite(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#site`,
    name: "NuvemPark",
    url: SITE_URL,
    inLanguage: "pt-BR",
    publisher: { "@id": `${SITE_URL}/#organizacao` },
  };
}

/**
 * O PRODUTO. É o bloco que responde "o que é isso e quanto custa" — o mais
 * importante da home para uma consulta comercial.
 *
 * Sem `aggregateRating`: nota agregada exige avaliação real e verificável.
 * Inventar uma é motivo de ação manual do Google, além de ser mentira.
 */
export function schemaSoftware(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: "NuvemPark",
    alternateName: "NuvemPark — Sistema para Estacionamento",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Sistema para estacionamento",
    operatingSystem: "Android, Web",
    url: SITE_URL,
    inLanguage: "pt-BR",
    description:
      "Sistema para estacionamento na nuvem: o operador registra entradas, saídas e pagamentos por um aplicativo Android que funciona offline, e o gestor acompanha faturamento, ocupação e caixa em tempo real por um painel web.",
    publisher: { "@id": `${SITE_URL}/#organizacao` },
    featureList: [
      "Operação offline com sincronização automática",
      "Leitura de placa por câmera",
      "Cálculo automático de tarifa por fração, hora, diária e pernoite",
      "Impressão de ticket com QR Code em impressora térmica Bluetooth",
      "Pagamento por Pix no ticket",
      "Caixa por operador com sangria e fechamento conferido",
      "Mensalistas, credenciados e livre passagem",
      "Registro de avaria com foto",
      "Vários pátios consolidados numa conta",
      "Painel web de faturamento e ocupação em tempo real",
    ],
    offers: {
      "@type": "Offer",
      price: PRECO_MENSAL,
      priceCurrency: MOEDA,
      availability: "https://schema.org/InStock",
      url: urlSite("/sistema-para-estacionamento"),
      description:
        "R$ 129,90 por mês, por pátio, com tudo incluso. 15 dias de teste grátis, sem cartão de crédito e sem fidelidade.",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: PRECO_MENSAL,
        priceCurrency: MOEDA,
        // `MON` é o código UN/CEFACT de mês — é o que diz que 129,90 é
        // mensalidade e não preço de venda única.
        unitCode: "MON",
        unitText: "por pátio, por mês",
      },
    },
  };
}

/**
 * A página de solução como entidade própria, amarrada ao produto e ao site.
 *
 * `WebPage` e não `Product`: o que a página descreve é o assunto (o sistema),
 * já modelado uma vez em `schemaSoftware`. Repetir o produto por página criaria
 * várias entidades concorrentes para a mesma coisa.
 */
export function schemaPaginaSolucao(pagina: PaginaSolucao): Schema {
  const url = urlSite(pagina.caminho);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#pagina`,
    url,
    name: pagina.h1,
    description: pagina.descricao,
    inLanguage: "pt-BR",
    isPartOf: { "@id": `${SITE_URL}/#site` },
    about: { "@id": `${SITE_URL}/#software` },
    publisher: { "@id": `${SITE_URL}/#organizacao` },
    primaryImageOfPage: { "@type": "ImageObject", url: urlSite("/og-image.png") },
  };
}

/** A organização, publicada na raiz do site. Reexport para quem só importa daqui. */
export function schemaOrganizacaoSite(): Schema {
  return { "@context": "https://schema.org", ...schemaOrganizacao() };
}
