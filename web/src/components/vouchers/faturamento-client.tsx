"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Download, Lock, CircleCheck, Gift } from "lucide-react";
import {
  fecharCompetencia,
  type Resultado,
} from "@/app/painel/vouchers/faturamento/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";

export type Linha = {
  id: string;
  nome: string;
  faturado: boolean;
  jaFechada: boolean;
  fechadaEm: string | null;
  totalLiberacoes: number;
  totalAbatido: number;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** '2026-07' → 'julho/2026' */
function porExtenso(c: string): string {
  const [ano, mes] = c.split("-");
  const nome = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(Number(ano), Number(mes) - 1, 1),
  );
  return `${nome}/${ano}`;
}

/** Últimas 12 competências fechadas, da mais recente para trás. */
function opcoes(): string[] {
  const hoje = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1 - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

export function FaturamentoClient({
  linhas,
  competencia,
  patioNome,
}: {
  linhas: Linha[];
  competencia: string;
  patioNome: string;
}) {
  const router = useRouter();
  const faturados = linhas.filter((l) => l.faturado);
  const cortesias = linhas.filter((l) => !l.faturado);
  const totalFaturado = faturados.reduce((s, l) => s + l.totalAbatido, 0);

  return (
    <div className="max-w-4xl">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto flex items-center gap-2">
            <Receipt className="w-6 h-6 text-brand-600" />
            Faturamento de vouchers
          </h1>
          <p className="text-sm text-texto-2 mt-1">
            O que cada parceiro do {patioNome} deixou de cobrar do cliente.
          </p>
        </div>
        <select
          value={competencia}
          onChange={(e) =>
            router.push(
              `/painel/vouchers/faturamento?competencia=${e.target.value}`,
            )
          }
          className="rounded-xl border border-borda bg-superficie px-3 py-2 text-sm font-bold text-texto"
          aria-label="Competência"
        >
          {opcoes().map((c) => (
            <option key={c} value={c}>
              {porExtenso(c)}
            </option>
          ))}
        </select>
      </header>

      <section className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-bold text-texto">A cobrar</h2>
          {faturados.length > 0 && (
            <span className="text-sm font-extrabold text-brand-700">
              {moeda.format(totalFaturado)}
            </span>
          )}
        </div>

        {faturados.length === 0 ? (
          <p className="text-sm text-texto-2">
            Nenhum parceiro marcado como <strong>faturado</strong> neste pátio.
          </p>
        ) : (
          <ul className="space-y-2">
            {faturados.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-borda bg-superficie p-4"
              >
                <span className="flex-1 min-w-[9rem]">
                  <span className="block font-bold text-texto">{l.nome}</span>
                  <span className="block text-xs text-texto-2">
                    {l.totalLiberacoes} liberaç{l.totalLiberacoes === 1 ? "ão" : "ões"}
                    {l.jaFechada && l.fechadaEm && " · fechada"}
                  </span>
                </span>
                <span className="font-extrabold text-texto">
                  {moeda.format(l.totalAbatido)}
                </span>
                <a
                  href={`/painel/vouchers/faturamento/csv?parceiro=${l.id}&competencia=${competencia}`}
                  className="w-9 h-9 grid place-items-center rounded-xl border border-borda text-texto-2 hover:text-brand-700 hover:border-brand-300"
                  title="Baixar extrato em CSV"
                >
                  <Download className="w-4 h-4" />
                </a>
                {l.jaFechada ? (
                  <span
                    className="flex items-center gap-1 text-xs font-bold text-brand-700"
                    title="Competência fechada"
                  >
                    <CircleCheck className="w-4 h-4" /> fechada
                  </span>
                ) : (
                  <BotaoFechar id={l.id} competencia={competencia} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Cortesia aparece, mas sem botão de fechar: não há o que cobrar. O
          gestor usa esses números para renegociar o acordo ou cortar acesso. */}
      {cortesias.length > 0 && (
        <section>
          <h2 className="font-bold text-texto mb-2 flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-texto-2" /> Cortesia do pátio
          </h2>
          <ul className="divide-y divide-borda rounded-2xl border border-borda bg-superficie">
            {cortesias.map((l) => (
              <li key={l.id} className="flex items-center gap-3 p-3.5 text-sm">
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-texto truncate">
                    {l.nome}
                  </span>
                  <span className="block text-xs text-texto-2">
                    {l.totalLiberacoes} liberação(ões)
                  </span>
                </span>
                <span className="font-bold text-texto-2">
                  {moeda.format(l.totalAbatido)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BotaoFechar({
  id,
  competencia,
}: {
  id: string;
  competencia: string;
}) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    fecharCompetencia,
    null,
  );

  useEffect(() => {
    if (estado) toast[estado.ok ? "sucesso" : "erro"](estado.msg);
  }, [estado, toast]);

  return (
    <form action={agir}>
      <input type="hidden" name="parceiro_id" value={id} />
      <input type="hidden" name="competencia" value={competencia} />
      <Botao carregando={pendente} variante="fantasma">
        <Lock className="w-4 h-4" /> Fechar
      </Botao>
    </form>
  );
}
