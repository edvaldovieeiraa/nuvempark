"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Bike,
  Car,
  Check,
  Layers,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  criarPlano,
  desativarPlano,
  atualizarValorPlano,
  type Resultado,
} from "@/app/painel/mensalistas/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input, Select } from "@/components/ui/campos";
import { Confirmar } from "@/components/ui/confirmar";

type Plano = {
  id: string;
  nome: string;
  tipo: string;
  valor: number;
  ativo: boolean;
};

const POPPINS = "'Poppins',sans-serif";

/** Estilo (ícone + cores) escolhido pelo tipo/nome real do plano. */
function estiloPlano(p: Plano): { bg: string; cor: string; Icone: LucideIcon } {
  const n = p.nome.toLowerCase();
  if (p.tipo === "credenciado")
    return { bg: "#F3EEFE", cor: "#8B5CF6", Icone: BadgeCheck };
  if (n.includes("moto")) return { bg: "#FFF3E8", cor: "#F97316", Icone: Bike };
  if (n.includes("trimestr") || n.includes("trimest"))
    return { bg: "#EEF4FF", cor: "#0EA5E9", Icone: Layers };
  return { bg: "#DCFCE7", cor: "#16A34A", Icone: Car };
}

/** Linhas descritivas do plano — derivadas do comportamento real no sistema. */
function beneficios(p: Plano): string[] {
  if (p.tipo === "credenciado")
    return ["Convênio comercial", "Livre passagem no app", "Não cobra estadia"];
  return [
    "Livre passagem no app",
    "Aparece no app do cliente",
    "Cobrança mensal recorrente",
  ];
}

/** 155 → "155" · 1550 → "1.550" · 99,9 → "99,90". */
function formatarValor(v: number): string {
  return Number.isInteger(v)
    ? v.toLocaleString("pt-BR")
    : v.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

const CARD: React.CSSProperties = {
  borderRadius: 16,
  background: "#fff",
  border: "1px solid #E4E8EC",
  boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

export function PlanosClient({
  patioId,
  voltarHref,
  planos,
  qtdClientesPorPlano,
}: {
  patioId: string;
  patioNome: string;
  voltarHref: string;
  planos: Plano[];
  qtdClientesPorPlano: Record<string, number>;
}) {
  const [novoAberto, setNovoAberto] = useState(false);
  const ativos = planos.filter((p) => p.ativo);
  const nAssinantes = ativos.reduce(
    (s, p) => s + (qtdClientesPorPlano[p.id] ?? 0),
    0,
  );

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
          <Link
            href={voltarHref}
            style={{
              cursor: "pointer",
              fontSize: 12,
              color: "#6B7280",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <ArrowLeft style={{ width: 13, height: 13 }} />
            Mensalistas
          </Link>
          <h2
            style={{
              margin: "2px 0 0",
              fontSize: 23,
              fontFamily: POPPINS,
              fontWeight: 700,
              letterSpacing: "-.02em",
              color: "#1F2937",
            }}
          >
            Planos
          </h2>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
            {ativos.length} {ativos.length === 1 ? "plano" : "planos"} ·{" "}
            {nAssinantes} assinantes ativos
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setNovoAberto(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
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
          }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          Novo plano
        </motion.button>
      </motion.div>

      {/* Grade de planos */}
      {ativos.length === 0 ? (
        <div
          style={{
            ...CARD,
            alignItems: "center",
            textAlign: "center",
            padding: "48px 20px",
            gap: 12,
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "#DCFCE7",
              color: "#16A34A",
              display: "grid",
              placeItems: "center",
            }}
          >
            <BadgeCheck style={{ width: 24, height: 24 }} />
          </span>
          <p style={{ fontSize: 14, color: "#6B7280" }}>
            Nenhum plano ainda — crie o primeiro.
          </p>
          <button
            onClick={() => setNovoAberto(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
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
            }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Novo plano
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          <AnimatePresence initial={false}>
            {ativos.map((p) => {
              const { bg, cor, Icone } = estiloPlano(p);
              const qtd = qtdClientesPorPlano[p.id] ?? 0;
              const credenciado = p.tipo === "credenciado";
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  style={CARD}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 9 }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: bg,
                        color: cor,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icone style={{ width: 17, height: 17 }} />
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#1F2937",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {p.nome}
                    </span>
                    <BotaoDesativarPlano plano={p} qtdClientes={qtd} />
                  </div>

                  <ValorPlano plano={p} />

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      fontSize: 12,
                      color: "#6B7280",
                    }}
                  >
                    {beneficios(p).map((b) => (
                      <span key={b}>· {b}</span>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: 12,
                      borderTop: "1px solid #EEF1F3",
                      fontSize: 12,
                      color: "#6B7280",
                    }}
                  >
                    <b
                      style={{
                        color: "#16A34A",
                        fontFamily: POPPINS,
                        fontSize: 15,
                      }}
                    >
                      {qtd}
                    </b>{" "}
                    {credenciado
                      ? qtd === 1
                        ? "convênio"
                        : "convênios"
                      : qtd === 1
                        ? "assinante"
                        : "assinantes"}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <NovoPlanoModal
        patioId={patioId}
        aberto={novoAberto}
        aoFechar={() => setNovoAberto(false)}
      />
    </div>
  );
}

/** Valor mensal do plano (grande), com edição inline. Credenciado é isento. */
function ValorPlano({ plano }: { plano: Plano }) {
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(plano.valor ?? 0));
  const [salvando, comecar] = useTransition();
  const credenciado = plano.tipo === "credenciado";

  function salvar() {
    const n = Number(valor.replace(",", ".")) || 0;
    comecar(async () => {
      const r = await atualizarValorPlano(plano.id, n);
      if (r?.ok) {
        toast.sucesso(r.msg);
        setEditando(false);
      } else toast.erro(r?.msg ?? "Erro inesperado.");
    });
  }

  const precoGrande: React.CSSProperties = {
    fontSize: 26,
    fontFamily: POPPINS,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    color: "#1F2937",
  };

  if (credenciado) {
    return (
      <div>
        <span style={precoGrande}>Isento</span>
      </div>
    );
  }

  if (!editando) {
    const v = Number(plano.valor) || 0;
    return (
      <button
        onClick={() => {
          setValor(String(plano.valor ?? 0));
          setEditando(true);
        }}
        title="Editar valor mensal"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          textAlign: "left",
          display: "inline-flex",
          alignItems: "baseline",
          gap: 3,
        }}
      >
        <span style={precoGrande}>
          {v > 0 ? `R$ ${formatarValor(v)}` : "Isento"}
        </span>
        {v > 0 && <span style={{ fontSize: 12, color: "#8695A0" }}>/mês</span>}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 14, color: "#8695A0" }}>R$</span>
      <input
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") salvar();
          if (e.key === "Escape") setEditando(false);
        }}
        inputMode="decimal"
        style={{
          width: 96,
          height: 36,
          padding: "0 10px",
          borderRadius: 10,
          border: "1px solid #16A34A",
          background: "#fff",
          fontFamily: POPPINS,
          fontWeight: 700,
          fontSize: 16,
          fontVariantNumeric: "tabular-nums",
          color: "#1F2937",
          outline: "none",
        }}
      />
      <button
        onClick={salvar}
        disabled={salvando}
        aria-label="Salvar valor"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "none",
          display: "grid",
          placeItems: "center",
          background: "#DCFCE7",
          color: "#16A34A",
          cursor: "pointer",
          opacity: salvando ? 0.6 : 1,
        }}
      >
        <Check style={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
}

function BotaoDesativarPlano({
  plano,
  qtdClientes,
}: {
  plano: Plano;
  qtdClientes: number;
}) {
  const toast = useToast();
  return (
    <Confirmar
      titulo="Desativar plano?"
      descricao={
        qtdClientes > 0
          ? `${qtdClientes} ${qtdClientes === 1 ? "cliente usa" : "clientes usam"} o plano "${plano.nome}". Eles continuam cadastrados, mas sem o benefício de livre passagem.`
          : `O plano "${plano.nome}" some das opções do app e do cadastro de clientes.`
      }
      rotuloConfirmar="Desativar"
      aoConfirmar={async () => {
        const r = await desativarPlano(plano.id);
        if (r?.ok) toast.sucesso(r.msg);
        else toast.erro(r?.msg ?? "Erro inesperado.");
      }}
    >
      {(abrir) => (
        <button
          onClick={abrir}
          aria-label={`Desativar plano ${plano.nome}`}
          className="grid place-items-center shrink-0 text-[#8695A0] hover:text-perigo hover:bg-perigo-bg transition-colors"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "none",
            background: "none",
            cursor: "pointer",
          }}
        >
          <X style={{ width: 15, height: 15 }} />
        </button>
      )}
    </Confirmar>
  );
}

