"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, ScanLine, Clock, Check } from "lucide-react";
import {
  buscarTickets,
  resolverCodigo,
  type ResultadoBusca,
} from "@/app/parceiro/actions";
import { Botao } from "@/components/ui/botao";
import { Input } from "@/components/ui/campos";

const hora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** "há 1h20" — o balconista pensa em tempo decorrido, não em horário. */
function decorrido(desde: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 60000));
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `há ${h}h` : `há ${h}h${String(m).padStart(2, "0")}`;
}

export function BuscaParceiro({ codigoInicial }: { codigoInicial?: string }) {
  const acao = codigoInicial ? resolverCodigo : buscarTickets;
  const [estado, agir, pendente] = useActionState<ResultadoBusca, FormData>(
    acao,
    null,
  );
  const [placa, setPlaca] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const jaEnviou = useRef(false);

  // Chegou pelo scanner: resolve o código sozinho, sem o balconista tocar em
  // mais nada. Ele acabou de apontar a câmera — pedir um clique agora seria
  // pedir duas vezes a mesma coisa.
  useEffect(() => {
    if (codigoInicial && !jaEnviou.current) {
      jaEnviou.current = true;
      formRef.current?.requestSubmit();
    }
  }, [codigoInicial]);

  const tickets = estado?.ok ? estado.tickets : [];

  return (
    <div className="space-y-4">
      <form ref={formRef} action={agir} className="flex gap-2">
        {codigoInicial ? (
          <input type="hidden" name="codigo" value={codigoInicial} />
        ) : (
          <Input
            name="placa"
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="Placa ou os 4 últimos"
            autoComplete="off"
            autoCapitalize="characters"
            className="flex-1"
            aria-label="Placa do veículo"
          />
        )}
        {!codigoInicial && (
          <Botao carregando={pendente}>
            <Search className="w-4 h-4" /> Buscar
          </Botao>
        )}
      </form>

      {!codigoInicial && (
        <Link
          href="/parceiro/scan"
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-borda py-3 text-sm font-bold text-texto-2 hover:border-brand-300 hover:text-brand-700"
        >
          <ScanLine className="w-4 h-4" /> Ler o QR do cupom
        </Link>
      )}

      {estado && !estado.ok && (
        <p
          role="alert"
          className="rounded-xl bg-perigo/10 border border-perigo/30 px-3 py-2 text-sm font-semibold text-perigo"
        >
          {estado.msg}
        </p>
      )}

      {estado?.ok && tickets.length === 0 && (
        <p className="text-sm text-texto-2 text-center py-6">
          Nenhum veículo no pátio com essa placa.
        </p>
      )}

      <ul className="space-y-2">
        {tickets.map((t) => (
          <li key={t.ticket_id}>
            <Link
              href={`/parceiro/ticket/${encodeURIComponent(t.ticket_id)}`}
              className={`flex items-center gap-3 rounded-2xl border bg-superficie p-4 transition-colors ${
                t.ja_liberado
                  ? "border-borda opacity-70"
                  : "border-borda hover:border-brand-300"
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-extrabold text-lg text-texto tracking-wide">
                  {t.placa}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-texto-2">
                  <Clock className="w-3.5 h-3.5" />
                  entrou {hora.format(new Date(t.entrada))} ·{" "}
                  {decorrido(t.entrada)}
                </span>
              </span>
              {t.ja_liberado && (
                <span className="flex items-center gap-1 text-xs font-bold text-brand-700">
                  <Check className="w-3.5 h-3.5" /> liberado
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
