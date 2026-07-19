"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  UserPlus,
  Car,
  Lock,
  LockOpen,
  Trash2,
  BadgeCheck,
  Wallet,
  X,
  AlertTriangle,
  Loader2,
  Ban,
  ChevronRight,
  ChevronLeft,
  Plus,
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
import { formatarData } from "@/lib/format-data";
import { useToast } from "@/components/ui/toast";
import { Confirmar } from "@/components/ui/confirmar";
import { ResponsiveTable } from "@/components/ui/responsive-table";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const POPPINS = "'Poppins', sans-serif";

/* ---------- Tokens do protótipo (mesma linguagem visual do painel) ---------- */
const CARD: CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E8EC",
  borderRadius: 16,
  boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
};
const H2: CSSProperties = {
  margin: 0,
  fontSize: 23,
  fontFamily: POPPINS,
  fontWeight: 700,
  letterSpacing: "-.02em",
};
const SUB: CSSProperties = { marginTop: 3, fontSize: 13, color: "#6B7280" };
const TH: CSSProperties = {
  padding: "10px 12px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "#8695A0",
};
const LABEL: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#6B7280",
  marginBottom: 6,
};
const INPUT: CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #E4E8EC",
  background: "#fff",
  fontSize: 14,
  color: "#1F2937",
  outline: "none",
};
const BTN_GREEN: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  height: 40,
  padding: "0 16px",
  borderRadius: 11,
  border: "none",
  background: "linear-gradient(90deg,#16A34A,#22C55E)",
  fontSize: 13,
  fontWeight: 700,
  color: "#fff",
  cursor: "pointer",
  boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)",
};
const BTN_OUTLINE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  height: 38,
  padding: "0 15px",
  borderRadius: 11,
  border: "1px solid #E4E8EC",
  background: "#fff",
  fontSize: 13,
  fontWeight: 700,
  color: "#6B7280",
  cursor: "pointer",
};

const GRADIENTES = [
  "linear-gradient(135deg,#22C55E,#0EA5E9)",
  "linear-gradient(135deg,#F59E0B,#F97316)",
  "linear-gradient(135deg,#EF4444,#F97316)",
  "linear-gradient(135deg,#8B5CF6,#0EA5E9)",
  "linear-gradient(135deg,#0EA5E9,#22C55E)",
  "linear-gradient(135deg,#EC4899,#8B5CF6)",
];
function gradienteDe(nome: string): string {
  const c = nome.trim().toUpperCase().charCodeAt(0) || 0;
  return GRADIENTES[c % GRADIENTES.length];
}

const MESES_CAP = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const MESES_MIN = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
/** 'YYYY-MM-01' → 'Jul 2026'. */
function competenciaCurta(comp: string): string {
  const [y, m] = comp.slice(0, 10).split("-").map(Number);
  return `${MESES_CAP[(m || 1) - 1]} ${y}`;
}
/** 'julho de 2026' — usado no aviso de duplicidade. */
function competenciaLabel(comp: string): string {
  return new Date(`${comp.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}
/** timestamptz → 'mar/2024'. */
function mesAno(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MESES_MIN[d.getMonth()]}/${d.getFullYear()}`;
}

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

type PillCfg = { txt: string; bg: string; border: string; color: string };

function cfgBadge(badge: Badge): PillCfg {
  switch (badge.tipo) {
    case "credenciado":
      return { txt: "Credenciado", bg: "#F3EEFE", border: "#DDD0FB", color: "#8B5CF6" };
    case "em_dia":
      return { txt: "Em dia", bg: "#DCFCE7", border: "#BBF7D0", color: "#16A34A" };
    case "pendente":
      return { txt: "Sem vencimento", bg: "#F1F4F6", border: "#E4E8EC", color: "#6B7280" };
    case "vence":
      return {
        txt:
          badge.dias === 0
            ? "Vence hoje"
            : `Vence em ${badge.dias} ${badge.dias === 1 ? "dia" : "dias"}`,
        bg: "#FEF7E6",
        border: "#FCE3A6",
        color: "#B45309",
      };
    case "atrasado":
      return { txt: textoAtraso(badge.dias), bg: "#FEF1F1", border: "#FBD0D0", color: "#EF4444" };
  }
}

function Pill({
  cfg,
  size = 10,
}: {
  cfg: PillCfg;
  size?: number;
}) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 700,
        textTransform: "uppercase",
        borderRadius: 999,
        padding: size >= 11 ? "3px 9px" : "2px 8px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.txt}
    </span>
  );
}