/** Modal de criação de plano — mantém a server action criarPlano. */
function NovoPlanoModal({
  patioId,
  aberto,
  aoFechar,
}: {
  patioId: string;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    criarPlano,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso("Plano criado!", estado.msg);
      formRef.current?.reset();
      aoFechar();
    } else toast.erro("Não deu certo", estado.msg);
  }, [estado, toast, aoFechar]);

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
          onClick={() => !pendente && aoFechar()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "#DCFCE7",
                  color: "#16A34A",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Plus style={{ width: 17, height: 17 }} />
              </span>
              <h3
                style={{
                  flex: 1,
                  fontSize: 18,
                  fontFamily: POPPINS,
                  fontWeight: 700,
                  color: "#1F2937",
                }}
              >
                Novo plano
              </h3>
              <button
                type="button"
                onClick={() => !pendente && aoFechar()}
                aria-label="Fechar"
                className="w-8 h-8 rounded-lg grid place-items-center text-[#8695A0] hover:text-perigo hover:bg-perigo-bg transition-colors"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <form
              ref={formRef}
              action={agir}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="patio_id" value={patioId} />
              <Campo label="Nome do plano">
                <Input name="nome" required placeholder="Mensalista Diurno" />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Tipo">
                  <Select name="tipo">
                    <option value="mensalista">mensalista</option>
                    <option value="credenciado">credenciado</option>
                  </Select>
                </Campo>
                <Campo label="Valor mensal (R$)">
                  <Input
                    name="valor"
                    inputMode="decimal"
                    placeholder="0,00"
                    defaultValue="0"
                  />
                </Campo>
              </div>
              <Botao carregando={pendente} className="w-full mt-1">
                <Plus className="w-4 h-4" />
                Criar plano
              </Botao>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
