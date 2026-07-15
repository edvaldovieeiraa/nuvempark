"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ParkingSquare } from "lucide-react";

import { FotoVeiculoModal } from "@/components/foto-veiculo/foto-veiculo-modal";
import { FotoVeiculoThumb } from "@/components/foto-veiculo/foto-veiculo-thumb";
import { Operador } from "@/components/operador";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { formatarDataHora } from "@/lib/format-data";

type Veiculo = {
  id: string;
  placa: string;
  tipo_veiculo: string;
  entrada: string;
  origem: string;
  foto_entrada_path: string | null;
  /** Quem registrou a entrada. */
  operador_id: string | null;
};

/**
 * Lista dos veículos no pátio. Clicar na linha (ou na miniatura) abre a foto de
 * entrada no mesmo modal que Movimentos usa. Veículo sem foto abre igual, no
 * estado "Sem foto de entrada" — o comportamento é o mesmo nas duas telas.
 */
export function PatioLista({
  veiculos,
  fotos,
  operadores,
}: {
  veiculos: Veiculo[];
  /** ticket.id → URL assinada da foto de entrada (assinadas em lote). */
  fotos: Record<string, string>;
  /** operador_id → nome (join manual: a tabela não tem FK). */
  operadores: Record<string, string>;
}) {
  const [detalhe, setDetalhe] = useState<Veiculo | null>(null);

  if (veiculos.length === 0) {
    return (
      <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
          <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
            <ParkingSquare className="w-6 h-6 text-brand-600" />
          </span>
          <p className="text-sm text-texto-3">Nenhum veículo no pátio agora.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <ResponsiveTable>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                <th className="pl-5 pr-2 py-3 font-bold">
                  <span className="sr-only">Foto</span>
                </th>
                <th className="px-5 py-3 font-bold">Placa</th>
                <th className="px-5 py-3 font-bold">Tipo</th>
                <th className="px-5 py-3 font-bold hidden md:table-cell">
                  Entrada
                </th>
                <th className="px-5 py-3 font-bold hidden md:table-cell">
                  Operador
                </th>
                <th className="px-5 py-3 font-bold">Permanência</th>
              </tr>
            </thead>
            <tbody>
              {veiculos.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setDetalhe(t)}
                  className="border-t border-borda hover:bg-brand-50/40 transition-colors cursor-pointer"
                >
                  <td className="pl-5 pr-2 py-3 w-[52px]">
                    <FotoVeiculoThumb
                      url={fotos[t.id]}
                      placa={t.placa}
                      aoClicar={() => setDetalhe(t)}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-black tracking-widest text-[13px] bg-fundo border border-borda rounded-md px-2 py-1">
                      {t.placa}
                    </span>
                    {t.origem === "plano" && (
                      <span className="ml-2 text-[10px] font-bold text-info bg-info-bg rounded-full px-2 py-0.5">
                        mensalista
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-texto-2 capitalize">
                    {t.tipo_veiculo}
                  </td>
                  <td className="px-5 py-3 text-texto-2 tabular-nums whitespace-nowrap hidden md:table-cell">
                    {formatarDataHora(t.entrada)}
                  </td>
                  <td className="px-5 py-3 text-texto-2 hidden md:table-cell">
                    <Operador nome={operadores[t.operador_id ?? ""]} />
                  </td>
                  <td className="px-5 py-3 font-bold tabular-nums">
                    {permanencia(t.entrada)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      </section>

      <AnimatePresence>
        {detalhe && (
          <FotoVeiculoModal
            key={detalhe.id}
            ticket={detalhe}
            fechar={() => setDetalhe(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function permanencia(entrada: string) {
  const min = Math.max(
    0,
    Math.round((Date.now() - new Date(entrada).getTime()) / 60000),
  );
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h${String(min % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
