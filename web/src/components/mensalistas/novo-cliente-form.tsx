"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { criarCliente, type Resultado } from "@/app/painel/mensalistas/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input, Select } from "@/components/ui/campos";

type Plano = { id: string; nome: string };

/** Formulário da página /painel/mensalistas/novo — redireciona ao salvar. */
export function NovoClienteForm({
  patioId,
  planos,
}: {
  patioId: string;
  planos: Plano[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    criarCliente,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso("Cliente cadastrado!", estado.msg);
      router.push(`/painel/mensalistas?patio=${patioId}`);
    } else {
      toast.erro("Não deu certo", estado.msg);
    }
  }, [estado, toast, router, patioId]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-6 max-w-3xl"
    >
      <form action={agir} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <input type="hidden" name="patio_id" value={patioId} />
        <Campo label="Nome">
          <Input name="nome" required placeholder="Maria Souza" />
        </Campo>
        <Campo label="CPF/CNPJ (opcional)">
          <Input name="documento" placeholder="000.000.000-00" />
        </Campo>
        <Campo label="Telefone (opcional)">
          <Input name="telefone" placeholder="(81) 90000-0000" />
        </Campo>
        <Campo label="Plano">
          <Select name="plano_id">
            <option value="">sem plano</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Vencimento (opcional)">
          <Input name="vencimento" type="date" />
        </Campo>
        <Campo label="Dia de vencimento (opcional)">
          <Input
            name="dia_vencimento"
            type="number"
            min={1}
            max={28}
            placeholder="ex.: 10"
          />
        </Campo>
        <Campo label="Vagas">
          <Input name="vagas" type="number" defaultValue="1" min={1} />
        </Campo>
        <Campo label="Placa inicial (opcional)">
          <Input
            name="placa"
            placeholder="ABC1D23"
            maxLength={8}
            className="uppercase tracking-widest font-bold"
          />
        </Campo>
        <div className="col-span-full pt-1 flex gap-3">
          <Botao carregando={pendente}>
            <UserPlus className="w-4 h-4" />
            Cadastrar cliente
          </Botao>
          <Botao
            type="button"
            variante="fantasma"
            onClick={() => router.push(`/painel/mensalistas?patio=${patioId}`)}
          >
            Cancelar
          </Botao>
        </div>
      </form>
      <p className="mt-5 text-xs text-texto-3 leading-relaxed">
        Você pode adicionar mais placas depois, direto na lista de clientes.
      </p>
    </motion.section>
  );
}
