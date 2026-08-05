import type { Metadata } from "next";
import { JsonLd } from "@/components/jsonld";
import { PaginaSolucaoView } from "@/components/solucoes/pagina-solucao";
import { schemaFaq, schemaMigalhas } from "@/lib/blog-seo";
import { schemaPaginaSolucao } from "@/lib/site-seo";
import { type PaginaSolucao } from "@/lib/solucoes";
import { urlSite } from "@/lib/urls";

/**
 * Cola entre o dado (`lib/solucoes.ts`) e a rota. Cada `page.tsx` do silo vira
 * três linhas — o que mantém o conteúdo num arquivo só e impede que uma página
 * nova esqueça o canonical ou o dado estruturado.
 */

export function metadataDaSolucao(pagina: PaginaSolucao): Metadata {
  const url = urlSite(pagina.caminho);
  return {
    title: pagina.titulo,
    description: pagina.descricao,
    // Canonical explícito: sem ele, um link com `?utm_source=` ou uma barra a
    // mais vira uma segunda URL com o mesmo conteúdo aos olhos do Google.
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "NuvemPark",
      url,
      title: pagina.titulo,
      description: pagina.descricao,
    },
  };
}

export function SolucaoRota({ pagina }: { pagina: PaginaSolucao }) {
  // O FAQ estruturado usa exatamente o texto do acordeão visível. Dado
  // estruturado que não corresponde ao conteúdo da página é motivo de ação
  // manual do Google — por isso os dois saem da mesma fonte.
  const faq = schemaFaq(pagina.faq);

  return (
    <>
      <PaginaSolucaoView pagina={pagina} />
      <JsonLd dados={schemaPaginaSolucao(pagina)} />
      <JsonLd
        dados={schemaMigalhas([
          ...pagina.migalhas,
          { nome: pagina.h1, caminho: pagina.caminho },
        ])}
      />
      {faq ? <JsonLd dados={faq} /> : null}
    </>
  );
}
