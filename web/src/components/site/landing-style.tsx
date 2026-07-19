/**
 * CSS global da landing (keyframes + responsividade por data-attribute),
 * portado fielmente do <style> do protótipo. Escopado por data-* usados
 * apenas nas seções da home — não afeta o painel.
 */
const CSS = `
.np-grid{background-image:linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px);background-size:44px 44px}
.np-grid-mask{-webkit-mask-image:radial-gradient(ellipse 75% 60% at 50% 18%,black 30%,transparent 75%);mask-image:radial-gradient(ellipse 75% 60% at 50% 18%,black 30%,transparent 75%)}
.np-grid-mask-cta{-webkit-mask-image:radial-gradient(ellipse 80% 80% at 50% 30%,black 30%,transparent 80%);mask-image:radial-gradient(ellipse 80% 80% at 50% 30%,black 30%,transparent 80%)}
[data-balance]{text-wrap:balance}
@keyframes np-pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes np-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
@keyframes np-scan{0%{left:-12%;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:100%;opacity:0}}
@media (prefers-reduced-motion: reduce){[data-np-anim]{animation:none!important}}
@media (max-width:900px){
  [data-sec]{padding-top:64px!important;padding-bottom:64px!important}
  [data-hero-chip],[data-hero-phone]{display:none!important}
  [data-spot],[data-pix],[data-avaria],[data-prova-feat],[data-roadmap],[data-precos-a],[data-mock-lower],[data-steps],[data-garantias],[data-prova-grid]{grid-template-columns:1fr!important;gap:36px!important}
  [data-steps],[data-garantias],[data-prova-grid]{gap:16px!important}
  [data-bento]{grid-template-columns:1fr!important}
  [data-bento] > [data-bento-wide]{grid-column:auto!important}
  [data-num-grid],[data-mock-kpis]{grid-template-columns:repeat(2,1fr)!important}
  [data-footer]{grid-template-columns:1fr 1fr!important;gap:32px!important}
  [data-flip] > [data-flip-media]{order:2}
}
@media (max-width:560px){
  [data-num-grid],[data-mock-kpis]{grid-template-columns:1fr 1fr!important}
  [data-footer]{grid-template-columns:1fr!important}
}
`;

export function LandingStyle() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
