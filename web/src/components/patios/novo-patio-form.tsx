"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { criarPatio, type Resultado } from "@/app/painel/patios/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/campos";

/** Formulário da página /painel/patios/novo — redireciona ao salvar. */
export function NovoPatioForm() {
  const router = useRouter();
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    criarPatio,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso("Pátio criado!", estado.msg);
      router.push("/painel/patios");
    } else {
      toast.erro("Não deu certo", estado.msg);
    }
  }, [estado, toast, router]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-6 max-w-2xl"
    >
      <form action={agir} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-full">
          <Campo label="Nome do pátio">
            <Input name="nome" required placeholder="Pátio Centro" />
          </Campo>
        </div>
        <Campo label="Código interno (opcional)">
          <Input name="codigo" placeholder="CT01" />
        </Campo>
        <Campo label="Quantidade de vagas">
          <Input name="qtd_vagas" type="number" defaultValue="50" min={0} />
        </Campo>
        <div className="col-span-full pt-1 flex gap-3">
          <Botao carregando={pendente}>
            <Plus className="w-4 h-4" />
            Criar pátio
          </Botao>
          <Botao
            type="button"
            variante="fantasma"
            onClick={() => router.push("/painel/patios")}
          >
            Cancelar
          </Botao>
        </div>
      </form>
      <p className="mt-5 text-xs text-texto-3 leading-relaxed">
        Depois de criar, cadastre a <b>tarifa</b> e os <b>operadores</b> do
        pátio — ele já nasce ativo e pronto para receber o app.
      </p>
    </motion.section>
  );
}
