"use client";

import { useState } from "react";
import { Check, Link2, MessageCircle } from "lucide-react";

/**
 * Compartilhamento do post. Sem SDK de rede social: são links `share` normais
 * (nenhum script de terceiro, nenhum rastreador) mais um botão de copiar.
 * O WhatsApp vem primeiro — é de longe o canal do público brasileiro.
 */

/* O lucide-react 1.x não traz mais ícones de marca (Linkedin, X): vêm inline. */

function IconeLinkedIn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13M7.12 20.45H3.55V9h3.57zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0" />
    </svg>
  );
}

function IconeX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const BOTAO =
  "inline-flex h-10 items-center gap-2 rounded-xl border border-borda bg-superficie px-3.5 text-[13px] font-bold text-texto-2 transition-all hover:border-brand-300 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none";

export function Compartilhar({
  url,
  titulo,
}: {
  url: string;
  titulo: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(titulo);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard bloqueado (contexto não-seguro / permissão negada): o usuário
      // ainda tem a URL na barra de endereços. Falhar em silêncio é melhor do
      // que um alerta que ninguém pediu.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[13px] font-bold text-texto-3">Compartilhar:</span>

      <a
        href={`https://wa.me/?text=${t}%20${u}`}
        target="_blank"
        rel="noopener noreferrer"
        className={BOTAO}
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        WhatsApp
      </a>

      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`}
        target="_blank"
        rel="noopener noreferrer"
        className={BOTAO}
      >
        <IconeLinkedIn className="h-3.5 w-3.5" />
        LinkedIn
      </a>

      <a
        href={`https://x.com/intent/tweet?text=${t}&url=${u}`}
        target="_blank"
        rel="noopener noreferrer"
        className={BOTAO}
        aria-label="Compartilhar no X"
      >
        <IconeX className="h-3.5 w-3.5" />X
      </a>

      <button type="button" onClick={copiar} className={BOTAO}>
        {copiado ? (
          <>
            <Check className="h-4 w-4 text-brand-600" aria-hidden />
            Copiado!
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" aria-hidden />
            Copiar link
          </>
        )}
      </button>

      {/* Confirmação anunciada para leitores de tela. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copiado ? "Link copiado para a área de transferência" : ""}
      </span>
    </div>
  );
}