/* ================================================================= */
/* LISTA                                                             */
/* ================================================================= */

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

  const [fichaId, setFichaId] = useState<string | null>(null);
  const clienteFicha = clientes.find((c) => c.id === fichaId) ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Cabeçalho */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={H2}>Mensalistas</h2>
          <div style={SUB}>
            <b style={{ color: "#1F2937" }}>{patioNome}</b> · {clientes.length}{" "}
            {clientes.length === 1 ? "cliente" : "clientes"} · clique para abrir a
            ficha
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href={`/painel/mensalistas/planos?patio=${patioId}`}
            style={{ ...BTN_OUTLINE, textDecoration: "none" }}
          >
            <BadgeCheck style={{ width: 15, height: 15 }} />
            Planos
          </Link>
          <Link
            href={`/painel/mensalistas/novo?patio=${patioId}`}
            style={{ ...BTN_GREEN, textDecoration: "none" }}
          >
            <UserPlus style={{ width: 15, height: 15 }} />
            Novo cliente
          </Link>
        </div>
      </motion.div>

      {/* Card com as linhas */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        style={{ ...CARD, overflow: "hidden" }}
      >
        {clientes.length === 0 ? (
          <div
            style={{
              padding: "56px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              textAlign: "center",
            }}
          >
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#DCFCE7",
                display: "grid",
                placeItems: "center",
              }}
            >
              <UserPlus style={{ width: 24, height: 24, color: "#16A34A" }} />
            </span>
            <p style={{ margin: 0, fontSize: 13, color: "#8695A0" }}>
              Nenhum cliente neste pátio ainda.
            </p>
            <Link
              href={`/painel/mensalistas/novo?patio=${patioId}`}
              style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}
            >
              Cadastrar o primeiro cliente
            </Link>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {clientes.map((c, i) => {
              const plano = planoDe(c.plano_id);
              const badge = calcularBadge(c, plano, hoje);
              return (
                <LinhaCliente
                  key={c.id}
                  cliente={c}
                  plano={plano}
                  badge={badge}
                  zebra={i % 2 === 1}
                  aoAbrir={() => setFichaId(c.id)}
                />
              );
            })}
          </ul>
        )}
      </motion.div>

      {/* Ficha (modal) */}
      <AnimatePresence>
        {clienteFicha && (
          <FichaModal
            key={clienteFicha.id}
            cliente={clienteFicha}
            plano={planoDe(clienteFicha.plano_id)}
            veiculos={veiculosDe(clienteFicha.id)}
            badge={calcularBadge(clienteFicha, planoDe(clienteFicha.plano_id), hoje)}
            pagas={pagasPorCliente[clienteFicha.id] ?? []}
            hoje={hoje}
            fechar={() => setFichaId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Linha do cliente ---------- */

function LinhaCliente({
  cliente,
  plano,
  badge,
  zebra,
  aoAbrir,
}: {
  cliente: Cliente;
  plano: Plano | undefined;
  badge: Badge;
  zebra: boolean;
  aoAbrir: () => void;
}) {
  const ehCredenciado = plano?.tipo === "credenciado";
  const valor = !ehCredenciado && plano ? moeda.format(plano.valor) : "—";

  return (
    <li
      onClick={aoAbrir}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderTop: "1px solid #EEF1F3",
        background: cliente.bloqueado
          ? "#FEF1F1"
          : zebra
            ? "#FAFBFC"
            : "#fff",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          background: gradienteDe(cliente.nome),
          display: "grid",
          placeItems: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {cliente.nome.charAt(0).toUpperCase()}
      </span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, color: "#1F2937" }}>
            {cliente.nome}
          </span>
          <Pill
            cfg={
              plano
                ? { txt: plano.nome, bg: "#DCFCE7", border: "#BBF7D0", color: "#16A34A" }
                : { txt: "Sem plano", bg: "#F1F4F6", border: "#E4E8EC", color: "#6B7280" }
            }
          />
          <Pill cfg={cfgBadge(badge)} />
          {cliente.bloqueado && (
            <Pill cfg={{ txt: "Bloqueado", bg: "#FEF1F1", border: "#FBD0D0", color: "#EF4444" }} />
          )}
        </div>
      </div>

      <span
        style={{
          fontFamily: POPPINS,
          fontWeight: 700,
          fontSize: 14,
          fontVariantNumeric: "tabular-nums",
          color: valor === "—" ? "#8695A0" : "#1F2937",
        }}
      >
        {valor}
      </span>
      <ChevronRight
        style={{ width: 16, height: 16, color: "#8695A0", flexShrink: 0 }}
      />
    </li>
  );
}

/* ================================================================= */
/* FICHA (modal)                                                     */
/* ================================================================= */

function FichaModal({
  cliente,
  plano,
  veiculos,
  badge,
  pagas,
  hoje,
  fechar,
}: {
  cliente: Cliente;
  plano: Plano | undefined;
  veiculos: Veiculo[];
  badge: Badge;
  pagas: string[];
  hoje: Hoje;
  fechar: () => void;
}) {
  const toast = useToast();
  const [pagamentoAberto, setPagamentoAberto] = useState(false);
  const [pendente, comecar] = useTransition();

  // Histórico carregado uma vez e compartilhado (card navy + tabela).
  const [pagamentos, setPagamentos] = useState<PagamentoRow[] | null>(null);
  const [carregando, carregar] = useTransition();

  const recarregar = () =>
    carregar(async () => setPagamentos(await listarPagamentos(cliente.id)));

  useEffect(() => {
    carregar(async () => setPagamentos(await listarPagamentos(cliente.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id]);

  const ehCredenciado = plano?.tipo === "credenciado";
  const ativos = (pagamentos ?? []).filter((p) => !p.cancelado_em);
  const totalPago = ativos.reduce((s, p) => s + (Number(p.valor) || 0), 0);

  async function alternar() {
    const r = await alternarBloqueio(cliente.id, cliente.bloqueado);
    if (r?.ok) (cliente.bloqueado ? toast.sucesso : toast.info)(r.msg);
    else toast.erro(r?.msg ?? "Erro inesperado.");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
      onClick={fechar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 940,
          maxHeight: "90dvh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 30px 80px -20px rgba(11,18,32,.5)",
          padding: 24,
        }}
      >
        {/* Header da ficha */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                background: gradienteDe(cliente.nome),
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontFamily: POPPINS,
                fontWeight: 700,
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {cliente.nome.charAt(0).toUpperCase()}
            </span>
            <div>
              <button
                onClick={fechar}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#6B7280",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ChevronLeft style={{ width: 13, height: 13 }} />
                Mensalistas
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 2,
                  flexWrap: "wrap",
                }}
              >
                <h2 style={H2}>{cliente.nome}</h2>
                <Pill cfg={cfgBadge(badge)} size={11} />
                {cliente.bloqueado && (
                  <Pill
                    cfg={{ txt: "Bloqueado", bg: "#FEF1F1", border: "#FBD0D0", color: "#EF4444" }}
                    size={11}
                  />
                )}
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: "#6B7280" }}>
                {plano ? plano.nome : "Sem plano"}
                {!ehCredenciado && plano ? (
                  <>
                    {" · "}
                    <b style={{ color: "#1F2937" }}>{moeda.format(plano.valor)}</b>
                    /mês
                  </>
                ) : null}
                {cliente.dia_vencimento ? ` · vence dia ${cliente.dia_vencimento}` : ""}
                {cliente.criado_em ? ` · cliente desde ${mesAno(cliente.criado_em)}` : ""}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => comecar(alternar)}
              disabled={pendente}
              style={{
                ...BTN_OUTLINE,
                color: cliente.bloqueado ? "#EF4444" : "#6B7280",
                opacity: pendente ? 0.6 : 1,
              }}
            >
              {cliente.bloqueado ? (
                <Lock style={{ width: 15, height: 15 }} />
              ) : (
                <LockOpen style={{ width: 15, height: 15 }} />
              )}
              {cliente.bloqueado ? "Desbloquear" : "Bloquear"}
            </button>
            {!ehCredenciado && (
              <button
                onClick={() => setPagamentoAberto(true)}
                style={{ ...BTN_GREEN, height: 38 }}
              >
                <Wallet style={{ width: 15, height: 15 }} />
                Registrar pagamento
              </button>
            )}
            <button
              onClick={fechar}
              aria-label="Fechar"
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                border: "1px solid #E4E8EC",
                background: "#fff",
                color: "#8695A0",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Corpo: 2 colunas (empilha no mobile) */}
        <div
          className="mensalista-ficha-grid"
          style={{ marginTop: 18, display: "grid", gap: 14, alignItems: "start" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Próxima cobrança (navy) */}
            <ProximaCobranca
              cliente={cliente}
              plano={plano}
              badge={badge}
              hoje={hoje}
              totalPago={totalPago}
              mesesPagos={ativos.length}
              carregando={carregando && pagamentos === null}
            />

            {/* Placas */}
            <PlacasCard cliente={cliente} veiculos={veiculos} />

            {/* Vencimento (só para quem cobra) */}
            {!ehCredenciado && <DiaVencimentoEditor cliente={cliente} />}
          </div>

          {/* Histórico de pagamentos */}
          {ehCredenciado ? (
            <div style={{ ...CARD, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1F2937" }}>
                Histórico de pagamentos
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "#8695A0" }}>
                Cliente credenciado (isento) — sem cobrança mensal.
              </p>
            </div>
          ) : (
            <HistoricoPagamentos
              pagamentos={pagamentos}
              carregando={carregando && pagamentos === null}
              aoCancelar={recarregar}
            />
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {pagamentoAberto && (
          <ModalPagamento
            cliente={cliente}
            plano={plano}
            pagas={pagas}
            hoje={hoje}
            fechar={() => setPagamentoAberto(false)}
            aoRegistrar={recarregar}
          />
        )}
      </AnimatePresence>

      {/* Empilhamento responsivo do corpo da ficha */}
      <style>{`
        .mensalista-ficha-grid { grid-template-columns: 1fr; }
        @media (min-width: 860px) {
          .mensalista-ficha-grid { grid-template-columns: 1fr 1.4fr; }
        }
      `}</style>
    </motion.div>
  );
}

/* ---------- Próxima cobrança (card navy) ---------- */

function ProximaCobranca({
  cliente,
  plano,
  badge,
  hoje,
  totalPago,
  mesesPagos,
  carregando,
}: {
  cliente: Cliente;
  plano: Plano | undefined;
  badge: Badge;
  hoje: Hoje;
  totalPago: number;
  mesesPagos: number;
  carregando: boolean;
}) {
  const hojeYmd = `${hoje.ano}-${pad2(hoje.mes)}-${pad2(hoje.dia)}`;
  const dias = cliente.vencimento
    ? diasAteVencimento(cliente.vencimento, hojeYmd)
    : null;

  const valorTxt = plano ? moeda.format(plano.valor) : "—";

  const venceTxt = (() => {
    if (!cliente.vencimento) return "sem vencimento definido";
    const base = `vence em ${formatarVencimentoBR(cliente.vencimento)}`;
    if (dias === null) return base;
    if (dias > 0) return `${base} · ${dias} ${dias === 1 ? "dia" : "dias"}`;
    if (dias === 0) return `${base} · hoje`;
    return `${base} · ${textoAtraso(-dias).toLowerCase()}`;
  })();

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 20,
        background: "linear-gradient(125deg,#0B1220,#14203A 55%,#1C2C48)",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 20px 50px -20px rgba(20,29,40,.5)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -40,
          right: 30,
          width: 170,
          height: 170,
          borderRadius: 999,
          background: "rgba(34,197,94,.16)",
          filter: "blur(46px)",
        }}
      />
      <div
        style={{
          position: "relative",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,.55)",
        }}
      >
        Próxima cobrança
      </div>
      <div
        style={{
          position: "relative",
          marginTop: 8,
          fontSize: 32,
          fontFamily: POPPINS,
          fontWeight: 700,
          letterSpacing: "-.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {valorTxt}
      </div>
      <div
        style={{
          position: "relative",
          marginTop: 6,
          fontSize: 13,
          color: "rgba(255,255,255,.65)",
        }}
      >
        {venceTxt}
      </div>
      {plano && (
        <div
          style={{
            position: "relative",
            marginTop: 14,
            display: "flex",
            gap: 14,
            fontSize: 12,
          }}
        >
          <span style={{ color: "rgba(255,255,255,.6)" }}>
            Total pago:{" "}
            <b style={{ color: "#fff" }}>
              {carregando ? "…" : moeda.format(totalPago)}
            </b>
          </span>
          <span style={{ color: "rgba(255,255,255,.6)" }}>
            {carregando ? "…" : `${mesesPagos} ${mesesPagos === 1 ? "mês" : "meses"}`}
          </span>
        </div>
      )}
      {/* mantém referência ao status para leitores de tela / consistência */}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {cfgBadge(badge).txt}
      </span>
    </div>
  );
}

