"use client";

import { useActionState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Plus, X } from "lucide-react";
import {
  criarPlano,
  desativarPlano,
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
  ativo: boolean;
};

export function PlanosClient({
  patioId,
  planos,
  qtdClientesPorPlano,
}: {
  patioId: string;
  patioNome: string;
  planos: Plano[];
  qtdClientesPorPlano: Record<string, number>;
}) {
  const ativos = planos.filter((p) => p.ativo);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Lista */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        {ativos.length === 0 ? (
          <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
            <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
              <BadgeCheck className="w-6 h-6 text-brand-600" />
            </span>
            <p className="text-sm text-texto-3">
              Nenhum plano ainda — crie o primeiro abaixo.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-borda">
            <AnimatePresence initial={false}>
              {ativos.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="px-5 py-3.5 flex items-center gap-3"
                >
                  <span className="w-9 h-9 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                    <BadgeCheck className="w-4 h-4 text-brand-600" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{p.nome}</p>
                    <p className="text-xs text-texto-3 capitalize">
                      {p.tipo} · {qtdClientesPorPlano[p.id] ?? 0}{" "}
                      {(qtdClientesPorPlano[p.id] ?? 0) === 1
                        ? "cliente"
                        : "clientes"}
                    </p>
                  </div>
                  <BotaoDesativarPlano
                    plano={p}
                    qtdClientes={qtdClientesPorPlano[p.id] ?? 0}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </motion.section>

      {/* Novo plano — form curto, gerenciamento rápido */}
      <NovoPlanoForm patioId={patioId} />
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
          className="w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-perigo hover:bg-perigo-bg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </Confirmar>
  );
}

function NovoPlanoForm({ patioId }: { patioId: string }) {
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
    } else toast.erro("Não deu certo", estado.msg);
  }, [estado, toast]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
      className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
          <Plus className="w-4 h-4 text-brand-600" />
        </span>
        <h2 className="font-bold">Novo plano</h2>
      </div>
      <form
        ref={formRef}
        action={agir}
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="patio_id" value={patioId} />
        <div className="flex-1 min-w-[180px]">
          <Campo label="Nome do plano">
            <Input name="nome" required placeholder="Mensalista Diurno" />
          </Campo>
        </div>
        <div className="w-44">
          <Campo label="Tipo">
            <Select name="tipo">
              <option value="mensalista">mensalista</option>
              <option value="credenciado">credenciado</option>
            </Select>
          </Campo>
        </div>
        <Botao carregando={pendente} className="h-11">
          <Plus className="w-4 h-4" />
          Criar plano
        </Botao>
      </form>
    </motion.section>
  );
}
