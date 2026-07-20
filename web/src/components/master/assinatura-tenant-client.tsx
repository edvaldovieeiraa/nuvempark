"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  Zap,
  MoreVertical,
  RotateCcw,
  XCircle,
  ExternalLink,
  FileText,
  Receipt,
  Pause,
  Play,
  Pencil,
  Save,
  Plus,
} from "lucide-react";
import {
  marcarPaga,
  reabrirFatura,
  cancelarFatura,
  cobrarPorEmail,
  emitirCobrancaGateway,
  alternarSuspensao,
  salvarDadosCobranca,
  gerarFaturaTenant,
  type Resultado,
} from "@/app/master/(console)/financeiro/actions";
import { useToast } from "@/components/ui/toast";
import {
  moeda,
  formatarCompetencia,
  diasEmAtraso,
  ESTADO_FATURA,
  type EstadoFatura,
} from "@/lib/financeiro";
import { labelAssinaturaEstado } from "@/lib/status-labels";
import { formatarData, formatarDataHora } from "@/lib/format-data";

export type FaturaDetalhe = {
  id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  valorPorPatio: number;
  qtdPatios: number;
  estado: string;
  pagoEm: string | null;
  formaPagamento: string | null;
  temCobranca: boolean;
  linkPagamento: string | null;
  temPix: boolean;
  emailEnviadoEm: string | null;
  emailEnviadoPara: string | null;
};

const ESTADO_ASSINATURA_CLS: Record<string, string> = {
  trial: "bg-info-bg text-info border-info/25",
  ativa: "bg-brand-50 text-brand-700 border-brand-200",
  atrasada: "bg-aviso-bg text-aviso border-aviso/25",
  suspensa: "bg-perigo-bg text-perigo border-perigo/20",
  cancelada: "bg-fundo text-texto-3 border-borda",
};

const FORMAS: Record<string, string> = {
  manual: "Manual",
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao: "Cartão",
  boleto: "Boleto",
};

type Filtro = "todas" | "aVencer" | "vencida" | "paga";

