import { UserRound } from "lucide-react";

/**
 * Operador que registrou a ENTRADA do veículo — é o único que o ticket guarda
 * (`tickets.operador_id`, gravado no registro). O fechamento não carimba quem
 * deu a saída, então não há como mostrar isso hoje.
 *
 * Sem nome (operador removido do cadastro, ou ticket antigo sem o campo) cai num
 * traço discreto, não num id cru.
 */
export function Operador({ nome }: { nome?: string }) {
  if (!nome) {
    return (
      <span className="text-texto-3" title="Operador não identificado">
        —
      </span>
    );
  }

  const inicial = nome.trim().charAt(0).toUpperCase();
  const primeiro = nome.trim().split(/\s+/)[0];

  return (
    <span
      className="inline-flex items-center gap-2 max-w-[140px]"
      title={`Entrada registrada por ${nome}`}
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
