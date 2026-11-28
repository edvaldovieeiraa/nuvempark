"use client";

import { useSyncExternalStore } from "react";

/**
 * Arrastar card só existe no kanban de desktop com mouse (spec, req. 1):
 * a partir de 1024 px (onde as colunas aparecem) e com ponteiro fino. Pelo
 * ponteiro, não pela largura: um tablet grande de toque continua com o ⋮.
 * No servidor é `false`, e o card nasce sem arrastar.
 */
const CONSULTA = "(min-width: 1024px) and (pointer: fine)";

function inscrever(aviso: () => void) {
  const mq = window.matchMedia(CONSULTA);
  mq.addEventListener("change", aviso);
  return () => mq.removeEventListener("change", aviso);
}

export function useArrastoMouse(): boolean {
  return useSyncExternalStore(
    inscrever,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}
