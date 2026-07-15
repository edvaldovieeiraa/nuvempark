"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Printer, Download, Loader2, Play } from "lucide-react";
import {
  gerarMovimentos,
  gerarPagamentosTickets,
  gerarPagamentosMensalidade,
  gerarReceitas,
  gerarDespesas,
  gerarFormasPagamento,
  gerarTotalizador,
  type Escopo,
  type OperadorLite,
} from "@/app/painel/financeiro/prestacao/actions";
import { gerarPdf, type RelatorioDados } from "./relatorio-pdf";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { formatarData, formatarDataHora } from "@/lib/format-data";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const SECOES = [
  { key: "movimentos", label: "Resumo dos movimentos" },
  { key: "pagTickets", label: "Pagamentos de tickets" },
  { key: "mensalidades", label: "Pagamentos de mensalidade" },
  { key: "receitas", label: "Receitas" },
  { key: "despesas", label: "Despesas" },
  { key: "formas", label: "Formas de pagamento" },
  { key: "totalizador", label: "Totalizador" },
] as const;
type SecaoKey = (typeof SECOES)[number]["key"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fmtBr(dia: string) {
  return dia ? formatarData(dia) : "";
}
function inicioIso(dia: string) {
  return new Date(`${dia}T00:00:00`).toISOString();
}
function fimIso(dia: string) {
  return new Date(`${dia}T23:59:59.999`).toISOString();
}
function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function PrestacaoClient({
  patioId,
  patioNome,
  geradoPor,
  operadores,
}: {
  patioId: string;
  patioNome: string;
  geradoPor: string;
  operadores: OperadorLite[];
}) {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [operadorId, setOperadorId] = useState("");
  const [secoes, setSecoes] = useState<Set<SecaoKey>>(
    new Set(SECOES.map((s) => s.key)),
  );

  const [fase, setFase] = useState<"config" | "gerando" | "pronto">("config");
  const [feito, setFeito] = useState(0);
  const [atual, setAtual] = useState("");
  const [dados, setDados] = useState<RelatorioDados | null>(null);

  function preset(tipo: "hoje" | "ontem" | "7d" | "mes") {
    const now = new Date();
    if (tipo === "hoje") {
      setInicio(ymd(now));
      setFim(ymd(now));
    } else if (tipo === "ontem") {
      const d = new Date(now.getTime() - 86_400_000);
      setInicio(ymd(d));
      setFim(ymd(d));
    } else if (tipo === "7d") {
      setInicio(ymd(new Date(now.getTime() - 6 * 86_400_000)));
      setFim(ymd(now));
    } else {
      setInicio(ymd(new Date(now.getFullYear(), now.getMonth(), 1)));
      setFim(ymd(now));
    }
  }

  function toggle(k: SecaoKey) {
    setSecoes((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  const intervaloOk = Boolean(inicio && fim && inicio <= fim);
  const selecionadas = SECOES.filter((s) => secoes.has(s.key));

  async function gerar() {
    if (!intervaloOk || selecionadas.length === 0) return;
    setFase("gerando");
    setFeito(0);

    const e: Escopo = {
      patioId,
      inicioIso: inicioIso(inicio),
      fimIso: fimIso(fim),
      operadorId: operadorId || null,
    };
    const opNome = operadorId
      ? (operadores.find((o) => o.id === operadorId)?.nome ?? "—")
      : "Todos";

    const r: RelatorioDados = {
      meta: {
        patio: patioNome,
        periodo: `${fmtBr(inicio)} a ${fmtBr(fim)}`,
        operador: opNome,
        geradoPor,
        geradoEm: formatarDataHora(new Date()),
      },
    };

    for (let i = 0; i < selecionadas.length; i++) {
      const s = selecionadas[i];
      setAtual(s.label);
      setFeito(i);
      switch (s.key) {
        case "movimentos":
          r.movimentos = await gerarMovimentos(e);
          break;
        case "pagTickets":
          r.pagTickets = await gerarPagamentosTickets(e);
          break;
        case "mensalidades":
          r.mensalidades = await gerarPagamentosMensalidade(e);
          break;
        case "receitas":
          r.receitas = await gerarReceitas(e);
          break;
        case "despesas":
          r.despesas = await gerarDespesas(e);
          break;
        case "formas":
          r.formas = await gerarFormasPagamento(e);
          break;
        case "totalizador":
          r.totalizador = await gerarTotalizador(e);
          break;
      }
    }
    setFeito(selecionadas.length);
    setDados(r);
    setFase("pronto");
  }

  async function baixarPdf() {
    if (!dados) return;
    await gerarPdf(
      dados,
      `prestacao-contas-${slug(patioNome)}-${inicio}-${fim}.pdf`,
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="print:hidden">
        <h1 className="text-[26px] font-black tracking-tight">
          Prestação de contas
        </h1>
        <p className="text-sm text-texto-2">
          <b className="text-texto">{patioNome}</b> · gere um relatório do período
        </p>
      </div>

      {/* Configuração */}
      {fase !== "pronto" && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5 space-y-4 print:hidden"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-bold text-texto-2 mb-1.5">
                De
              </label>
              <input
                type="date"
                value={inicio}
                max={fim || undefined}
                onChange={(e) => setInicio(e.target.value)}
                className="h-10 px-3 rounded-xl border border-borda bg-fundo text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-texto-2 mb-1.5">
                Até
              </label>
              <input
                type="date"
                value={fim}
                min={inicio || undefined}
                onChange={(e) => setFim(e.target.value)}
                className="h-10 px-3 rounded-xl border border-borda bg-fundo text-sm font-semibold"
              />
            </div>
            <div className="flex gap-1.5">
              {(
                [
                  ["hoje", "Hoje"],
                  ["ontem", "Ontem"],
                  ["7d", "7 dias"],
                  ["mes", "Mês atual"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => preset(k)}
                  className="h-10 px-3 rounded-xl border border-borda bg-fundo text-xs font-bold text-texto-2 hover:border-brand-300 hover:text-brand-700 transition-colors"
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-bold text-texto-2 mb-1.5">
                Operador
              </label>
              <select
                value={operadorId}
                onChange={(e) => setOperadorId(e.target.value)}
                className="h-10 px-3 rounded-xl border border-borda bg-fundo text-sm font-semibold w-full"
              >
                <option value="">Todos</option>
                {operadores.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-texto-2 mb-2">
              Seções do relatório
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SECOES.map((s) => (
                <label
                  key={s.key}
                  className="flex items-center gap-2 rounded-xl border border-borda bg-fundo/50 px-3 py-2 cursor-pointer hover:border-brand-200"
                >
                  <input
                    type="checkbox"
                    checked={secoes.has(s.key)}
                    onChange={() => toggle(s.key)}
                    className="w-4 h-4 accent-brand-600"
                  />
                  <span className="text-sm font-semibold">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {fase === "gerando" ? (
            <ProgressoBox
              feito={feito}
              total={selecionadas.length}
              atual={atual}
            />
          ) : (
            <button
              onClick={gerar}
              disabled={!intervaloOk || selecionadas.length === 0}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-sm shadow-[var(--shadow-brand)] hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              <Play className="w-4 h-4" />
              Gerar relatório
            </button>
          )}
        </motion.section>
      )}

      {/* Relatório */}
      {fase === "pronto" && dados && (
        <>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => setFase("config")}
              className="h-10 px-4 rounded-xl border border-borda bg-superficie text-sm font-bold text-texto-2 hover:border-brand-300"
            >
              Nova consulta
            </button>
            <div className="flex-1" />
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-borda bg-superficie text-sm font-bold text-texto-2 hover:border-brand-300"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={baixarPdf}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:brightness-110"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
          <Relatorio dados={dados} />
        </>
      )}
    </div>
  );
}

function ProgressoBox({
  feito,
  total,
  atual,
}: {
  feito: number;
  total: number;
  atual: string;
}) {
  const pct = total > 0 ? Math.round((feito / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-borda bg-fundo/50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-texto-2">
        <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
        {feito < total ? `Buscando ${atual}…` : "Finalizando…"}{" "}
        <span className="tabular-nums text-texto-3">
          {feito}/{total}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-fundo overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------- Relatório visual ---------------- */

function Relatorio({ dados }: { dados: RelatorioDados }) {
  const m = dados.meta;
  return (
    <div id="relatorio" className="space-y-5">
      <div className="bg-superficie border border-borda rounded-2xl p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-brand-700">
          <FileText className="w-5 h-5" />
          <h2 className="text-lg font-black">Prestação de contas</h2>
        </div>
        <p className="text-sm text-texto-2 mt-1">
          <b className="text-texto">{m.patio}</b> · {m.periodo} · Operador:{" "}
          {m.operador}
        </p>
        <p className="text-xs text-texto-3 mt-0.5">
          Gerado por {m.geradoPor} em {m.geradoEm}
        </p>
      </div>

      {dados.totalizador && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard titulo="Receitas" valor={dados.totalizador.receitas} cor="text-brand-700" />
          <KpiCard titulo="Despesas" valor={dados.totalizador.despesas} cor="text-perigo" />
          <KpiCard
            titulo="Saldo"
            valor={dados.totalizador.saldo}
            cor={dados.totalizador.saldo >= 0 ? "text-brand-700" : "text-perigo"}
            destaque
          />
        </div>
      )}

      {dados.movimentos && (
        <Secao titulo="Resumo dos movimentos">
          {dados.movimentos.sessoes.length === 0 ? (
            <Vazio />
          ) : (
            <Tabela
              head={["Fechamento", "Operador", "Fundo", "Entradas", "Sangrias", "Esperado", "Contado", "Diverg."]}
              ocultarMd={[1, 2, 3, 4, 5]}
              rows={dados.movimentos.sessoes.map((s) => [
                formatarDataHora(s.fechamento),
                s.operador_nome ?? "—",
                moeda.format(s.fundo),
                moeda.format(s.entradas),
                moeda.format(s.sangrias),
                moeda.format(s.esperado),
                moeda.format(s.contado),
                moeda.format(s.divergencia),
              ])}
            />
          )}
          <Rodape>
            {dados.movimentos.qtd} fechamento(s) · contado{" "}
            {moeda.format(dados.movimentos.totalContado)} · divergência{" "}
            {moeda.format(dados.movimentos.totalDivergencia)} (
            {dados.movimentos.comDivergencia} com diferença)
          </Rodape>
        </Secao>
      )}

      {dados.pagTickets && (
        <Secao titulo="Pagamentos de tickets">
          <NumerosLinha
            itens={[
              ["Qtd", String(dados.pagTickets.qtd)],
              ["Total", moeda.format(dados.pagTickets.total)],
              ["Ticket médio", moeda.format(dados.pagTickets.ticketMedio)],
            ]}
          />
        </Secao>
      )}

      {dados.mensalidades && (
        <Secao titulo="Pagamentos de mensalidade">
          <NumerosLinha
            itens={[
              ["Qtd", String(dados.mensalidades.qtd)],
              ["Total", moeda.format(dados.mensalidades.total)],
              ["App", moeda.format(dados.mensalidades.origem.app.total)],
              ["Painel", moeda.format(dados.mensalidades.origem.painel.total)],
            ]}
          />
          {dados.mensalidades.porForma.length > 0 && (
            <Tabela
              head={["Forma", "Qtd", "Total"]}
              rows={dados.mensalidades.porForma.map((f) => [
                f.forma,
                String(f.qtd),
                moeda.format(f.total),
              ])}
            />
          )}
        </Secao>
      )}

      {dados.receitas && (
        <Secao titulo="Receitas (entradas de caixa)">
          <Tabela
            head={["Origem", "Valor"]}
            rows={[
              ["Tickets", moeda.format(dados.receitas.tickets)],
              ["Mensalidades (app)", moeda.format(dados.receitas.mensalidades)],
              ["Outras entradas", moeda.format(dados.receitas.outras)],
              ["Total", moeda.format(dados.receitas.total)],
            ]}
          />
        </Secao>
      )}

      {dados.despesas && (
        <Secao titulo="Despesas (sangrias)">
          {dados.despesas.itens.length === 0 ? (
            <Vazio />
          ) : (
            <Tabela
              head={["Quando", "Descrição", "Valor"]}
              rows={dados.despesas.itens.map((i) => [
                formatarDataHora(i.quando),
                i.descricao,
                moeda.format(i.valor),
              ])}
            />
          )}
          <Rodape>
            {dados.despesas.qtd} sangria(s) · total{" "}
            {moeda.format(dados.despesas.total)}
          </Rodape>
        </Secao>
      )}

      {dados.formas && (
        <Secao titulo="Formas de pagamento">
          {dados.formas.formas.length === 0 ? (
            <Vazio />
          ) : (
            <Tabela
              head={["Forma", "Qtd", "Valor", "%"]}
              rows={dados.formas.formas.map((f) => [
                f.forma,
                String(f.qtd),
                moeda.format(f.valor),
                `${f.pct.toFixed(1)}%`,
              ])}
            />
          )}
        </Secao>
      )}
    </div>
  );
}

function KpiCard({
  titulo,
  valor,
  cor,
  destaque,
}: {
  titulo: string;
  valor: number;
  cor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${destaque ? "border-brand-300 bg-brand-50/40" : "border-borda bg-superficie"}`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-texto-3">
        {titulo}
      </p>
      <p className={`text-2xl font-black tabular-nums mt-1 ${cor}`}>
        {moeda.format(valor)}
      </p>
    </div>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-5 py-3 border-b border-borda">
        <h3 className="font-bold text-sm">{titulo}</h3>
      </div>
      <div className="p-1">{children}</div>
    </section>
  );
}

function Tabela({
  head,
  rows,
  ocultarMd = [],
}: {
  head: string[];
  rows: string[][];
  /** Índices de colunas secundárias a ocultar abaixo de `md`. */
  ocultarMd?: number[];
}) {
  const oculta = (i: number) => (ocultarMd.includes(i) ? "hidden md:table-cell" : "");
  return (
    <ResponsiveTable>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
            {head.map((h, i) => (
              <th
                key={i}
                className={`px-4 py-2 font-bold whitespace-nowrap ${i === 0 ? "" : "text-right"} ${oculta(i)}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-borda">
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-2 tabular-nums whitespace-nowrap ${ci === 0 ? "font-semibold" : "text-right text-texto-2"} ${oculta(ci)}`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ResponsiveTable>
  );
}

function NumerosLinha({ itens }: { itens: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-6 px-4 py-3">
      {itens.map(([k, v]) => (
        <div key={k}>
          <p className="text-[11px] uppercase tracking-wider text-texto-3 font-bold">
            {k}
          </p>
          <p className="text-lg font-black tabular-nums">{v}</p>
        </div>
      ))}
    </div>
  );
}

function Rodape({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-2 text-xs text-texto-3 border-t border-borda">
      {children}
    </p>
  );
}

function Vazio() {
  return (
    <p className="px-4 py-6 text-sm text-texto-3 text-center">
      Sem registros no período.
    </p>
  );
}
