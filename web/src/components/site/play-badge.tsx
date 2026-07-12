import { Smartphone } from "lucide-react";
import { PLAY_STORE } from "@/lib/app-links";

/**
 * Badge do app Android. Enquanto PLAY_STORE.publicado for false, mostra
 * "em breve na Play Store" (texto neutro). Quando virar true, vira um botão
 * "Baixar na Google Play" clicável — sem tocar em mais nada no site.
 */
export function PlayBadge({ className = "" }: { className?: string }) {
  if (!PLAY_STORE.publicado) {
    return (
      <span
        className={`inline-flex items-center gap-2 text-sm font-semibold text-texto-3 ${className}`}
      >
        <Smartphone className="w-4 h-4" />
        App para Android · em breve na Play Store
      </span>
    );
  }

  return (
    <a
      href={PLAY_STORE.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-2.5 h-12 pl-3.5 pr-5 rounded-xl bg-noite text-white hover:brightness-125 transition-all ${className}`}
      aria-label="Baixar na Google Play"
    >
      <GooglePlayGlyph />
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-semibold text-white/60 uppercase tracking-wider">
          Disponível no
        </span>
        <span className="block text-sm font-bold -mt-0.5">Google Play</span>
      </span>
    </a>
  );
}

/** Triângulo colorido da Google Play (SVG inline, leve). */
function GooglePlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" aria-hidden="true">
      <path d="M3.6 2.1 13.3 12 3.6 21.9c-.4-.2-.6-.6-.6-1.1V3.2c0-.5.2-.9.6-1.1Z" fill="#34D399" />
      <path d="m16.9 8.4 3.1 1.8c.9.5.9 1.8 0 2.3l-3.1 1.8L13.3 12l3.6-3.6Z" fill="#F59E0B" />
      <path d="M3.6 2.1c.3-.1.6-.1.9.1l11.4 6.6-2.6 2.6L3.6 2.1Z" fill="#38BDF8" />
      <path d="m13.3 12 2.6 2.6-11.4 6.6c-.3.2-.6.2-.9.1L13.3 12Z" fill="#EF4444" />
    </svg>
  );
}
