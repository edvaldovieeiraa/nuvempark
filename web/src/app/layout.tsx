import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { IMAGEM_SOCIAL } from "@/lib/og";
import { SITE_URL } from "@/lib/urls";
import "./globals.css";

export const metadata: Metadata = {
  // Base das URLs relativas de metadata (canonical, Open Graph, imagens
  // geradas por `opengraph-image`). Sem ela, o Next resolve para localhost e
  // as og:image do blog saem quebradas em produção.
  metadataBase: new URL(SITE_URL),
  title: "NuvemPark — Painel do Gestor",
  description:
    "Sistema de gestão de estacionamento na nuvem: seus operadores registram cada carro pelo celular, mesmo sem internet, e você acompanha o caixa ao vivo.",

  // ── Preview de link (Open Graph / Twitter Card) ────────────────────────────
  // Base HERDADA por todas as páginas. O Next preenche `og:title`/`og:description`
  // com o title/description de CADA página quando elas não declaram os seus
  // (`inheritFromMetadata`, em next/dist/lib/metadata/resolve-metadata.js) — por
  // isso não fixamos título aqui: fixar faria `/precos` anunciar o texto da home.
  //
  // O bloco só vale para quem NÃO declara `openGraph` próprio: a chave é
  // substituída inteira, não mesclada. O blog declara o seu (com a imagem por
  // post) e continua intacto.
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "NuvemPark",
    // `'./'` é resolvido contra o pathname da requisição (`resolveRelativeUrl`),
    // então cada rota anuncia a SUA própria URL absoluta. Um valor fixo aqui
    // faria toda página do site dizer que é a home.
    url: "./",
    images: [IMAGEM_SOCIAL],
  },
  // `title`, `description` e `images` são copiados do openGraph acima pelo
  // `postProcessMetadata` do Next. Só o formato do cartão precisa ser dito.
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        {/* Fontes: os @font-face vivem em globals.css e apontam para
            /fonts/*.woff2 no NOSSO domínio. O <link> para fonts.googleapis.com
            que ficava aqui bloqueava a renderização por 750 ms no celular.
            (Também não usamos next/font: ele baixa a fonte em BUILD, e o build
            roda no VPS — uma indisponibilidade do Google derrubaria o deploy.)

            Pré-carregamos TODOS os pesos que aparecem acima da dobra. Cada um
            que fica de fora é descoberto só depois do CSS (HTML → CSS → fonte),
            chega com a página já pintada e troca o texto no lugar — foi assim
            que o CLS no celular subiu de 0 para 0,09 conforme o site ficou mais
            rápido: quanto antes pinta, mais visível fica a troca tardia.
            300 = a marca "Nuvem" no cabeçalho · 400 = corpo · 600 = botões do
            cabeçalho · 700 = CTAs · 800 = título do hero (elemento de LCP).
            Só o 500 fica de fora, com `optional` no globals.css: é um único
            elemento, abaixo da dobra. */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/Poppins-300.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/Poppins-400.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/Poppins-600.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/Poppins-700.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/Poppins-800.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {/* Filtro de refração do Liquid Glass (usado por .gnav.liquid). */}
        <svg
          aria-hidden
          style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
        >
          <filter
            id="liquidGlass"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.006 0.008"
              numOctaves={2}
              seed={7}
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation={1.2} result="noiseBlur" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noiseBlur"
              scale={90}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