/* ---------- Placas ---------- */

function PlacasCard({
  cliente,
  veiculos,
}: {
  cliente: Cliente;
  veiculos: Veiculo[];
}) {
  return (
    <div style={{ ...CARD, padding: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", marginBottom: 14 }}>
        Placas ( {veiculos.length} )
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {veiculos.map((v) => (
          <VeiculoLinha key={v.id} veiculo={v} />
        ))}
        {veiculos.length === 0 && (
          <p style={{ margin: 0, fontSize: 12, color: "#8695A0" }}>
            Nenhuma placa cadastrada.
          </p>
        )}
        <NovoVeiculoForm cliente={cliente} />
      </div>
    </div>
  );
}

function VeiculoLinha({ veiculo }: { veiculo: Veiculo }) {
  const toast = useToast();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 12,
        background: "#FAFBFC",
        border: "1px solid #EEF1F3",
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: "#DCFCE7",
          color: "#16A34A",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Car style={{ width: 15, height: 15 }} />
      </span>
      <span
        className="mono"
        style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".12em", color: "#1F2937" }}
      >
        {veiculo.placa}
      </span>
      {veiculo.descricao && (
        <span style={{ fontSize: 12, color: "#8695A0" }}>{veiculo.descricao}</span>
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
            style={{
              marginLeft: "auto",
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "#8695A0",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Trash2 style={{ width: 15, height: 15 }} />
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
    <form
      ref={formRef}
      action={agir}
      style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 2 }}
    >
      <input type="hidden" name="cliente_id" value={cliente.id} />
      <input type="hidden" name="patio_id" value={cliente.patio_id} />
      <input
        name="placa"
        required
        placeholder="ABC1D23"
        maxLength={7}
        className="mono"
        style={{
          width: 120,
          height: 38,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid #E4E8EC",
          background: "#fff",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "#1F2937",
          outline: "none",
        }}
      />
      <input
        name="descricao"
        placeholder="descrição (opcional)"
        style={{
          flex: 1,
          minWidth: 140,
          maxWidth: 220,
          height: 38,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid #E4E8EC",
          background: "#fff",
          fontSize: 13,
          color: "#1F2937",
          outline: "none",
        }}
      />
      <button
        disabled={pendente}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          height: 38,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid #BBF7D0",
          background: "#DCFCE7",
          color: "#16A34A",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          opacity: pendente ? 0.6 : 1,
        }}
      >
        <Plus style={{ width: 14, height: 14 }} />
        Placa
      </button>
    </form>
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
    <div style={{ ...CARD, padding: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", marginBottom: 12 }}>
        Vencimento
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>
          Dia fixo
        </label>
        <input
          type="number"
          min={1}
          max={28}
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          placeholder="—"
          style={{
            width: 76,
            height: 38,
            padding: "0 10px",
            borderRadius: 10,
            border: "1px solid #E4E8EC",
            background: "#fff",
            fontSize: 14,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: "#1F2937",
            outline: "none",
          }}
        />
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 38,
            padding: "0 14px",
            borderRadius: 10,
            border: "1px solid #BBF7D0",
            background: "#DCFCE7",
            color: "#16A34A",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            opacity: salvando ? 0.6 : 1,
          }}
        >
          {salvando && <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />}
          Salvar
        </button>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: "#8695A0" }}>
        {cliente.vencimento
          ? `Próximo: ${formatarVencimentoBR(cliente.vencimento)}`
          : "sem vencimento"}
        {dia.trim() === "" ? " · ciclo de 30 dias" : ""}
      </div>
    </div>
  );
}

