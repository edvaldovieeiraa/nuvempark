"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  UserPlus,
  Car,
  Lock,
  LockOpen,
  Trash2,
  ChevronDown,
  BadgeCheck,
} from "lucide-react";
import {
  alternarBloqueio,
  adicionarVeiculo,
  removerVeiculo,
  type Resultado,
} from "@/app/painel/mensalistas/actions";
import { useToast } from "@/components/ui/toast";
import { Confirmar } from "@/components/ui/confirmar";

type Plano = { id: string; nome: string };
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
  vagas: number;
  bloqueado: boolean;
  ativo: boolean;
};

export function MensalistasClient({
  patioId,
  patioNome,
  planos,
  clientes,
  veiculos,
}: {
  patioId: string;
  patioNome: string;
  planos: Plano[];
  clientes: Cliente[];
  veiculos: Veiculo[];
}) {
  const nomePlano = (id: string | null) =>
    planos.find((p) => p.id === id)?.nome ?? "sem plano";
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
              {clientes.map((c) => (
                <LinhaCliente
                  key={c.id}
                  cliente={c}
                  veiculos={veiculosDe(c.id)}
                  nomePlano={nomePlano(c.plano_id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </motion.section>
    </div>
  );
}

/* ---------- Linha do cliente (expande p/ veículos) ---------- */

function LinhaCliente({
  cliente,
  veiculos,
  nomePlano,
}: {
  cliente: Cliente;
  veiculos: Veiculo[];
  nomePlano: string;
}) {
  const toast = useToast();
  const [expandido, setExpandido] = useState(false);
  const [pendente, comecar] = useTransition();

  async function alternar() {
    const r = await alternarBloqueio(cliente.id, cliente.bloqueado);
    if (r?.ok) (cliente.bloqueado ? toast.sucesso : toast.info)(r.msg);
    else toast.erro(r?.msg ?? "Erro inesperado.");
  }

  const vencido =
    cliente.vencimento && new Date(cliente.vencimento) < new Date();

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cliente.bloqueado ? "bg-perigo-bg/40" : ""}
    >
      <div className="px-5 py-3.5 flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white text-xs font-black shrink-0">
          {cliente.nome.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm flex items-center gap-2 flex-wrap">
            {cliente.nome}
            <span className="text-[10px] font-bold uppercase text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-2 py-0.5">
              {nomePlano}
            </span>
            {cliente.bloqueado && (
              <span className="text-[10px] font-bold uppercase text-perigo bg-perigo-bg border border-perigo/20 rounded-full px-2 py-0.5">
                bloqueado
              </span>
            )}
            {vencido && !cliente.bloqueado && (
              <span className="text-[10px] font-bold uppercase text-aviso bg-aviso-bg border border-aviso/25 rounded-full px-2 py-0.5">
                vencido
              </span>
            )}
          </p>
          <p className="text-xs text-texto-3">
            {cliente.vencimento
              ? `Vence ${new Date(cliente.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}`
              : "Sem vencimento"}
            {` · ${veiculos.length} ${veiculos.length === 1 ? "placa" : "placas"}`}
          </p>
        </div>

        <button
          onClick={() => comecar(alternar)}
          disabled={pendente}
          title={cliente.bloqueado ? "Desbloquear" : "Bloquear"}
          aria-label={cliente.bloqueado ? "Desbloquear cliente" : "Bloquear cliente"}
          className={`w-8 h-8 rounded-lg grid place-items-center transition-colors ${
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
          aria-label="Ver veículos"
          className="w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-brand-700 hover:bg-brand-50 transition-colors"
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
            <div className="px-5 pb-4 pl-[68px] space-y-2">
              {veiculos.map((v) => (
                <VeiculoLinha key={v.id} veiculo={v} />
              ))}
              <NovoVeiculoForm cliente={cliente} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
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
            className="w-6 h-6 rounded grid place-items-center text-texto-3 hover:text-perigo hover:bg-perigo-bg transition-colors"
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
