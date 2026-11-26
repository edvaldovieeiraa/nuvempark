"use client";

import { useEffect } from "react";
import {
  COOKIE_ORIGEM,
  ORIGEM_DIAS,
  dominioDoCookie,
  extrairOrigem,
  lerOrigem,
  serializarOrigem,
} from "@/lib/crm/origem";

/**
 * Grava `np_origem` (primeiro toque: UTM + página de entrada) no navegador.
 *
 * Por que no navegador: o HTML do site sai do cache da Cloudflare (SEO.md
 * §9.2), então um `Set-Cookie` do servidor não chegaria a quem recebe a cópia
 * da borda. E por isso também nada de `cookies()` aqui nem no layout — isso
 * deixaria o site dinâmico e quebraria o cache de 1 h.
 *
 * Desempenho: não renderiza nada, roda uma vez num `useEffect` depois da
 * hidratação, sem `useSearchParams` (que forçaria bailout para o cliente no
 * layout estático). Custo desprezível para LCP/INP/CLS.
 *
 * Só grava se ainda não há um `np_origem` legível — a segunda visita não
 * sobrescreve o primeiro toque. Um cookie ilegível (adulterado/truncado) é
 * substituído, senão travaria a atribuição por 90 dias.
 *
 * Sem banner de consentimento: o site não tem mecanismo de consentimento e o
 * cookie não guarda dado pessoal (premissa 3 da spec).
 */

// Expressões literais: o Next só embute `NEXT_PUBLIC_*` assim.
const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST;
const SITE_HOST = process.env.NEXT_PUBLIC_SITE_HOST;

function cookieAtual(): string | undefined {
  const prefixo = COOKIE_ORIGEM + "=";
  for (const parte of document.cookie.split(";")) {
    const p = parte.trim();
    if (p.startsWith(prefixo)) return p.slice(prefixo.length);
  }
  return undefined;
}

export function OrigemPrimeiroToque() {
  useEffect(() => {
    try {
      if (lerOrigem(cookieAtual())) return;

      const origem = extrairOrigem(window.location.href);
      if (!origem) return;
      const valor = serializarOrigem(origem);
      if (!valor) return;

      const partes = [
        `${COOKIE_ORIGEM}=${valor}`,
        `Max-Age=${ORIGEM_DIAS * 24 * 60 * 60}`,
        "Path=/",
        "SameSite=Lax",
      ];
      const dominio = dominioDoCookie(APP_HOST, SITE_HOST, window.location.hostname);
      if (dominio) partes.push(`Domain=${dominio}`);
      if (window.location.protocol === "https:") partes.push("Secure");

      document.cookie = partes.join("; ");
    } catch {
      // Atribuição é acessório: nunca pode quebrar a página.
    }
  }, []);

  return null;
}
