import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
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
        {/* Fontes do redesign, carregadas em runtime pelo navegador (Poppins nos
            componentes migrados; o resto usa a stack sans do sistema). NÃO usar
            next/font/google aqui: ele baixa a fonte em BUILD e, sem rede pro
            Google Fonts na máquina de build, o deploy inteiro quebra. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&family=Geist+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
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
