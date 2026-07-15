"use client";

import { useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Users, UserPlus, Power } from "lucide-react";
import { alternarAtivo } from "@/app/painel/operadores/actions";
import { useToast } from "@/components/ui/toast";
import { Confirmar } from "@/components/ui/confirmar";
import { ResponsiveTable } from "@/components/ui/responsive-table";

type Operador = {
  id: string;
  nome: string;
  usuario: string;
  ativo: boolean;
};

export function OperadoresClient({
  operadores,
  patioId,
  patioNome,
}: {
  operadores: Operador[];
  patioId: string;
  patioNome: string;
}) {
  return (
    <div className="space-y-6 max-w-5xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Operadores</h1>
          <p className="text-sm text-texto-2">
            Contas do <b className="text-texto">{patioNome}</b> que acessam o
            app · {operadores.filter((o) => o.ativo).length}{" "}
            {operadores.filter((o) => o.ativo).length === 1
              ? "ativo"
              : "ativos"}
          </p>
        </div>
        <Link
          href={`/painel/operadores/novo?patio=${patioId}`}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-sm shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Novo operador
        </Link>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        {operadores.length === 0 ? (
          <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
            <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
              <Users className="w-6 h-6 text-brand-600" />
            </span>
            <p className="text-sm text-texto-3">
              Nenhum operador neste pátio ainda.
            </p>
            <Link
              href={`/painel/operadores/novo?patio=${patioId}`}
              className="text-sm font-bold text-brand-700 hover:underline"
            >
              Criar o primeiro operador
            </Link>
          </div>
        ) : (
          <ResponsiveTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                  <th className="px-5 py-3 font-bold">Nome</th>
                  <th className="px-5 py-3 font-bold hidden md:table-cell">Usuário</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {operadores.map((o, i) => (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`border-t border-borda hover:bg-brand-50/40 transition-colors ${
                        o.ativo ? "" : "opacity-55"
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white text-xs font-black shrink-0">
                            {o.nome.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-bold">{o.nome}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="font-mono text-xs font-bold bg-fundo border border-borda rounded-md px-2 py-1 tracking-wider whitespace-nowrap">
                          {o.usuario}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                            o.ativo
                              ? "bg-brand-50 text-brand-700 border-brand-200"
                              : "bg-perigo-bg text-perigo border-perigo/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${o.ativo ? "bg-brand-500" : "bg-perigo"}`}
                          />
                          {o.ativo ? "ativo" : "inativo"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <BotaoStatus operador={o} />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </motion.section>
    </div>
  );
}

function BotaoStatus({ operador }: { operador: Operador }) {
  const toast = useToast();
  const [pendente, comecar] = useTransition();

  async function executar() {
    const r = await alternarAtivo(operador.id, operador.ativo);
    if (r?.ok) toast.sucesso(r.msg);
    else toast.erro(r?.msg ?? "Erro inesperado.");
  }

  if (operador.ativo) {
    return (
      <Confirmar
        titulo="Desativar operador?"
        descricao={`${operador.nome} perde o acesso ao app imediatamente. Você pode reativar quando quiser.`}
        rotuloConfirmar="Desativar"
        aoConfirmar={executar}
      >
        {(abrir) => (
          <button
            onClick={abrir}
            aria-label={`Desativar ${operador.nome}`}
            className="w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-perigo hover:bg-perigo-bg transition-colors"
          >
            <Power className="w-4 h-4" />
          </button>
        )}
      </Confirmar>
    );
  }

  return (
    <button
      onClick={() => comecar(executar)}
      disabled={pendente}
      className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-100 transition-colors disabled:opacity-60"
    >
      reativar
    </button>
  );
}
