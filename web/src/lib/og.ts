/**
 * Imagem social padrão do site (preview de link no WhatsApp, LinkedIn, X…).
 *
 * O arquivo é `public/og-image.png`, gerado a partir de `scripts/og-image.html`
 * — o cabeçalho daquele arquivo explica como regerar e por que ele é um PNG
 * estático em vez de `ImageResponse`.
 *
 * Por que isto é uma constante compartilhada e não só um literal no layout: o
 * Next NÃO mescla a chave `openGraph` entre layout e página — quem declara a
 * sua substitui a do pai INTEIRA. Toda página que precisa de um `openGraph`
 * próprio (as listagens do blog, por exemplo) tem de repetir a imagem, senão
 * cai fora do padrão e volta a compartilhar sem miniatura.
 *
 * Os posts do blog são a exceção proposital: têm imagem por post
 * (`imagemSocialDoPost`, em `lib/blog-seo.ts`).
 *
 * A URL fica relativa de propósito. O `metadataBase` do layout raiz a
 * transforma em absoluta (https://nuvempark.com/og-image.png) — que é o que os
 * crawlers exigem —, e assim o host continua saindo de um lugar só.
 */
export const IMAGEM_SOCIAL = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "NuvemPark — gestão de estacionamento na nuvem",
} as const;
