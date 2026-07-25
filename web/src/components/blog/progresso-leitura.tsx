"use client";

import { useEffect, useState } from "react";

/**
 * Barra de progresso da leitura, fixa no topo.
 *
 * Só mede o scroll (nenhum layout é lido de dentro do artigo) e agenda a
 * atualização num rAF, então o listener não força reflow a cada evento.
 * `aria-hidden`: é decoração — o leitor de tela não ganha nada com ela.
 */
export function ProgressoLeitura() {
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    let frame = 0;

    const medir = () => {
      frame = 0;
      const doc = document.documentElement;
      const rolavel = doc.scrollHeight - doc.clientHeight;
      setProgresso(rolavel <= 0 ? 0 : Math.min(1, doc.scrollTop / rolavel));
    };

    const agendar = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] bg-transparent"
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-brand-500 to-brand-700"
        style={{ transform: `scaleX(${progresso})` }}
      />
    </div>
  );
}
