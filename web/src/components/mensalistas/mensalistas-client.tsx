"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  UserPlus,
  Car,
  Lock,
  LockOpen,
  Trash2,
  ChevronDown,
  BadgeCheck,
  Banknote,
  Receipt,
  X,
  AlertTriangle,
  Loader2,
  Ban,
} from "lucide-react";
import {
  alternarBloqueio,
  adicionarVeiculo,
  removerVeiculo,
  registrarPagamento,
  listarPagamentos,
  cancelarPagamento,
  atualizarDiaVencimento,
  type Resultado,
  type PagamentoRow,
} from "@/app/painel/mensalistas/actions";
import {
  diasAteVencimento,
  formatarVencimentoBR,
} from "@/lib/vencimento";
import { formatarDataHora } from "@/lib/format-data";
import { useToast } from "@/components/ui/toast";
import { Confirmar } from "@/components/ui/confirmar";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const FORMAS = [
  { v: "dinheiro", l: "Dinheiro" },
  { v: "pix", l: "PIX" },
  { v: "cartao", l: "Cartão" },
  { v: "transferencia", l: "Transferência" },
];
function rotuloForma(f: string | null): string {
  return FORMAS.find((x) => x.v === f)?.l ?? (f ?? "—");
}

type Plano = { id: string; nome: string; tipo: string; valor: number };
type Veiculo = {
  id: string;
  cliente_id: string;
  placa: string;
  descricao: string | null;
};
type Cliente = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  patio_id: string;
  plano_id: string | null;
  vencimento: string | null;
  dia_vencimento: number | null;
  vagas: number;
  bloqueado: boolean;
  ativo: boolean;
  criado_em: string;
};
type Hoje = { ano: number; mes: number; dia: number };

type Badge =
  | { tipo: "credenciado" }
  | { tipo: "em_dia"; dias: number }
  | { tipo: "vence"; dias: number }
  | { tipo: "atrasado"; dias: number }
  | { tipo: "pendente" };

