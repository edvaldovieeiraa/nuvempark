import { CSS_BASE } from "@/components/site/landing-style";

/**
 * CSS das páginas de solução. Mesma estratégia da landing: um `<style>` inline,
 * sem requisição extra, sem bloquear a pintura (ver PERFORMANCE.md).
 *
 * O grosso vem do `CSS_BASE` compartilhado com a home (grade do hero escuro,
 * balanceamento de título e o acordeão de FAQ). Aqui fica só o que é próprio
 * destas páginas.
 */
const CSS = `
${CSS_BASE}

@media (max-width:900px){
  [data-solucoes-grid]{grid-template-columns:1fr!important}
}
`;

export function SolucaoStyle() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
