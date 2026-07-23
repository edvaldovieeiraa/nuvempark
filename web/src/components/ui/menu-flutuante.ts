import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Posicionamento de menu suspenso em `position: fixed`, ancorado num botão.
 *
 * Motivo: dentro de containers com `overflow` (ex.: ResponsiveTable, que usa
 * `overflow-x:auto` — e aí o `overflow-y` também recorta), um dropdown com
 * `position:absolute` é cortado pela borda do container. `fixed` + coordenadas
 * do `getBoundingClientRect()` do botão fazem o menu escapar de todos eles.
 */
export type MenuPos = {
  /** Distância da borda direita da viewport (alinha o menu à direita do botão). */
  right: number;
  /** Ancora pelo topo (abre para baixo) — px do topo da viewport, ou null. */
  top: number | null;
  /** Ancora pela base (abre para cima) — px da base da viewport, ou null. */
  bottom: number | null;
};

/** Calcula a posição a partir do botão. Chamar em handler (não no render). */
export function calcularPosMenu(btn: HTMLElement | null): MenuPos | null {
  if (!btn) return null;
  const r = btn.getBoundingClientRect();
  const right = Math.max(8, window.innerWidth - r.right);
  const espacoAbaixo = window.innerHeight - r.bottom;
  const abrirCima = espacoAbaixo < 280; // menu ~ até 280px de altura
  return {
    right,
    top: abrirCima ? null : r.bottom + 6,
    bottom: abrirCima ? window.innerHeight - r.top + 6 : null,
  };
}

/** Converte a posição em estilo inline para o menu fixo. */
export function estiloMenu(pos: MenuPos): CSSProperties {
  return {
    right: pos.right,
    ...(pos.top != null ? { top: pos.top } : {}),
    ...(pos.bottom != null ? { bottom: pos.bottom } : {}),
  };
}

/**
 * Fecha o menu quando a página rola ou a janela redimensiona — um menu fixo não
 * acompanha o botão, então a alternativa correta é dispensá-lo.
 */
export function useFecharAoRolar(aberto: boolean, fechar: () => void): void {
  const fecharRef = useRef(fechar);
  useEffect(() => {
    fecharRef.current = fechar;
  });
  useEffect(() => {
    if (!aberto) return;
    const h = () => fecharRef.current();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => {
      window.removeEventListener("scroll", h, true);
      window.removeEventListener("resize", h);
    };
  }, [aberto]);
}
