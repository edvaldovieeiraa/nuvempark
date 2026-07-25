import type { BlogFaqItem, BlogPost, BlogPostResumo } from "@/lib/blog";
import { SITE_URL, urlSite } from "@/lib/urls";

/**
 * Construtores de JSON-LD do blog (schema.org). Funções puras: montam o objeto,
 * quem renderiza é <JsonLd />.
 *
 * Cada página do blog publica no máximo três blocos:
 *   post      -> Article + BreadcrumbList + FAQPage (quando há FAQ)
 *   home      -> Blog + Organization
 *   categoria -> CollectionPage + BreadcrumbList
 */

type Schema = Record<string, unknown>;

export const NOME_MARCA = "NuvemPark";

/** A organização por trás do conteúdo — vira o `publisher` dos artigos. */
export function schemaOrganizacao(): Schema {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organizacao`,
    name: NOME_MARCA,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: urlSite("/icon.png"),
    },
    description:
      "Sistema de gestão de estacionamento na nuvem: leitura de placa pelo celular, controle de caixa e faturamento em tempo real.",
    areaServed: "BR",
  };
}

export function schemaOrganizacaoRaiz(): Schema {
  return { "@context": "https://schema.org", ...schemaOrganizacao() };
}

/** URL absoluta da imagem social do post (a OG dinâmica, quando não há capa). */
export function imagemSocialDoPost(post: BlogPostResumo): string {
  return post.capa_url ?? urlSite(`/blog/${post.slug}/opengraph-image`);
}

export function schemaArtigo(post: BlogPost): Schema {
  const url = urlSite(`/blog/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#artigo`,
    headline: post.titulo.slice(0, 110), // limite recomendado pelo Google
    description: post.resumo,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "pt-BR",
    datePublished: post.publicado_em,
    dateModified: post.atualizado_em,
    image: [imagemSocialDoPost(post)],
    author: {
      "@type": "Organization",
      name: post.autor?.nome ?? NOME_MARCA,
      url: SITE_URL,
    },
    publisher: schemaOrganizacao(),
    ...(post.categoria ? { articleSection: post.categoria.nome } : {}),
    ...(post.palavras_chave.length > 0
      ? { keywords: post.palavras_chave.join(", ") }
      : {}),
    wordCount: post.conteudo_md.trim().split(/\s+/).filter(Boolean).length,
  };
}

export function schemaMigalhas(
  itens: { nome: string; caminho: string }[],
): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.nome,
      item: urlSite(item.caminho),
    })),
  };
}

export function schemaFaq(itens: BlogFaqItem[]): Schema | null {
  if (itens.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: itens.map((item) => ({
      "@type": "Question",
      name: item.pergunta,
      acceptedAnswer: { "@type": "Answer", text: item.resposta },
    })),
  };
}

export function schemaBlog(posts: BlogPostResumo[]): Schema {
  const url = urlSite("/blog");
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${url}#blog`,
    name: `Blog ${NOME_MARCA}`,
    description:
      "Conteúdo prático sobre gestão de estacionamento, tecnologia de pátio e controle financeiro.",
    url,
    inLanguage: "pt-BR",
    publisher: schemaOrganizacao(),
    blogPost: posts.slice(0, 12).map((post) => ({
      "@type": "BlogPosting",
      headline: post.titulo.slice(0, 110),
      description: post.resumo,
      url: urlSite(`/blog/${post.slug}`),
      datePublished: post.publicado_em,
      dateModified: post.atualizado_em,
      image: imagemSocialDoPost(post),
      author: {
        "@type": "Organization",
        name: post.autor?.nome ?? NOME_MARCA,
      },
    })),
  };
}

export function schemaColecao(opcoes: {
  nome: string;
  descricao: string;
  caminho: string;
  posts: BlogPostResumo[];
}): Schema {
  const url = urlSite(opcoes.caminho);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#colecao`,
    name: opcoes.nome,
    description: opcoes.descricao,
    url,
    inLanguage: "pt-BR",
    isPartOf: { "@type": "Blog", "@id": `${urlSite("/blog")}#blog` },
    publisher: schemaOrganizacao(),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: opcoes.posts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: urlSite(`/blog/${post.slug}`),
        name: post.titulo,
      })),
    },
  };
}