const pad2 = (n: number) => String(n).padStart(2, "0");
function competenciaLabel(comp: string): string {
  return new Date(`${comp.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Status baseado na DATA de vencimento (rolante): o pagamento avança o
 * vencimento, então "em dia" = vencimento no futuro; "vence" = próximos 7 dias;
 * "atrasado" = vencimento no passado. Sem vencimento => "pendente".
 */
function calcularBadge(
  cliente: Cliente,
  plano: Plano | undefined,
  hoje: Hoje,
): Badge {
  if (plano?.tipo === "credenciado") return { tipo: "credenciado" };
  if (!cliente.vencimento) return { tipo: "pendente" };

  const hojeYmd = `${hoje.ano}-${pad2(hoje.mes)}-${pad2(hoje.dia)}`;
  const dias = diasAteVencimento(cliente.vencimento, hojeYmd);
  if (dias < 0) return { tipo: "atrasado", dias: -dias };
  if (dias <= 7) return { tipo: "vence", dias };
  return { tipo: "em_dia", dias };
}

function textoAtraso(dias: number): string {
  if (dias >= 45) {
    const meses = Math.round(dias / 30);
    return `Atrasado há ${meses} meses`;
  }
  return `Atrasado há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

function BadgeStatus({ badge }: { badge: Badge }) {
  const cfg = (() => {
    switch (badge.tipo) {
      case "credenciado":
        return { txt: "Credenciado", cls: "bg-fundo text-texto-2 border-borda" };
      case "em_dia":
        return { txt: "Em dia", cls: "bg-brand-50 text-brand-700 border-brand-200" };
      case "pendente":
        return {
          txt: "Sem vencimento",
          cls: "bg-fundo text-texto-3 border-borda",
        };
      case "vence":
        return {
          txt:
            badge.dias === 0
              ? "Vence hoje"
              : `Vence em ${badge.dias} ${badge.dias === 1 ? "dia" : "dias"}`,
          cls: "bg-aviso-bg text-aviso border-aviso/25",
        };
      case "atrasado":
        return {
          txt: textoAtraso(badge.dias),
          cls: "bg-perigo-bg text-perigo border-perigo/20",
        };
    }
  })();
  return (
    <span
      className={`text-[10px] font-bold uppercase border rounded-full px-2 py-0.5 ${cfg.cls}`}
    >
      {cfg.txt}
    </span>
  );
}

export function MensalistasClient({
  patioId,
  patioNome,
  planos,
  clientes,
  veiculos,
  pagasPorCliente,
  hoje,
}: {
  patioId: string;
  patioNome: string;
  planos: Plano[];
  clientes: Cliente[];
  veiculos: Veiculo[];
  pagasPorCliente: Record<string, string[]>;
  hoje: Hoje;
}) {
  const planoDe = (id: string | null) => planos.find((p) => p.id === id);
  const veiculosDe = (clienteId: string) =>
    veiculos.filter((v) => v.cliente_id === clienteId);

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Mensalistas</h1>
          <p className="text-sm text-texto-2">
            Clientes do <b className="text-texto">{patioNome}</b> com livre
            passagem no app · {clientes.length}{" "}
            {clientes.length === 1 ? "cliente" : "clientes"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/painel/mensalistas/planos?patio=${patioId}`}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-borda bg-superficie text-sm font-bold text-texto-2 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all"
          >
            <BadgeCheck className="w-4 h-4" />
            Planos
          </Link>
          <Link
            href={`/painel/mensalistas/novo?patio=${patioId}`}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-sm shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Novo cliente
          </Link>
        </div>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        {clientes.length === 0 ? (
          <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
            <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
              <UserPlus className="w-6 h-6 text-brand-600" />
            </span>
            <p className="text-sm text-texto-3">
              Nenhum cliente neste pátio ainda.
            </p>
            <Link
              href={`/painel/mensalistas/novo?patio=${patioId}`}
              className="text-sm font-bold text-brand-700 hover:underline"
            >
              Cadastrar o primeiro cliente
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-borda">
            <AnimatePresence initial={false}>
              {clientes.map((c) => {
                const plano = planoDe(c.plano_id);
                const pagas = pagasPorCliente[c.id] ?? [];
                const badge = calcularBadge(c, plano, hoje);
                return (
                  <LinhaCliente
                    key={c.id}
                    cliente={c}
                    plano={plano}
                    veiculos={veiculosDe(c.id)}
                    badge={badge}
                    pagas={pagas}
                    hoje={hoje}
                  />
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </motion.section>
    </div>
  );
}

/* ---------- Linha do cliente ---------- */

function LinhaCliente({
  cliente,
  plano,
  veiculos,
  badge,
  pagas,
  hoje,
}: {
  cliente: Cliente;
  plano: Plano | undefined;
  veiculos: Veiculo[];
  badge: Badge;
  pagas: string[];
  hoje: Hoje;
}) {
  const toast = useToast();
  const [expandido, setExpandido] = useState(false);
  const [pagamentoAberto, setPagamentoAberto] = useState(false);
  const [pendente, comecar] = useTransition();

  const ehCredenciado = plano?.tipo === "credenciado";

  async function alternar() {
    const r = await alternarBloqueio(cliente.id, cliente.bloqueado);
    if (r?.ok) (cliente.bloqueado ? toast.sucesso : toast.info)(r.msg);
    else toast.erro(r?.msg ?? "Erro inesperado.");
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cliente.bloqueado ? "bg-perigo-bg/40" : ""}
    >
      <div className="px-4 md:px-5 py-3.5 flex items-center gap-2.5 md:gap-3">
        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white text-xs font-black shrink-0">
          {cliente.nome.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm flex items-center gap-2 flex-wrap">
            {cliente.nome}
            <span className="text-[10px] font-bold uppercase text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-2 py-0.5">
              {plano?.nome ?? "sem plano"}
            </span>
            <BadgeStatus badge={badge} />
            {cliente.bloqueado && (
              <span className="text-[10px] font-bold uppercase text-perigo bg-perigo-bg border border-perigo/20 rounded-full px-2 py-0.5">
                bloqueado
              </span>
            )}
          </p>
          <p className="text-xs text-texto-3">
            {cliente.vencimento
              ? `Vence ${formatarVencimentoBR(cliente.vencimento)}`
              : "Sem vencimento definido"}
            {cliente.dia_vencimento ? ` · todo dia ${cliente.dia_vencimento}` : ""}
            {` · ${veiculos.length} ${veiculos.length === 1 ? "placa" : "placas"}`}
          </p>
        </div>

        {!ehCredenciado && (
          <button
            onClick={() => setPagamentoAberto(true)}
            title="Registrar pagamento"
            aria-label="Registrar pagamento"
            className="toque-44 shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-brand-50 border border-brand-200 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors"
          >
            <Banknote className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pagamento</span>
          </button>
        )}

        <button
          onClick={() => comecar(alternar)}
          disabled={pendente}
          title={cliente.bloqueado ? "Desbloquear" : "Bloquear"}
          aria-label={cliente.bloqueado ? "Desbloquear cliente" : "Bloquear cliente"}
          className={`toque-44 w-8 h-8 rounded-lg grid place-items-center transition-colors ${
            cliente.bloqueado
              ? "text-perigo hover:bg-perigo-bg"
              : "text-texto-3 hover:text-aviso hover:bg-aviso-bg"
          }`}
        >
          {cliente.bloqueado ? (
            <Lock className="w-4 h-4" />
          ) : (
            <LockOpen className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => setExpandido((e) => !e)}
          aria-label="Ver detalhes"
          className="toque-44 w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-brand-700 hover:bg-brand-50 transition-colors"
        >
          <motion.span animate={{ rotate: expandido ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>
      </div>

      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-5 pb-4 pl-4 md:pl-[68px] space-y-4">
              {/* Veículos */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-texto-3 mb-2">
                  Veículos
                </p>
                <div className="space-y-2">
                  {veiculos.map((v) => (
                    <VeiculoLinha key={v.id} veiculo={v} />
                  ))}
                  <NovoVeiculoForm cliente={cliente} />
                </div>
              </div>

              {/* Vencimento (dia fixo) — só para quem cobra */}
              {!ehCredenciado && <DiaVencimentoEditor cliente={cliente} />}

              {/* Pagamentos (só faz sentido para quem cobra) */}
              {!ehCredenciado && <PagamentosSecao clienteId={cliente.id} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pagamentoAberto && (
          <ModalPagamento
            cliente={cliente}
            plano={plano}
            pagas={pagas}
            hoje={hoje}
            fechar={() => setPagamentoAberto(false)}
          />
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/* ---------- Editor: dia fixo de vencimento ---------- */

function DiaVencimentoEditor({ cliente }: { cliente: Cliente }) {
  const toast = useToast();
  const router = useRouter();
  const [dia, setDia] = useState(
    cliente.dia_vencimento ? String(cliente.dia_vencimento) : "",
  );
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const n = dia.trim() === "" ? null : Number(dia);
    if (n !== null && (!Number.isInteger(n) || n < 1 || n > 28)) {
      toast.erro("Dia inválido", "Use um dia entre 1 e 28.");
      return;
    }
    setSalvando(true);
    const r = await atualizarDiaVencimento(cliente.id, n);
    setSalvando(false);
    if (r?.ok) {
      toast.sucesso(r.msg);
      router.refresh();
    } else toast.erro("Não deu certo", r?.msg ?? "Erro inesperado.");
  }

  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-wider text-texto-3 mb-2">
        Vencimento
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-bold text-texto-2">Dia fixo</label>
        <input
          type="number"
          min={1}
          max={28}
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          placeholder="—"
          className="w-20 h-9 px-2.5 rounded-lg border border-borda bg-superficie text-sm font-bold tabular-nums focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
        />
        <button
          onClick={salvar}
          disabled={salvando}
          className="h-9 px-3 rounded-lg bg-brand-50 border border-brand-200 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-60 inline-flex items-center gap-1.5"
        >
          {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Salvar
        </button>
        <span className="text-xs text-texto-3">
          {cliente.vencimento
            ? `Próximo: ${formatarVencimentoBR(cliente.vencimento)}`
            : "sem vencimento"}
          {dia.trim() === "" ? " · ciclo de 30 dias" : ""}
        </span>
      </div>
    </div>
  );
}

function VeiculoLinha({ veiculo }: { veiculo: Veiculo }) {
  const toast = useToast();
  return (
    <div className="flex items-center gap-2">
      <Car className="w-4 h-4 text-texto-3" />
      <span className="font-black tracking-widest text-[13px] bg-fundo border border-borda rounded-md px-2 py-0.5">
        {veiculo.placa}
      </span>
      {veiculo.descricao && (
        <span className="text-xs text-texto-3">{veiculo.descricao}</span>
      )}
      <Confirmar
        titulo="Remover veículo?"
        descricao={`A placa ${veiculo.placa} perde a livre passagem imediatamente.`}
        rotuloConfirmar="Remover"
        aoConfirmar={async () => {
          const r = await removerVeiculo(veiculo.id);
          if (r?.ok) toast.sucesso(r.msg);
          else toast.erro(r?.msg ?? "Erro inesperado.");
        }}
      >
        {(abrir) => (
          <button
            onClick={abrir}
            aria-label={`Remover placa ${veiculo.placa}`}
            className="toque-44 w-6 h-6 rounded grid place-items-center text-texto-3 hover:text-perigo hover:bg-perigo-bg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </Confirmar>
    </div>
  );
}

function NovoVeiculoForm({ cliente }: { cliente: Cliente }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    adicionarVeiculo,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso(estado.msg);
      formRef.current?.reset();
    } else toast.erro("Não deu certo", estado.msg);
  }, [estado, toast]);

  return (
    <form ref={formRef} action={agir} className="flex items-center gap-2 pt-1">
      <input type="hidden" name="cliente_id" value={cliente.id} />
      <input type="hidden" name="patio_id" value={cliente.patio_id} />
      <input
        name="placa"
        required
        placeholder="ABC1D23"
        maxLength={7}
        className="w-28 h-9 px-2.5 rounded-lg border border-borda bg-superficie text-sm font-bold tracking-widest uppercase placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
      />
      <input
        name="descricao"
        placeholder="descrição (opcional)"
        className="flex-1 max-w-[200px] h-9 px-2.5 rounded-lg border border-borda bg-superficie text-sm placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
      />
      <button
        disabled={pendente}
        className="h-9 px-3 rounded-lg bg-brand-50 border border-brand-200 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-60"
      >
        + placa
      </button>
    </form>
  );
}

/* ---------- Modal: registrar pagamento ---------- */

function ModalPagamento({
  cliente,
  plano,
  pagas,
  hoje,
  fechar,
}: {
  cliente: Cliente;
  plano: Plano | undefined;
  pagas: string[];
  hoje: Hoje;
  fechar: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [mes, setMes] = useState(`${hoje.ano}-${pad2(hoje.mes)}`); // 'YYYY-MM'
  const [valor, setValor] = useState(String(plano?.valor ?? 0));
  const [forma, setForma] = useState(FORMAS[0].v);
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  const competencia = `${mes}-01`;
  const jaExiste = pagas.includes(competencia);
  const valorNum = Number(valor.replace(",", ".")) || 0;

  async function confirmar() {
    setSalvando(true);
    const r = await registrarPagamento({
      clienteId: cliente.id,
      patioId: cliente.patio_id,
      planoId: cliente.plano_id,
      competencia,
      valor: valorNum,
      formaPagamento: forma,
      observacao: obs,
    });
    setSalvando(false);
    if (r?.ok) {
      toast.sucesso("Pagamento registrado", r.msg);
      fechar();
      router.refresh(); // atualiza o badge para EM DIA sem reload manual
    } else toast.erro("Não deu certo", r?.msg ?? "Erro inesperado.");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
      onClick={salvando ? undefined : fechar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6 max-h-[85dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-extrabold flex items-center gap-2">
            <Banknote className="w-5 h-5 text-brand-600" />
            Registrar pagamento
          </h3>
          <button
            onClick={fechar}
            disabled={salvando}
            aria-label="Fechar"
            className="toque-44 text-texto-3 hover:text-texto disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-texto-2 mb-5">
          <b className="text-texto">{cliente.nome}</b>
          {plano ? ` · plano ${plano.nome}` : ""}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-texto-2 mb-1.5">
              Competência
            </label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-borda bg-superficie text-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-texto-2 mb-1.5">
              Valor (R$)
            </label>
            <input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full h-11 px-3.5 rounded-xl border border-borda bg-superficie text-sm font-bold tabular-nums focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-texto-2 mb-1.5">
            Forma de pagamento
          </label>
          <select
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-borda bg-superficie text-sm focus:outline-none focus:border-brand-400"
          >
            {FORMAS.map((f) => (
              <option key={f.v} value={f.v}>
                {f.l}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-texto-2 mb-1.5">
            Observação (opcional)
          </label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={2}
            placeholder="Ex: pagamento parcial, desconto combinado…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-borda bg-superficie text-sm placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 resize-none"
          />
        </div>

        {jaExiste && (
          <div className="mt-4 rounded-xl border border-aviso/25 bg-aviso-bg px-3.5 py-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-aviso shrink-0 mt-0.5" />
            <p className="text-xs text-aviso font-semibold">
              Já existe um pagamento ativo para {competenciaLabel(competencia)}.
              Você pode registrar outro (a duplicidade fica visível no histórico).
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={fechar}
            disabled={salvando}
            className="h-11 px-5 rounded-xl border border-borda text-sm font-bold text-texto-2 hover:bg-fundo transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={salvando || valorNum < 0}
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:brightness-110 inline-flex items-center gap-2 disabled:opacity-60 transition-all"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Registrar {moeda.format(valorNum)}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Seção: histórico de pagamentos (lazy) ---------- */

function PagamentosSecao({ clienteId }: { clienteId: string }) {
  const [pagamentos, setPagamentos] = useState<PagamentoRow[] | null>(null);
  const [carregando, comecar] = useTransition();

  useEffect(() => {
    comecar(async () => {
      const dados = await listarPagamentos(clienteId);
      setPagamentos(dados);
    });
  }, [clienteId]);

  // Competências com mais de um pagamento ATIVO → duplicidade a destacar.
  const ativosPorComp: Record<string, number> = {};
  (pagamentos ?? [])
    .filter((p) => !p.cancelado_em)
    .forEach((p) => {
      ativosPorComp[p.competencia] = (ativosPorComp[p.competencia] ?? 0) + 1;
    });

  function recarregar() {
    comecar(async () => {
      const dados = await listarPagamentos(clienteId);
      setPagamentos(dados);
    });
  }

  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-wider text-texto-3 mb-2">
        Pagamentos
      </p>

      {carregando && pagamentos === null ? (
        <div className="py-4 text-texto-3 flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : (pagamentos?.length ?? 0) === 0 ? (
        <p className="text-xs text-texto-3 py-2">
          Nenhum pagamento registrado ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {pagamentos!.map((p) => (
            <PagamentoLinha
              key={p.id}
              pagamento={p}
              duplicado={!p.cancelado_em && ativosPorComp[p.competencia] > 1}
              aoCancelar={recarregar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PagamentoLinha({
  pagamento,
  duplicado,
  aoCancelar,
}: {
  pagamento: PagamentoRow;
  duplicado: boolean;
  aoCancelar: () => void;
}) {
  const cancelado = Boolean(pagamento.cancelado_em);
  const [cancelarAberto, setCancelarAberto] = useState(false);

  return (
    <div
      className={`rounded-xl border p-3 ${
        cancelado
          ? "border-borda bg-fundo/40 opacity-70"
          : duplicado
            ? "border-aviso/40 bg-aviso-bg/40"
            : "border-borda bg-superficie"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Receipt className="w-4 h-4 text-texto-3 shrink-0" />
        <span
          className={`text-sm font-bold capitalize ${cancelado ? "line-through text-texto-3" : ""}`}
        >
          {competenciaLabel(pagamento.competencia)}
        </span>
        <span
          className={`text-sm font-black tabular-nums ${cancelado ? "line-through text-texto-3" : "text-texto"}`}
        >
          {moeda.format(Number(pagamento.valor) || 0)}
        </span>
        <span className="text-[10px] font-bold uppercase text-texto-3 bg-fundo border border-borda rounded-full px-2 py-0.5">
          {rotuloForma(pagamento.forma_pagamento)}
        </span>
        <span
          className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 border ${
            pagamento.origem === "app"
              ? "bg-info-bg text-info border-info/20"
              : "bg-brand-50 text-brand-700 border-brand-200"
          }`}
        >
          {pagamento.origem === "app" ? "app" : "painel"}
        </span>
        {duplicado && !cancelado && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-aviso bg-aviso-bg border border-aviso/25 rounded-full px-2 py-0.5">
            <AlertTriangle className="w-3 h-3" />
            duplicado
          </span>
        )}
        {cancelado && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-perigo bg-perigo-bg border border-perigo/20 rounded-full px-2 py-0.5">
            <Ban className="w-3 h-3" />
            cancelado
          </span>
        )}

        {!cancelado && (
          <button
            onClick={() => setCancelarAberto(true)}
            className="ml-auto text-xs font-bold text-texto-3 hover:text-perigo transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      <p className="text-[11px] text-texto-3 mt-1">
        Pago em {formatarDataHora(pagamento.pago_em)}
        {pagamento.registrado_por_nome
          ? ` · por ${pagamento.registrado_por_nome}`
          : ""}
        {pagamento.observacao ? ` · ${pagamento.observacao}` : ""}
      </p>

      {cancelado && pagamento.cancelamento_motivo && (
        <p className="text-[11px] text-perigo mt-1">
          Cancelado
          {pagamento.cancelado_por_nome ? ` por ${pagamento.cancelado_por_nome}` : ""}:{" "}
          {pagamento.cancelamento_motivo}
        </p>
      )}

      <AnimatePresence>
        {cancelarAberto && (
          <ModalCancelar
            pagamento={pagamento}
            fechar={() => setCancelarAberto(false)}
            aoCancelar={aoCancelar}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ModalCancelar({
  pagamento,
  fechar,
  aoCancelar,
}: {
  pagamento: PagamentoRow;
  fechar: () => void;
  aoCancelar: () => void;
}) {
  const toast = useToast();
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    if (!motivo.trim()) return;
    setSalvando(true);
    const r = await cancelarPagamento(pagamento.id, motivo.trim());
    setSalvando(false);
    if (r?.ok) {
      toast.sucesso(r.msg);
      fechar();
      aoCancelar();
    } else toast.erro("Não deu certo", r?.msg ?? "Erro inesperado.");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
      onClick={salvando ? undefined : fechar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6 max-h-[85dvh] overflow-y-auto"
      >
        <div className="w-12 h-12 rounded-2xl bg-perigo-bg grid place-items-center mb-4">
          <Ban className="w-6 h-6 text-perigo" />
        </div>
        <h3 className="text-lg font-extrabold">Cancelar pagamento?</h3>
        <p className="text-sm text-texto-2 mt-1.5">
          {competenciaLabel(pagamento.competencia)} ·{" "}
          {moeda.format(Number(pagamento.valor) || 0)}. O registro não some — fica
          marcado como cancelado com o motivo.
        </p>
        <label className="block text-xs font-bold text-texto-2 mt-4 mb-1.5">
          Motivo <span className="text-perigo">*</span>
        </label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          placeholder="Ex: lançado por engano / valor incorreto."
          className="w-full px-3.5 py-2.5 rounded-xl border border-borda bg-superficie text-sm placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 resize-none"
        />
        <div className="flex gap-3 mt-5">
          <button
            onClick={fechar}
            disabled={salvando}
            className="flex-1 h-11 rounded-xl border border-borda text-sm font-bold text-texto-2 hover:bg-fundo transition-colors disabled:opacity-60"
          >
            Voltar
          </button>
          <button
            onClick={confirmar}
            disabled={salvando || !motivo.trim()}
            className="flex-1 h-11 rounded-xl bg-perigo text-white text-sm font-bold hover:brightness-110 inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Cancelar pagamento
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
