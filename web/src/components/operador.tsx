import { UserRound } from "lucide-react";

/**
 * Chip do operador. [acao] diz QUAL operador é — as duas telas mostram gente
 * diferente: o Pátio mostra quem registrou a entrada (o veículo ainda está lá);
 * Movimentos mostra quem VALIDOU a saída, que costuma ser outra pessoa, às vezes
 * de outro turno.
 *
 * Sem nome — ticket ainda aberto, operador removido do cadastro, ou saída antiga
 * de isenção/mensalista, que não deixou rastro — cai num traço discreto, nunca
 * num id cru.
 */
export function Operador({
  nome,
  acao = "entrada",
}: {
  nome?: string;
  acao?: "entrada" | "saída";
}) {
  if (!nome) {
    return (
      <span
        className="text-texto-3"
        title={
          acao === "saída"
            ? "Ainda no pátio, ou saída antiga sem registro de operador"
            : "Operador não identificado"
        }
      >
        —
      </span>
    );
  }

  const inicial = nome.trim().charAt(0).toUpperCase();
  const primeiro = nome.trim().split(/\s+/)[0];

  return (
    <span
      className="inline-flex items-center gap-2 max-w-[140px]"
      title={
        acao === "saída"
          ? `Saída validada por ${nome}`
          : `Entrada registrada por ${nome}`
      }
    >
      <span
        aria-hidden="true"
        className="w-6 h-6 shrink-0 rounded-full bg-brand-50 border border-brand-200 grid place-items-center text-[10px] font-black text-brand-700"
      >
        {inicial || <UserRound className="w-3 h-3" />}
      </span>
      <span className="truncate text-[13px] font-semibold">{primeiro}</span>
    </span>
  );
}
