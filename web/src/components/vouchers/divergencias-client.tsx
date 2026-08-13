"use client";

import { useActionState, useEffect } from "react";
import { AlertTriangle, CircleCheck, XCircle } from "lucide-react";
import {
  cancelarDivergencia,
  type Resultado,
} from "@/app/painel/vouchers/divergencias/actions";
import { useToast } from "@/components/ui/toast";

export type Linha = {
  id: string;
  ticketId: string;
  liberadoEm: string;
  parceiro: string;
  regra: string;
  placa: string;
  saida: string | null;
  valorCobrado: number | null;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function DivergenciasClient({
  linhas,
  patioNome,
}: {
  linhas: Linha[];
  patioNome: string;
}) {
  return (
    <div className="max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-texto flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-atencao" />
          Divergências
        </h1>
        <p className="text-sm text-texto-2 mt-1">
          Tickets do {patioNome} que saíram <strong>sem o desconto</strong> ser
          aplicado, apesar de o parceiro ter liberado.
        </p>
      </header>

      {/* Explicar a causa é parte da tela: sem isso o gestor lê como bug do
          sistema e liga reclamando, quando é o comportamento combinado. */}
      <div className="rounded-2xl border border-borda bg-fundo p-4 mb-5 text-sm text-texto-2">
        <p>
          Acontece quando o celular do operador estava{" "}
          <strong>sem internet</strong> na hora da saída e o voucher tinha sido
          criado depois do último sincronismo. A regra é cobrar o valor cheio
          quando não dá para confirmar — o operador nunca decide desconto.
        </p>
        <p className="mt-2">
          O cliente já pagou e isso não se desfaz por aqui. O que dá para
          acertar é a conta: cancelar devolve a cota ao parceiro e tira a
          liberação da fatura dele — afinal, o desconto não foi dado.
        </p>
      </div>

      {linhas.length === 0 ? (
        <div className="rounded-2xl border border-borda bg-superficie p-8 text-center">
          <CircleCheck className="w-8 h-8 text-brand-600 mx-auto mb-2" />
          <p className="font-bold text-texto">Nenhuma divergência</p>
          <p className="text-sm text-texto-2 mt-1">
            Todas as liberações viraram desconto de verdade.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {linhas.map((l) => (
            <li
              key={l.id}
              className="rounded-2xl border border-atencao/40 bg-atencao/5 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-texto tracking-wide">
                    {l.placa}
                    <span className="ml-2 text-xs font-bold text-texto-2">
                      {l.parceiro} · {l.regra}
                    </span>
                  </p>
                  <p className="text-xs text-texto-2 mt-0.5">
                    liberado {dataHora.format(new Date(l.liberadoEm))}
                    {l.saida &&
                      ` · saiu ${dataHora.format(new Date(l.saida))}`}
                    {l.valorCobrado != null &&
                      ` · cobrado ${moeda.format(l.valorCobrado)}`}
                  </p>
                </div>
                <BotaoCancelar id={l.id} placa={l.placa} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BotaoCancelar({ id, placa }: { id: string; placa: string }) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    cancelarDivergencia,
    null,
  );

  useEffect(() => {
    if (estado) toast[estado.ok ? "sucesso" : "erro"](estado.msg);
  }, [estado, toast]);

  return (
    <form action={agir}>
      <input type="hidden" name="liberacao_id" value={id} />
      <button
        type="submit"
        disabled={pendente}
        title={`Cancelar a liberação de ${placa}`}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-borda bg-superficie text-sm font-bold text-texto-2 hover:text-perigo hover:border-perigo/40 disabled:opacity-50"
      >
        <XCircle className="w-4 h-4" /> Cancelar
      </button>
    </form>
  );
}
