"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { criarOperador, type Resultado } from "@/app/painel/operadores/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/campos";

/** Formulário da página /painel/operadores/novo — redireciona ao salvar. */
export function NovoOperadorForm({ patioId }: { patioId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    criarOperador,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso("Operador criado!", estado.msg);
      router.push(`/painel/operadores?patio=${patioId}`);
    } else {
      toast.erro("Não deu certo", estado.msg);
    }
  }, [estado, toast, router, patioId]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-6 max-w-2xl"
    >
      <form action={agir} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input type="hidden" name="patio_id" value={patioId} />
        <Campo label="Nome completo">
          <Input name="nome" required placeholder="João da Silva" />
        </Campo>
        <Campo label="Usuário (login no app)">
          <Input name="usuario" required placeholder="JOAO" className="uppercase" />
        </Campo>
        <Campo label="Senha (mín. 6 caracteres)">
          <Input name="senha" type="password" required minLength={6} />
        </Campo>
        <div className="col-span-full pt-1 flex gap-3">
          <Botao carregando={pendente}>
            <UserPlus className="w-4 h-4" />
            Criar operador
          </Botao>
          <Botao
            type="button"
            variante="fantasma"
            onClick={() => router.push(`/painel/operadores?patio=${patioId}`)}
          >
            Cancelar
          </Botao>
        </div>
      </form>
      <p className="mt-5 text-xs text-texto-3 leading-relaxed">
        O operador entra no app com o <b>código da sua rede</b> + esse usuário e
        senha. Ele fica vinculado a este pátio automaticamente.
      </p>
    </motion.section>
  );
}
