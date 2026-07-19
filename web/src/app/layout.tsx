import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        {/* Fontes do redesign (aplicadas por componente; o resto do painel segue
            com Geist até a fatia de cada tela ser migrada). */}
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
