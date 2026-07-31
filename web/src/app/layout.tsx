import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { SITE_URL } from "@/lib/urls";
import "./globals.css";

export const metadata: Metadata = {
  // Base das URLs relativas de metadata (canonical, Open Graph, imagens
  // geradas por `opengraph-image`). Sem ela, o Next resolve para localhost e
  // as og:image do blog saem quebradas em produção.
  metadataBase: new URL(SITE_URL),
  title: "NuvemPark — Painel do Gestor",
  description: "Gestão de estacionamento na nuvem",
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

            Pré-carregamos os três pesos dominantes de Poppins. O 800 é o mais
            importante: é o do título do hero, o elemento de LCP no celular.
            Sem o preload ele só era descoberto DEPOIS do CSS (HTML → CSS →
            fonte) e chegava aos 2,3 s, trocando o texto já depois do LCP.
            Os pesos 300/500/600 ficam de fora de propósito — juntos são
            8 elementos na página inteira e não pagam o custo de 3 preloads. */}
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
