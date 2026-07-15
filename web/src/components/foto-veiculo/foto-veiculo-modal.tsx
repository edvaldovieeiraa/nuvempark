"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, AlertTriangle, Loader2 } from "lucide-react";

import { Marca } from "@/components/marca";
import { formatarDataHora } from "@/lib/format-data";
import { detalheTicket, type DetalheTicket } from "./actions";

/** O mínimo que o modal precisa saber do ticket. */
export type TicketFoto = {
  id: string;
  placa: string;
  tipo_veiculo: string;
  entrada: string;
  foto_entrada_path: string | null;
};

/**
 * Visualização da foto de entrada (e das avarias) de um ticket. Compartilhado
 * por Movimentos e Pátio — o modal busca o próprio detalhe, então as duas
 * telas só precisam dizer QUAL ticket abrir.
 *
 * Ticket sem foto abre normalmente, no estado "Sem foto de entrada" (as
 * avarias, se houver, continuam visíveis).
 */
export function FotoVeiculoModal({
  ticket,
  fechar,
}: {
  ticket: TicketFoto;
  fechar: () => void;
}) {
  const [dados, setDados] = useState<DetalheTicket | null>(null);
  const [carregando, setCarregando] = useState(true);

  // O modal é montado por ticket (as telas passam `key={ticket.id}`), então o
  // estado inicial já é "carregando" — nada de setState síncrono aqui.
  useEffect(() => {
    let ativo = true;
    detalheTicket(ticket.id, ticket.foto_entrada_path)
      .then((d) => {
        if (ativo) setDados(d);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [ticket.id, ticket.foto_entrada_path]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") fechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [fechar]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
      onClick={fechar}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Foto de entrada do veículo ${ticket.placa}`}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6 max-h-[85dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-extrabold tracking-widest">
              {ticket.placa}
            </h3>
            <p className="text-xs text-texto-2 capitalize">
              {ticket.tipo_veiculo} · entrada {formatarDataHora(ticket.entrada)}
            </p>
          </div>
          <button
            onClick={fechar}
            aria-label="Fechar"
            className="toque-44 text-texto-3 hover:text-texto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {carregando ? (
          <div className="py-16 grid place-items-center text-texto-3">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Foto de entrada */}
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-texto-3 mb-2">
                Foto da entrada
              </p>
              {dados?.fotoEntrada ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dados.fotoEntrada}
                  alt={`Entrada ${ticket.placa}`}
                  className="w-full rounded-xl border border-borda"
                />
              ) : (
                // Mesma linguagem da miniatura: a marca em esmeralda suave, não
                // um ícone cinza de sistema legado.
                <div className="rounded-xl border border-dashed border-brand-200 bg-gradient-to-br from-brand-50 to-superficie py-10 grid place-items-center gap-2 text-sm text-texto-2">
                  <span className="w-12 h-12 rounded-2xl bg-superficie border border-brand-200 grid place-items-center shadow-[var(--shadow-card)]">
                    <Marca className="w-6 h-6" corNuvem="#059669" corP="#ECFDF5" />
                  </span>
                  Sem foto de entrada
                </div>
              )}
            </div>

            {/* Avarias */}
            {(dados?.avarias.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-saida mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Avarias registradas ({dados!.avarias.length})
                </p>
                <div className="space-y-3">
                  {dados!.avarias.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-saida/20 bg-saida-bg/40 p-3"
                    >
                      <p className="text-sm font-semibold text-texto">
                        {a.descricao}
                      </p>
                      {a.fotos.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {a.fotos.map((f, i) => (
                            <a
                              key={i}
                              href={f}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={f}
                                alt={`Avaria ${i + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border border-borda hover:brightness-95"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
