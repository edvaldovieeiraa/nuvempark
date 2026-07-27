import Script from "next/script";

/**
 * Google Analytics 4 (gtag.js).
 *
 * Incluído SOMENTE nas páginas públicas de marketing (site + blog + cadastro).
 * Não adicionar no /painel nem no /master — área logada do cliente não é
 * tráfego de marketing e não deve ser enviada ao GA.
 *
 * O measurement ID é público por natureza (aparece em qualquer página que o
 * carrega), então fica hardcoded para não depender de env no build do VPS.
 */
const GA_ID = "G-NXZF864QZS";

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