export function AssinaturaTenantClient(props: {
  tenantId: string;
  rede: string;
  codigo: string;
  estado: string;
  valorPorPatio: number;
  patiosAtivos: number;
  mensalidade: number;
  diaVencimento: number;
  trialDias: number | null;
  emailCobranca: string | null;
  cpfCnpj: string | null;
  temGatewayCliente: boolean;
  faturas: FaturaDetalhe[];
  emailAtivo: boolean;
  gatewayAtivo: boolean;
}) {
  const toast = useToast();
  const [pendente, comecar] = useTransition();
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const estadoCls =
    ESTADO_ASSINATURA_CLS[props.estado] ?? ESTADO_ASSINATURA_CLS.ativa;

  const totais = useMemo(() => {
    let aVencer = 0;
    let vencido = 0;
    let pago = 0;
    for (const f of props.faturas) {
      if (f.estado === "aberta") aVencer += f.valor;
      else if (f.estado === "vencida") vencido += f.valor;
      else if (f.estado === "paga") pago += f.valor;
    }
    return { aVencer, vencido, pago };
  }, [props.faturas]);

  const contagem = (c: Filtro) => {
    if (c === "todas") return props.faturas.length;
    if (c === "aVencer")
      return props.faturas.filter((f) => f.estado === "aberta").length;
    return props.faturas.filter((f) => f.estado === c).length;
  };

  const visiveis = useMemo(() => {
    if (filtro === "todas") return props.faturas;
    if (filtro === "aVencer")
      return props.faturas.filter((f) => f.estado === "aberta");
    return props.faturas.filter((f) => f.estado === filtro);
  }, [props.faturas, filtro]);

  const temFaturaMesAtual = useMemo(() => {
    const d = new Date();
    const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return props.faturas.some((f) => f.competencia.startsWith(comp));
  }, [props.faturas]);

  function agir(fn: () => Promise<Resultado>) {
    comecar(async () => {
      const r = await fn();
      if (r?.ok) toast.sucesso(r.msg);
      else toast.erro(r?.msg ?? "Erro inesperado.");
    });
  }

  const FILTROS: { chave: Filtro; rotulo: string }[] = [
    { chave: "todas", rotulo: "Histórico" },
    { chave: "aVencer", rotulo: "A vencer" },
    { chave: "vencida", rotulo: "Em aberto" },
    { chave: "paga", rotulo: "Pagas" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Voltar */}
      <Link
        href="/master/assinaturas"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-texto-3 hover:text-brand-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Assinaturas
      </Link>

      {/* Cabeçalho da rede */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start gap-4 flex-wrap"
      >
        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white shrink-0 shadow-[var(--shadow-brand)]">
          <Building2 className="w-6 h-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[26px] font-black tracking-tight truncate">
              {props.rede}
            </h1>
            <span className="text-[10px] font-bold text-texto-3 bg-fundo border border-borda rounded-md px-1.5 py-0.5 tabular-nums">
              #{props.codigo}
            </span>
          </div>
          <p className="text-sm text-texto-2">
            Assinatura, faturas e cobrança desta rede.
          </p>
        </div>
        <span
          className={`inline-block text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${estadoCls}`}
        >
          {labelAssinaturaEstado(props.estado)}
        </span>
      </motion.header>

      {/* Modo manual aviso */}
      {!props.emailAtivo && !props.gatewayAtivo && (
        <div className="flex items-start gap-3 rounded-2xl border border-info/25 bg-info-bg px-4 py-3 text-sm text-info">
          <Zap className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Modo manual — você gera faturas e dá baixa na mão. Configure{" "}
            <b>RESEND_API_KEY</b> e <b>ASAAS_API_KEY</b> no servidor para
            cobrança automática (e-mail + PIX/boleto), com baixa por webhook.
          </p>
        </div>
      )}

      {/* Resumo do plano */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
            <CreditCard className="w-4 h-4 text-brand-600" />
          </span>
          <h2 className="font-bold">Plano</h2>
        </div>

        {props.estado === "trial" && props.trialDias !== null && (
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-info bg-info-bg border border-info/25 rounded-xl px-3.5 py-2.5">
            <Clock className="w-4 h-4 shrink-0" />
            {props.trialDias > 0
              ? `Teste grátis — faltam ${props.trialDias} ${props.trialDias === 1 ? "dia" : "dias"}.`
              : "Período de teste terminou."}
          </div>
        )}

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <Campo rotulo="Valor por pátio" valor={moeda.format(props.valorPorPatio)} />
          <Campo rotulo="Pátios ativos" valor={String(props.patiosAtivos)} />
          <Campo
            rotulo="Mensalidade"
            valor={moeda.format(props.mensalidade)}
            destaque
          />
          <Campo rotulo="Vencimento" valor={`dia ${props.diaVencimento}`} />
        </dl>

        {/* Ações da assinatura */}
        <div className="mt-5 pt-4 border-t border-borda flex items-center gap-2 flex-wrap">
          <EditarCobranca
            tenantId={props.tenantId}
            valorInicial={props.valorPorPatio}
            emailInicial={props.emailCobranca}
            cpfInicial={props.cpfCnpj}
            diaInicial={props.diaVencimento}
          />
          {!temFaturaMesAtual &&
            (props.estado === "ativa" || props.estado === "atrasada") && (
              <button
                onClick={() => agir(() => gerarFaturaTenant(props.tenantId))}
                disabled={pendente}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-sm font-bold hover:bg-brand-100 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Gerar fatura do mês
              </button>
            )}
          {props.estado === "suspensa" ? (
            <button
              onClick={() => agir(() => alternarSuspensao(props.tenantId, false))}
              disabled={pendente}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-sm font-bold hover:bg-brand-100 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Reativar acesso
            </button>
          ) : (
            props.estado !== "cancelada" && (
              <button
                onClick={() => agir(() => alternarSuspensao(props.tenantId, true))}
                disabled={pendente}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-perigo/25 bg-perigo-bg text-perigo text-sm font-bold hover:bg-perigo/10 transition-colors disabled:opacity-50"
              >
                <Pause className="w-4 h-4" />
                Suspender acesso
              </button>
            )
          )}
        </div>
        {!props.emailCobranca && (
          <p className="mt-3 text-xs text-aviso font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Sem e-mail de cobrança — defina para enviar faturas por e-mail.
          </p>
        )}
      </motion.section>

      {/* Totais por situação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TotalCard
          Icone={CalendarClock}
          rotulo="A vencer"
          valor={moeda.format(totais.aVencer)}
          cor="info"
        />
        <TotalCard
          Icone={AlertTriangle}
          rotulo="Em aberto (vencido)"
          valor={moeda.format(totais.vencido)}
          cor="perigo"
          alerta={totais.vencido > 0}
        />
        <TotalCard
          Icone={CheckCircle2}
          rotulo="Pago (total)"
          valor={moeda.format(totais.pago)}
          cor="brand"
        />
      </div>

      {/* Faturas */}
      <div className="space-y-4">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-fundo border border-borda w-fit max-w-full overflow-x-auto">
          {FILTROS.map((f) => (
            <button
              key={f.chave}
              onClick={() => setFiltro(f.chave)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                filtro === f.chave
                  ? "bg-superficie text-brand-700 shadow-sm"
                  : "text-texto-3 hover:text-texto-2"
              }`}
            >
              {f.rotulo}
              <span className="ml-1.5 text-xs opacity-60 tabular-nums">
                {contagem(f.chave)}
              </span>
            </button>
          ))}
        </div>

        {visiveis.length === 0 ? (
          <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] px-5 py-14 flex flex-col items-center gap-3 text-center">
            <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
              <Receipt className="w-6 h-6 text-brand-600" />
            </span>
            <p className="text-sm text-texto-3">
              {filtro === "todas"
                ? "Nenhuma fatura ainda. Gere a fatura do mês acima."
                : "Nenhuma fatura nesta situação."}
            </p>
          </div>
        ) : (
          <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden divide-y divide-borda">
            {visiveis.map((f) => (
              <LinhaFatura
                key={f.id}
                f={f}
                emailAtivo={props.emailAtivo}
                gatewayAtivo={props.gatewayAtivo}
                onAgir={agir}
                travado={pendente}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LinhaFatura({
  f,
  emailAtivo,
  gatewayAtivo,
  onAgir,
  travado,
}: {
  f: FaturaDetalhe;
  emailAtivo: boolean;
  gatewayAtivo: boolean;
  onAgir: (fn: () => Promise<Resultado>) => void;
  travado: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const est = ESTADO_FATURA[f.estado as EstadoFatura] ?? ESTADO_FATURA.aberta;
  const atraso = f.estado === "vencida" ? diasEmAtraso(f.vencimento) : 0;

  function chamar(fn: () => Promise<Resultado>) {
    setMenu(false);
    onAgir(fn);
  }

  return (
    <div
      className={`px-5 py-3.5 flex items-center gap-4 hover:bg-brand-50/30 transition-colors ${travado ? "opacity-60" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-bold capitalize truncate">
          {formatarCompetencia(f.competencia)}
        </div>
        <div className="text-xs text-texto-3">
          {f.qtdPatios} {f.qtdPatios === 1 ? "pátio" : "pátios"} ·{" "}
          {moeda.format(f.valorPorPatio)}/pátio ·{" "}
          {f.estado === "paga" && f.pagoEm ? (
            <>
              pago {formatarDataHora(f.pagoEm)}
              {f.formaPagamento
                ? ` · ${FORMAS[f.formaPagamento] ?? f.formaPagamento}`
                : ""}
            </>
          ) : (
            <>vence {formatarData(f.vencimento)}</>
          )}
          {atraso > 0 && (
            <span className="text-perigo font-bold"> · {atraso}d em atraso</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-black tabular-nums">{moeda.format(f.valor)}</div>
        {f.emailEnviadoEm && (
          <div className="text-[10px] text-texto-3 flex items-center gap-1 justify-end">
            <Mail className="w-3 h-3" /> cobrado
          </div>
        )}
      </div>

      <span
        className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${est.cls}`}
      >
        {est.rotulo}
      </span>

      {/* Ação rápida: marcar pago */}
      {(f.estado === "aberta" || f.estado === "vencida") && (
        <button
          onClick={() => chamar(() => marcarPaga(f.id))}
          disabled={travado}
          title="Marcar como paga"
          className="shrink-0 h-9 px-3 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-brand-100 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span className="hidden sm:inline">Pago</span>
        </button>
      )}

      {/* Ação rápida: recibo. Ocupa o mesmo slot do "Pago" — os dois estados são
          mutuamente exclusivos, e pegar o comprovante é a coisa mais comum de se
          fazer com uma fatura paga. Estava só dentro do menu "⋮". */}
      {f.estado === "paga" && (
        <Link
          href={`/master/recibo/${f.id}`}
          target="_blank"
          title="Abrir o recibo para imprimir ou salvar em PDF"
          className="shrink-0 h-9 px-3 rounded-lg border border-borda text-texto-2 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-fundo hover:text-texto transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Recibo</span>
        </Link>
      )}

      {/* Menu */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label="Ações"
          className="toque-44 w-9 h-9 rounded-lg grid place-items-center text-texto-3 hover:text-texto hover:bg-fundo transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 z-50 w-56 rounded-xl bg-superficie border border-borda shadow-[var(--shadow-pop)] p-1.5"
              >
                {gatewayAtivo && !f.temCobranca && f.estado !== "paga" && (
                  <Item onClick={() => chamar(() => emitirCobrancaGateway(f.id))}>
                    <Zap className="w-4 h-4 text-acento" />
                    Emitir PIX/boleto
                  </Item>
                )}
                {emailAtivo && f.estado !== "paga" && f.estado !== "cancelada" && (
                  <Item onClick={() => chamar(() => cobrarPorEmail(f.id))}>
                    <Mail className="w-4 h-4 text-brand-600" />
                    Enviar cobrança por e-mail
                  </Item>
                )}
                {f.linkPagamento && (
                  <a
                    href={f.linkPagamento}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenu(false)}
                    className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm font-semibold text-texto-2 hover:bg-fundo hover:text-texto transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir link de pagamento
                  </a>
                )}
                {/* Recibo saiu daqui: virou botão visível na própria linha. */}
                {f.estado === "paga" && (
                  <Item onClick={() => chamar(() => reabrirFatura(f.id))}>
                    <RotateCcw className="w-4 h-4" />
                    Reabrir (estornar baixa)
                  </Item>
                )}
                {f.estado !== "cancelada" && f.estado !== "paga" && (
                  <>
                    <div className="h-px bg-borda my-1" />
                    <Item perigo onClick={() => chamar(() => cancelarFatura(f.id))}>
                      <XCircle className="w-4 h-4" />
                      Cancelar fatura
                    </Item>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EditarCobranca({
  tenantId,
  valorInicial,
  emailInicial,
  cpfInicial,
  diaInicial,
}: {
  tenantId: string;
  valorInicial: number;
  emailInicial: string | null;
  cpfInicial: string | null;
  diaInicial: number;
}) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [salvando, comecar] = useTransition();
  // Valor editável como texto (aceita vírgula ou ponto). Ex.: "129,90".
  const [valor, setValor] = useState(
    valorInicial.toFixed(2).replace(".", ","),
  );
  const [email, setEmail] = useState(emailInicial ?? "");
  const [cpf, setCpf] = useState(cpfInicial ?? "");
  const [dia, setDia] = useState(String(diaInicial ?? 10));

  function salvar() {
    const valorNum = Number(valor.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valorNum) || valorNum < 0) {
      toast.erro("Valor por pátio inválido.");
      return;
    }
    comecar(async () => {
      const r = await salvarDadosCobranca(tenantId, {
        email: email.trim(),
        cpfCnpj: cpf.trim(),
        diaVencimento: Number(dia) || 10,
        valorPorPatio: valorNum,
      });
      if (r?.ok) {
        toast.sucesso(r.msg);
        setAberto(false);
      } else {
        toast.erro(r?.msg ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setAberto((a) => !a)}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-borda bg-superficie text-texto-2 text-sm font-bold hover:bg-fundo transition-colors"
      >
        <Pencil className="w-4 h-4" />
        Editar plano e cobrança
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full overflow-hidden"
          >
            <div className="mt-2 grid sm:grid-cols-[auto_1fr_1fr_auto] gap-3 items-end bg-fundo/60 border border-borda rounded-xl p-4">
              <label className="text-sm">
                <span className="block text-xs font-bold text-texto-3 mb-1">
                  Valor por pátio
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-texto-3 pointer-events-none">
                    R$
                  </span>
                  <input
                    inputMode="decimal"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="129,90"
                    className="w-32 h-10 pl-9 pr-3 rounded-lg border border-borda bg-superficie text-sm font-bold tabular-nums focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </label>
              <label className="text-sm">
                <span className="block text-xs font-bold text-texto-3 mb-1">
                  E-mail de cobrança
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="financeiro@rede.com"
                  className="w-full h-10 px-3 rounded-lg border border-borda bg-superficie text-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs font-bold text-texto-3 mb-1">
                  CPF/CNPJ
                </span>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full h-10 px-3 rounded-lg border border-borda bg-superficie text-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                />
              </label>
              <div className="flex items-end gap-3">
                <label className="text-sm">
                  <span className="block text-xs font-bold text-texto-3 mb-1">
                    Dia venc.
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={dia}
                    onChange={(e) => setDia(e.target.value)}
                    className="w-20 h-10 px-3 rounded-lg border border-borda bg-superficie text-sm tabular-nums focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  />
                </label>
                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="h-10 px-4 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {salvando ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Item({
  children,
  onClick,
  perigo = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  perigo?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm font-semibold transition-colors ${
        perigo
          ? "text-perigo hover:bg-perigo-bg"
          : "text-texto-2 hover:bg-fundo hover:text-texto"
      }`}
    >
      {children}
    </button>
  );
}

function Campo({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-bold text-texto-3 uppercase tracking-wide">
        {rotulo}
      </dt>
      <dd
        className={`mt-0.5 tabular-nums ${destaque ? "text-brand-700 font-black text-lg" : "font-bold"}`}
      >
        {valor}
      </dd>
    </div>
  );
}

function TotalCard({
  Icone,
  rotulo,
  valor,
  cor,
  alerta = false,
}: {
  Icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor: string;
  cor: "info" | "perigo" | "brand";
  alerta?: boolean;
}) {
  const iconeCls =
    cor === "perigo"
      ? "bg-perigo-bg text-perigo"
      : cor === "info"
        ? "bg-info-bg text-info"
        : "bg-brand-50 text-brand-600";
  return (
    <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${iconeCls}`}>
        <Icone className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-texto-3">
          {rotulo}
        </div>
        <div
          className={`text-lg font-black tabular-nums leading-tight ${alerta ? "text-perigo" : ""}`}
        >
          {valor}
        </div>
      </div>
    </div>
  );
}