/* ---------- Histórico de pagamentos (tabela) ---------- */

function HistoricoPagamentos({
  pagamentos,
  carregando,
  aoCancelar,
}: {
  pagamentos: PagamentoRow[] | null;
  carregando: boolean;
  aoCancelar: () => void;
}) {
  const ativosPorComp: Record<string, number> = {};
  (pagamentos ?? [])
    .filter((p) => !p.cancelado_em)
    .forEach((p) => {
      ativosPorComp[p.competencia] = (ativosPorComp[p.competencia] ?? 0) + 1;
    });

  const ativas = (pagamentos ?? []).filter((p) => !p.cancelado_em).length;
  const cancelados = (pagamentos ?? []).filter((p) => p.cancelado_em).length;

  const [cancelar, setCancelar] = useState<PagamentoRow | null>(null);

  return (
    <div style={{ ...CARD, overflow: "hidden" }}>
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #E4E8EC",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1F2937" }}>
          Histórico de pagamentos
        </h3>
        {(pagamentos?.length ?? 0) > 0 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#16A34A",
              background: "#DCFCE7",
              border: "1px solid #BBF7D0",
              borderRadius: 999,
              padding: "3px 10px",
              whiteSpace: "nowrap",
            }}
          >
            {ativas} {ativas === 1 ? "paga" : "pagas"}
            {cancelados > 0 ? ` · ${cancelados} cancelado${cancelados === 1 ? "" : "s"}` : ""}
          </span>
        )}
      </div>

      {carregando ? (
        <div
          style={{
            padding: "28px 18px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "#8695A0",
          }}
        >
          <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
          Carregando…
        </div>
      ) : (pagamentos?.length ?? 0) === 0 ? (
        <p style={{ margin: 0, padding: "24px 18px", fontSize: 13, color: "#8695A0" }}>
          Nenhum pagamento registrado ainda.
        </p>
      ) : (
        <ResponsiveTable>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#FAFBFC" }}>
                <th style={{ ...TH, padding: "10px 18px" }}>Competência</th>
                <th style={TH}>Pago em</th>
                <th style={TH}>Forma</th>
                <th style={{ ...TH, textAlign: "right" }}>Valor</th>
                <th style={{ ...TH, padding: "10px 18px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos!.map((p, i) => (
                <PagamentoLinha
                  key={p.id}
                  pagamento={p}
                  zebra={i % 2 === 1}
                  duplicado={!p.cancelado_em && ativosPorComp[p.competencia] > 1}
                  aoPedirCancelar={() => setCancelar(p)}
                />
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      )}

      <AnimatePresence>
        {cancelar && (
          <ModalCancelar
            pagamento={cancelar}
            fechar={() => setCancelar(null)}
            aoCancelar={aoCancelar}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PagamentoLinha({
  pagamento,
  zebra,
  duplicado,
  aoPedirCancelar,
}: {
  pagamento: PagamentoRow;
  zebra: boolean;
  duplicado: boolean;
  aoPedirCancelar: () => void;
}) {
  const cancelado = Boolean(pagamento.cancelado_em);

  const detalhe = [
    pagamento.registrado_por_nome ? `por ${pagamento.registrado_por_nome}` : "",
    pagamento.observacao ?? "",
    cancelado && pagamento.cancelamento_motivo
      ? `Cancelado${pagamento.cancelado_por_nome ? ` por ${pagamento.cancelado_por_nome}` : ""}: ${pagamento.cancelamento_motivo}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const strike: CSSProperties = cancelado
    ? { textDecoration: "line-through", color: "#8695A0" }
    : {};

  return (
    <tr
      title={detalhe || undefined}
      style={{
        borderTop: "1px solid #EEF1F3",
        background: zebra ? "#FAFBFC" : "#fff",
      }}
    >
      <td style={{ padding: "12px 18px", fontWeight: 600, color: "#1F2937", ...strike }}>
        {competenciaCurta(pagamento.competencia)}
        <span
          style={{
            marginLeft: 6,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            color: pagamento.origem === "app" ? "#0EA5E9" : "#6B7280",
          }}
        >
          {pagamento.origem === "app" ? "app" : "painel"}
        </span>
      </td>
      <td className="mono" style={{ padding: "12px 12px", color: "#6B7280", whiteSpace: "nowrap" }}>
        {formatarData(pagamento.pago_em)}
      </td>
      <td style={{ padding: "12px 12px", color: "#6B7280" }}>
        {rotuloForma(pagamento.forma_pagamento)}
      </td>
      <td
        className="mono"
        style={{ padding: "12px 12px", textAlign: "right", fontWeight: 800, ...strike }}
      >
        {moeda.format(Number(pagamento.valor) || 0)}
      </td>
      <td style={{ padding: "12px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {cancelado ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                color: "#EF4444",
                background: "#FEF1F1",
                border: "1px solid #FBD0D0",
                borderRadius: 999,
                padding: "3px 10px",
              }}
            >
              <Ban style={{ width: 12, height: 12 }} />
              cancelado
            </span>
          ) : duplicado ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                color: "#B45309",
                background: "#FEF7E6",
                border: "1px solid #FCE3A6",
                borderRadius: 999,
                padding: "3px 10px",
              }}
            >
              <AlertTriangle style={{ width: 12, height: 12 }} />
              duplicado
            </span>
          ) : (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#16A34A",
                background: "#DCFCE7",
                border: "1px solid #BBF7D0",
                borderRadius: 999,
                padding: "3px 10px",
              }}
            >
              paga
            </span>
          )}
          {!cancelado && (
            <button
              onClick={aoPedirCancelar}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 12,
                fontWeight: 700,
                color: "#8695A0",
                cursor: "pointer",
                padding: 0,
              }}
            >
              cancelar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ---------- Modal: registrar pagamento ---------- */

function ModalPagamento({
  cliente,
  plano,
  pagas,
  hoje,
  fechar,
  aoRegistrar,
}: {
  cliente: Cliente;
  plano: Plano | undefined;
  pagas: string[];
  hoje: Hoje;
  fechar: () => void;
  aoRegistrar: () => void;
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
      aoRegistrar();
      router.refresh(); // atualiza o badge para EM DIA sem reload manual
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
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "85dvh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 30px 80px -20px rgba(11,18,32,.5)",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#1F2937",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Wallet style={{ width: 18, height: 18, color: "#16A34A" }} />
            Registrar pagamento
          </h3>
          <button
            onClick={fechar}
            disabled={salvando}
            aria-label="Fechar"
            style={{
              border: "none",
              background: "transparent",
              color: "#8695A0",
              cursor: "pointer",
              opacity: salvando ? 0.4 : 1,
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <p style={{ margin: "0 0 18px", fontSize: 12, color: "#6B7280" }}>
          <b style={{ color: "#1F2937" }}>{cliente.nome}</b>
          {plano ? ` · plano ${plano.nome}` : ""}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={LABEL}>Competência</label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              style={INPUT}
            />
          </div>
          <div>
            <label style={LABEL}>Valor (R$)</label>
            <input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              style={{ ...INPUT, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={LABEL}>Forma de pagamento</label>
          <select
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            style={{ ...INPUT, cursor: "pointer" }}
          >
            {FORMAS.map((f) => (
              <option key={f.v} value={f.v}>
                {f.l}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={LABEL}>Observação (opcional)</label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={2}
            placeholder="Ex: pagamento parcial, desconto combinado…"
            style={{
              ...INPUT,
              height: "auto",
              padding: "10px 14px",
              resize: "none",
            }}
          />
        </div>

        {jaExiste && (
          <div
            style={{
              marginTop: 14,
              borderRadius: 12,
              border: "1px solid #FCE3A6",
              background: "#FEF7E6",
              padding: "12px 14px",
              display: "flex",
              gap: 8,
            }}
          >
            <AlertTriangle style={{ width: 16, height: 16, color: "#B45309", flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: "#B45309", fontWeight: 600 }}>
              Já existe um pagamento ativo para {competenciaLabel(competencia)}. Você
              pode registrar outro (a duplicidade fica visível no histórico).
            </p>
          </div>
        )}

        <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={fechar}
            disabled={salvando}
            style={{ ...BTN_OUTLINE, height: 44, opacity: salvando ? 0.6 : 1 }}
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={salvando || valorNum < 0}
            style={{ ...BTN_GREEN, height: 44, opacity: salvando || valorNum < 0 ? 0.6 : 1 }}
          >
            {salvando && <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />}
            Registrar {moeda.format(valorNum)}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Modal: cancelar pagamento ---------- */

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
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
      onClick={salvando ? undefined : fechar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 400,
          maxHeight: "85dvh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 30px 80px -20px rgba(11,18,32,.5)",
          padding: 24,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "#FEF1F1",
            display: "grid",
            placeItems: "center",
            marginBottom: 16,
          }}
        >
          <Ban style={{ width: 24, height: 24, color: "#EF4444" }} />
        </div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1F2937" }}>
          Cancelar pagamento?
        </h3>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6B7280" }}>
          {competenciaCurta(pagamento.competencia)} ·{" "}
          {moeda.format(Number(pagamento.valor) || 0)}. O registro não some — fica
          marcado como cancelado com o motivo.
        </p>
        <label style={{ ...LABEL, marginTop: 16 }}>
          Motivo <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          placeholder="Ex: lançado por engano / valor incorreto."
          style={{ ...INPUT, height: "auto", padding: "10px 14px", resize: "none" }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            onClick={fechar}
            disabled={salvando}
            style={{ ...BTN_OUTLINE, height: 44, flex: 1, opacity: salvando ? 0.6 : 1 }}
          >
            Voltar
          </button>
          <button
            onClick={confirmar}
            disabled={salvando || !motivo.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              height: 44,
              flex: 1,
              borderRadius: 11,
              border: "none",
              background: "#EF4444",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              opacity: salvando || !motivo.trim() ? 0.6 : 1,
            }}
          >
            {salvando && <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />}
            Cancelar pagamento
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
