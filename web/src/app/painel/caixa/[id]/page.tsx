import Link from "next/link";
import { labelCaixaStatus, labelCaixaTipo } from "@/lib/status-labels";
import { formatarDataHora } from "@/lib/format-data";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Revelar } from "@/components/ui/revelar";
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  HandCoins,
  Inbox,
} from "lucide-react";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function CaixaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ patio?: string }>;
}) {
  const { id } = await params;
  const { patio } = await searchParams;
  const voltarHref = patio ? `/painel/caixa?patio=${patio}` : "/painel/caixa";
  const supabase = await createClient();

  const [{ data: sessao }, { data: movimentos }] = await Promise.all([
    supabase
      .from("caixa_sessoes")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("caixa_movimentos")
      .select("id, tipo, valor, descricao, forma_pagamento, ticket_id, criado_em")
      .eq("caixa_sessao_id", id)
      .order("criado_em", { ascending: false }),
  ]);

  if (!sessao) notFound();

  const movs = movimentos ?? [];
  const soma = (tipo: string) =>
    movs
      .filter((m) => m.tipo === tipo)
      .reduce((s, m) => s + (Number(m.valor) || 0), 0);
  const entradas = soma("entrada");
  const sangrias = soma("sangria");
  const isencoes = soma("isencao");
  const esperado = Number(sessao.fundo_caixa) + entradas - sangrias;

  return (
    <div className="space-y-5 max-w-4xl">
      <Revelar>
        <Link
          href={voltarHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-texto-2 hover:text-brand-700 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao caixa
        </Link>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[26px] font-black tracking-tight">
              Sessão de {sessao.operador_nome ?? "operador"}
            </h1>
            <p className="text-sm text-texto-2 tabular-nums">
              Abertura {formatarDataHora(sessao.abertura)}
              {sessao.fechamento && ` · Fechamento ${formatarDataHora(sessao.fechamento)}`}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
              sessao.status === "aberta"
                ? "bg-brand-50 text-brand-700 border-brand-200"
                : "bg-fundo text-texto-2 border-borda"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                sessao.status === "aberta" ? "bg-brand-500 animate-pulse" : "bg-texto-3"
              }`}
            />
            {labelCaixaStatus(sessao.status)}
          </span>
        </div>
      </Revelar>

      {/* Resumo */}
      <Revelar atraso={0.06}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Resumo rotulo="Fundo de caixa" valor={moeda.format(Number(sessao.fundo_caixa) || 0)} />
          <Resumo rotulo="Entradas" valor={moeda.format(entradas)} positivo />
          <Resumo rotulo="Sangrias" valor={moeda.format(sangrias)} negativo />
          <Resumo
            rotulo={sessao.status === "aberta" ? "Esperado em caixa" : "Fechamento"}
            valor={moeda.format(
              sessao.status === "aberta"
                ? esperado
                : Number(sessao.total_fechamento ?? esperado),
            )}
            destaque
          />
        </div>
      </Revelar>

      {isencoes > 0 && (
        <Revelar atraso={0.1}>
          <p className="text-xs text-texto-2">
            Além disso, {moeda.format(isencoes)} em isenções (não entram no
            caixa).
          </p>
        </Revelar>
      )}

      {sessao.observacao_fechamento && (
        <Revelar atraso={0.1}>
          <div className="bg-aviso-bg border border-aviso/25 rounded-xl px-4 py-3 text-sm">
            <b>Observação do fechamento:</b> {sessao.observacao_fechamento}
          </div>
        </Revelar>
      )}

      {/* Movimentos */}
      <Revelar atraso={0.12}>
        <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-borda">
            <h2 className="font-bold text-sm">
              Movimentos ({movs.length})
            </h2>
          </div>
          {movs.length === 0 ? (
            <div className="px-5 py-12 flex flex-col items-center gap-2 text-center">
              <Inbox className="w-6 h-6 text-texto-3" />
              <p className="text-sm text-texto-3">Nenhum movimento nesta sessão.</p>
            </div>
          ) : (
            <ul className="divide-y divide-borda">
              {movs.map((m) => (
                <li
                  key={m.id}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-brand-50/40 transition-colors"
                >
                  <IconeTipo tipo={m.tipo} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold capitalize">
                      {labelCaixaTipo(m.tipo)}
                      {m.forma_pagamento && (
                        <span className="ml-2 text-[11px] font-bold text-texto-3 uppercase">
                          {m.forma_pagamento.replace("_", " ")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-texto-3 truncate">
                      {m.descricao || (m.ticket_id ? `ticket ${m.ticket_id.slice(0, 8)}…` : "—")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-bold tabular-nums ${
                        m.tipo === "sangria"
                          ? "text-perigo"
                          : m.tipo === "isencao"
                            ? "text-texto-3"
                            : "text-brand-700"
                      }`}
                    >
                      {m.tipo === "sangria" ? "−" : "+"}
                      {moeda.format(Number(m.valor) || 0)}
                    </p>
                    <p className="text-[11px] text-texto-3 tabular-nums">
                      {formatarDataHora(m.criado_em)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Revelar>
    </div>
  );
}

function Resumo({
  rotulo,
  valor,
  destaque = false,
  positivo = false,
  negativo = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  positivo?: boolean;
  negativo?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        destaque
          ? "bg-gradient-to-br from-brand-700 via-brand-600 to-acento-teal text-white shadow-[var(--shadow-brand)]"
          : "bg-superficie border border-borda shadow-[var(--shadow-card)]"
      }`}
    >
      <div
        className={`text-[11px] font-bold uppercase tracking-wider ${
          destaque ? "text-white/75" : "text-texto-3"
        }`}
      >
        {rotulo}
      </div>
      <div
        className={`mt-1 text-xl font-black tabular-nums ${
          !destaque && positivo ? "text-brand-700" : ""
        } ${!destaque && negativo ? "text-perigo" : ""}`}
      >
        {valor}
      </div>
    </div>
  );
}

function IconeTipo({ tipo }: { tipo: string }) {
  if (tipo === "sangria")
    return (
      <span className="w-9 h-9 rounded-xl bg-perigo-bg grid place-items-center shrink-0">
        <ArrowUpFromLine className="w-4 h-4 text-perigo" />
      </span>
    );
  if (tipo === "isencao")
    return (
      <span className="w-9 h-9 rounded-xl bg-fundo grid place-items-center shrink-0">
        <HandCoins className="w-4 h-4 text-texto-3" />
      </span>
    );
  return (
    <span className="w-9 h-9 rounded-xl bg-brand-50 grid place-items-center shrink-0">
      <ArrowDownToLine className="w-4 h-4 text-brand-600" />
    </span>
  );
}
