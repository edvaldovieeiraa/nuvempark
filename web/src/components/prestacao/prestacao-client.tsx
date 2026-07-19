"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Printer,
  Download,
  Loader2,
  Play,
  ChevronDown,
  Check,
} from "lucide-react";
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

type PresetTipo = "hoje" | "ontem" | "7d" | "mes";

function rangeFor(tipo: PresetTipo): { inicio: string; fim: string } {
  const now = new Date();
  if (tipo === "hoje") {
    return { inicio: ymd(now), fim: ymd(now) };
  }
  if (tipo === "ontem") {
    const d = new Date(now.getTime() - 86_400_000);
    return { inicio: ymd(d), fim: ymd(d) };
  }
  if (tipo === "7d") {
    return { inicio: ymd(new Date(now.getTime() - 6 * 86_400_000)), fim: ymd(now) };
  }
  return {
    inicio: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
    fim: ymd(now),
  };
}

const PRESETS: [PresetTipo, string][] = [
  ["hoje", "Hoje"],
  ["ontem", "Ontem"],
  ["7d", "7 dias"],
  ["mes", "Mês atual"],
];

const CAMPO_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#6B7280",
  marginBottom: 6,
};

const CAMPO_INPUT: React.CSSProperties = {
  height: 40,
  borderRadius: 11,
  border: "1px solid #E4E8EC",
  background: "#FAFBFC",
  fontSize: 13,
  fontWeight: 600,
  color: "#1F2937",
  padding: "0 12px",
};

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

  function preset(tipo: PresetTipo) {
    const r = rangeFor(tipo);
    setInicio(r.inicio);
    setFim(r.fim);
  }

  const presetAtivo: PresetTipo | null =
    PRESETS.find(([k]) => {
      const r = rangeFor(k);
      return r.inicio === inicio && r.fim === fim;
    })?.[0] ?? null;

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="print:hidden">
        <h2
          style={{
            margin: 0,
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "-.02em",
          }}
        >
          Prestação de contas
        </h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          <b style={{ color: "#1F2937" }}>{patioNome}</b> · gere um relatório do
          período
        </div>
      </div>

      {/* Configuração */}
      {fase !== "pronto" && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="print:hidden"
          style={{
            borderRadius: 16,
            background: "#fff",
            border: "1px solid #E4E8EC",
            boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: 12,
            }}
          >
            <div>
              <div style={CAMPO_LABEL}>De</div>
              <input
                type="date"
                value={inicio}
                max={fim || undefined}
                onChange={(e) => setInicio(e.target.value)}
                className="mono"
                style={CAMPO_INPUT}
              />
            </div>
            <div>
              <div style={CAMPO_LABEL}>Até</div>
              <input
                type="date"
                value={fim}
                min={inicio || undefined}
                onChange={(e) => setFim(e.target.value)}
                className="mono"
                style={CAMPO_INPUT}
              />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {PRESETS.map(([k, l]) => {
                const ativo = presetAtivo === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => preset(k)}
                    style={{
                      height: 40,
                      padding: "0 13px",
                      borderRadius: 11,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: ativo ? "#DCFCE7" : "#FAFBFC",
                      border: `1px solid ${ativo ? "#BBF7D0" : "#E4E8EC"}`,
                      color: ativo ? "#16A34A" : "#6B7280",
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
            <div style={{ minWidth: 180, flex: 1 }}>
              <div style={CAMPO_LABEL}>Operador</div>
              <div style={{ position: "relative" }}>
                <select
                  value={operadorId}
                  onChange={(e) => setOperadorId(e.target.value)}
                  style={{
                    ...CAMPO_INPUT,
                    width: "100%",
                    paddingRight: 34,
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Todos</option>
                  {operadores.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#8695A0",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <div style={{ ...CAMPO_LABEL, marginBottom: 9 }}>
              Seções do relatório
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 9,
              }}
            >
              {SECOES.map((s) => {
                const marcada = secoes.has(s.key);
                return (
                  <label
                    key={s.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      borderRadius: 11,
                      border: "1px solid #E4E8EC",
                      background: "#FAFBFC",
                      padding: "10px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={() => toggle(s.key)}
                      style={{
                        position: "absolute",
                        width: 1,
                        height: 1,
                        padding: 0,
                        margin: -1,
                        overflow: "hidden",
                        clip: "rect(0 0 0 0)",
                        whiteSpace: "nowrap",
                        border: 0,
                      }}
                    />
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        background: marcada ? "#16A34A" : "#fff",
                        border: marcada ? "none" : "1px solid #CBD5E1",
                      }}
                    >
                      {marcada && (
                        <Check size={12} strokeWidth={3} color="#fff" />
                      )}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {s.label}
                    </span>
                  </label>
                );
              })}
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
              type="button"
              onClick={gerar}
              disabled={!intervaloOk || selecionadas.length === 0}
              style={{
                alignSelf: "flex-start",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 44,
                padding: "0 20px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(90deg,#16A34A,#22C55E)",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)",
                cursor:
                  !intervaloOk || selecionadas.length === 0
                    ? "not-allowed"
                    : "pointer",
                opacity: !intervaloOk || selecionadas.length === 0 ? 0.5 : 1,
                pointerEvents:
                  !intervaloOk || selecionadas.length === 0 ? "none" : "auto",
              }}
            >
              <Play size={16} fill="currentColor" />
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
