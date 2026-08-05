/**
 * CSS global da landing (keyframes + responsividade por data-attribute),
 * portado fielmente do <style> do protótipo. Escopado por data-* usados
 * apenas nas seções da home — não afeta o painel.
 */
/**
 * A base que a home compartilha com as páginas de solução: a grade do fundo
 * escuro, as máscaras e o balanceamento de título. Exportada em vez de
 * duplicada — as duas telas usam o mesmo hero escuro.
 */
export const CSS_BASE = `
.np-grid{background-image:linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px);background-size:44px 44px}
.np-grid-mask{-webkit-mask-image:radial-gradient(ellipse 75% 60% at 50% 18%,black 30%,transparent 75%);mask-image:radial-gradient(ellipse 75% 60% at 50% 18%,black 30%,transparent 75%)}
.np-grid-mask-cta{-webkit-mask-image:radial-gradient(ellipse 80% 80% at 50% 30%,black 30%,transparent 80%);mask-image:radial-gradient(ellipse 80% 80% at 50% 30%,black 30%,transparent 80%)}
[data-balance]{text-wrap:balance}

/* Acordeão de FAQ em <details> nativo (home e páginas de solução). O marcador
   próprio do navegador some e fica só o nosso chevron. Estes seletores não têm
   equivalente em estilo inline: são pseudo-elemento e estado. */
.np-faq-sumario::-webkit-details-marker{display:none}
.np-faq-sumario::marker{content:""}
details[open] > .np-faq-sumario svg{transform:rotate(180deg)}
.np-faq-sumario svg{transition:transform .25s}
@media (prefers-reduced-motion:reduce){.np-faq-sumario svg{transition:none}}
`;

const CSS = `
${CSS_BASE}

/* ── Onepage ────────────────────────────────────────────────────────────────
   O header é fixed com 64px de altura. Sem scroll-margin-top a âncora encosta
   o título da seção embaixo dele e some. 84px = 64 do header + respiro. */
[data-sec]{scroll-margin-top:84px}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
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
  [data-num-grid],[data-mock-kpis],[data-valores]{grid-template-columns:repeat(2,1fr)!important}
  [data-contato]{grid-template-columns:1fr!important}
  [data-footer]{grid-template-columns:1fr 1fr!important;gap:32px!important}
  [data-flip] > [data-flip-media]{order:2}
}
@media (max-width:560px){
  [data-num-grid],[data-mock-kpis]{grid-template-columns:1fr 1fr!important}
  [data-valores]{grid-template-columns:1fr!important}
  [data-footer]{grid-template-columns:1fr!important}
}
`;

export function LandingStyle() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
