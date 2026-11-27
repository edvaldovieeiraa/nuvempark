import { Flame, Snowflake, Thermometer, type LucideIcon } from "lucide-react";
import { ROTULO_TEMPERATURA } from "@/lib/crm/temperatura";
import type { Temperatura } from "@/lib/crm/tipos";

/**
 * Cor, ícone e nome de cada temperatura (design, revisão 1, item 3). As três
 * se distinguem também pelo preenchimento: cheio, contorno e claro.
 */
export const VISUAL_TEMPERATURA: Record<Temperatura, { Icone: LucideIcon; selo: string; texto: string; borda: string }> = {
  quente: {
    Icone: Flame,
    selo: "bg-temp-quente-fundo text-temp-quente-texto border-temp-quente-fundo",
    texto: "text-temp-quente-fundo",
    borda: "border-temp-quente-fundo",
  },
  morno: {
    Icone: Thermometer,
    selo: "bg-superficie text-temp-morno-texto border-temp-morno-borda",
    texto: "text-temp-morno-texto",
    borda: "border-temp-morno-texto",
  },
  frio: {
    Icone: Snowflake,
    selo: "bg-temp-frio-fundo text-temp-frio-texto border-temp-frio-borda",
    texto: "text-temp-frio-texto",
    borda: "border-temp-frio-texto",
  },
};

/** Selo do card, da lista e do painel em modo leitura. Sem temperatura, nada. */
export function SeloTemperatura({ temperatura }: { temperatura: Temperatura | null }) {
  if (!temperatura) return null;
  const { Icone, selo } = VISUAL_TEMPERATURA[temperatura];
  return (
    <span
      className={`inline-flex items-center gap-1 h-[22px] pl-1.5 pr-2 rounded-full border text-[11px] font-bold whitespace-nowrap ${selo}`}
    >
      <Icone className="w-3 h-3 shrink-0" strokeWidth={2.4} aria-hidden />
      <span className="sr-only">Temperatura: </span>
      {ROTULO_TEMPERATURA[temperatura]}
    </span>
  );
}
