"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { useToast } from "@/components/ui/toast";
import { gerarFaturasDoMes } from "@/app/master/(console)/financeiro/actions";

export function GerarFaturasBotao() {
  const toast = useToast();
  const [pendente, comecar] = useTransition();

  function gerar() {
    comecar(async () => {
      const r = await gerarFaturasDoMes();
      if (r?.ok) toast.sucesso("Pronto!", r.msg);
      else toast.erro("Não deu certo", r?.msg ?? "Erro inesperado.");
    });
  }

  return (
    <Botao onClick={gerar} type="button" carregando={pendente} variante="fantasma">
      <RefreshCw className="w-4 h-4" />
      Gerar faturas do mês
    </Botao>
  );
}
