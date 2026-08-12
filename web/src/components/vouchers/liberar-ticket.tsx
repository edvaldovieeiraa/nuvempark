"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Check, CircleCheck } from "lucide-react";
import { liberar, type ResultadoLiberar, type TicketAchado } from "@/app/parceiro/actions";
import { descreverRegra, type RegraVoucher } from "@/lib/vouchers/calculo";
import { Botao } from "@/components/ui/botao";

type Regra = RegraVoucher & { id: string };

const hora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function LiberarTicket({
  ticket,
  regras,
}: {
  ticket: TicketAchado;
  regras: Regra[];
}) {
  const [estado, agir, pendente] = useActionState<ResultadoLiberar, FormData>(
    liberar,
    null,
  );
  const [escolhida, setEscolhida] = useState<string>(
    regras.length === 1 ? regras[0].id : "",
  );

  // Liberou: a tela vira confirmação. O balconista não tem mais nada a fazer
  // aqui, e deixar o formulário na tela convidaria a um segundo clique que o
  // banco recusaria (NPV04) sem que ele entendesse por quê.
  if (estado?.ok) {
    return (
      <div className="space-y-5 text-center py-8">
        <span className="w-16 h-16 rounded-full bg-brand-100 grid place-items-center mx-auto">
          <CircleCheck className="w-8 h-8 text-brand-700" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-texto">Ticket liberado</h1>
          <p className="text-sm text-texto-2 mt-1">
            {ticket.placa} · o desconto é aplicado quando o cliente sair.
          </p>
        </div>
        <Link
          href="/parceiro"
          className="inline-block px-5 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold"
        >
          Liberar outro
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/parceiro"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-texto-2 hover:text-brand-700"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="rounded-2xl border border-borda bg-superficie p-4">
        <p className="text-2xl font-extrabold tracking-wide text-texto">
          {ticket.placa}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-texto-2 mt-0.5">
          <Clock className="w-4 h-4" /> entrou às{" "}
          {hora.format(new Date(ticket.entrada))}
        </p>
      </div>

      {ticket.ja_liberado ? (
        <div className="rounded-2xl border border-brand-300 bg-brand-50 p-4 flex gap-3">
          <Check className="w-5 h-5 text-brand-700 shrink-0" />
          <p className="text-sm text-texto-2">
            Este ticket <strong>já foi liberado</strong>. Um ticket recebe uma
            liberação só — se precisar trocar a regra, fale com o
            estacionamento.
          </p>
        </div>
      ) : regras.length === 0 ? (
        <div className="rounded-2xl border border-atencao/40 bg-atencao/10 p-4">
          <p className="text-sm text-texto-2">
            Seu acesso ainda não tem nenhuma regra liberada. Fale com o
            estacionamento.
          </p>
        </div>
      ) : (
        <form action={agir} className="space-y-4">
          <input type="hidden" name="ticket_id" value={ticket.ticket_id} />
          <input type="hidden" name="regra_id" value={escolhida} />

          <div>
            <p className="text-xs font-bold text-texto-2 mb-2">
              Qual desconto o cliente recebe?
            </p>
            <div className="space-y-2">
              {regras.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setEscolhida(r.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                    escolhida === r.id
                      ? "border-brand-600 bg-brand-50"
                      : "border-borda bg-superficie hover:border-brand-300"
                  }`}
                >
                  <span className="block font-bold text-texto">{r.nome}</span>
                  <span className="block text-sm text-texto-2">
                    {descreverRegra(r)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {estado && !estado.ok && (
            <p
              role="alert"
              className="rounded-xl bg-perigo/10 border border-perigo/30 px-3 py-2 text-sm font-semibold text-perigo"
            >
              {estado.msg}
            </p>
          )}

          <Botao carregando={pendente} disabled={!escolhida} className="w-full">
            Liberar {ticket.placa}
          </Botao>

          {/* O valor real só existe na saída. Prometer reais aqui seria
              prometer um número que pode mudar — o carro ainda está no pátio. */}
          <p className="text-xs text-texto-2 text-center">
            O desconto é calculado quando o cliente sair.
          </p>
        </form>
      )}
    </div>
  );
}
