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
 *
 * CARREGAMENTO ADIADO (`lazyOnload`): o gtag.js são 159 KiB, dos quais 67 KiB
 * nem chegam a ser usados — com `afterInteractive` isso disputava a linha
 * principal justamente na janela que o PageSpeed mede (relatório de
 * 31/07/2026). Agora ele sobe quando o navegador fica ocioso, depois do
 * onload. O custo consciente dessa escolha: visitas que fecham a página em
 * menos de ~2 s podem não ser contabilizadas.
 */
const GA_ID = "G-NXZF864QZS";

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="lazyOnload"
      />
      <Script id="ga4-init" strategy="lazyOnload">
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
