"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator, Plus } from "lucide-react";
import { criarTarifa, type Resultado } from "@/app/painel/tarifas/actions";
import { nomeAmigavel } from "@/lib/nome-amigavel";
import type { TarifaSim } from "@/lib/tarifa-engine";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input, Select } from "@/components/ui/campos";
import { SecaoOpcional } from "@/components/ui/secao-opcional";
import { ModalSimulador } from "@/components/tarifas/simulador-modal";

/** Formulário da página /painel/tarifas/nova — redireciona pra consulta ao salvar. */
export function NovaTarifaForm({
  patioId,
  tipos,
}: {
  patioId: string;
  tipos: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [comTeto, setComTeto] = useState(false);
  const [comPernoite, setComPernoite] = useState(false);
  const [simulacao, setSimulacao] = useState<{
    nome: string;
    tarifa: TarifaSim;
  } | null>(null);
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    criarTarifa,
    null,
  );

  /** Lê os valores ATUAIS do formulário (antes de salvar) e abre o simulador. */
  function simular() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const num = (k: string) =>
      Number(String(fd.get(k) ?? "0").replace(",", ".")) || 0;
    setSimulacao({
      nome: String(fd.get("nome") || "Nova tarifa (não salva)"),
      tarifa: {
        tolerancia_minutos: num("tolerancia_minutos"),
        fracao_inicial_minutos: num("fracao_inicial_minutos"),
        fracao_inicial_valor: num("fracao_inicial_valor"),
        fracao_adicional_minutos: num("fracao_adicional_minutos"),
        fracao_adicional_valor: num("fracao_adicional_valor"),
        teto_diaria: num("teto_diaria"),
        pernoite_valor: num("pernoite_valor"),
        pernoite_hora_inicio: num("pernoite_hora_inicio"),
        pernoite_hora_fim: num("pernoite_hora_fim"),
      },
    });
  }

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso("Tarifa criada!", estado.msg);
      router.push(`/painel/tarifas?patio=${patioId}`);
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
      <form
        ref={formRef}
        action={agir}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <input type="hidden" name="patio_id" value={patioId} />

        {/* ── Básico ── */}
        <Campo label="Nome">
          <Input name="nome" placeholder="Padrão" />
        </Campo>
        <Campo label="Tipo de veículo">
          <Select name="tipo_veiculo">
            {tipos.map((t) => (
              <option key={t} value={t}>
                {nomeAmigavel(t)}
              </option>
            ))}
            <option value="ambos">Todos os tipos</option>
          </Select>
        </Campo>
        <Campo label="Tolerância (min)">
          <Input name="tolerancia_minutos" type="number" defaultValue="10" />
        </Campo>

        {/* ── Cobrança por tempo ── */}
        <Campo label="Fração inicial (min)">
          <Input name="fracao_inicial_minutos" type="number" defaultValue="15" />
        </Campo>
        <Campo label="Valor inicial (R$)">
          <Input name="fracao_inicial_valor" defaultValue="5.00" />
        </Campo>
        <div className="hidden lg:block" />
        <Campo label="Fração adicional (min)">
          <Input name="fracao_adicional_minutos" type="number" defaultValue="15" />
        </Campo>
        <Campo label="Valor adicional (R$)">
          <Input name="fracao_adicional_valor" defaultValue="3.00" />
        </Campo>
        <div className="hidden lg:block" />

        {/* ── Teto de diária (opcional) ── */}
        <SecaoOpcional
          titulo="Teto de diária"
          descricao="Limita quanto o cliente paga no total. Se a soma das frações passar do teto, o app cobra só o valor do teto — bom para quem deixa o carro o dia inteiro."
          habilitado={comTeto}
          onChange={setComTeto}
        >
          <Campo label="Teto (R$)">
            <Input name="teto_diaria" defaultValue="60.00" />
          </Campo>
        </SecaoOpcional>
        {!comTeto && <input type="hidden" name="teto_diaria" value="0" />}

        {/* ── Pernoite (opcional) ── */}
        <SecaoOpcional
          titulo="Pernoite"
          descricao="Valor fixo para quem atravessa a madrugada no pátio. Se o veículo estiver dentro na janela definida (ex.: 22h às 8h do dia seguinte), o app cobra este valor no lugar da cobrança por tempo."
          habilitado={comPernoite}
          onChange={setComPernoite}
        >
          <Campo label="Valor do pernoite (R$)">
            <Input name="pernoite_valor" defaultValue="40.00" />
          </Campo>
          <Campo label="Início da janela (h)">
            <Input name="pernoite_hora_inicio" type="number" defaultValue="22" />
          </Campo>
          <Campo label="Fim da janela (h)">
            <Input name="pernoite_hora_fim" type="number" defaultValue="8" />
          </Campo>
        </SecaoOpcional>
        {!comPernoite && (
          <>
            <input type="hidden" name="pernoite_valor" value="0" />
            <input type="hidden" name="pernoite_hora_inicio" value="22" />
            <input type="hidden" name="pernoite_hora_fim" value="8" />
          </>
        )}

        <div className="col-span-full pt-1 flex gap-3 flex-wrap">
          <Botao carregando={pendente}>
            <Plus className="w-4 h-4" />
            Criar tarifa
          </Botao>
          <Botao type="button" variante="fantasma" onClick={simular}>
            <Calculator className="w-4 h-4" />
            Simular
          </Botao>
          <Botao
            type="button"
            variante="fantasma"
            onClick={() => router.push(`/painel/tarifas?patio=${patioId}`)}
          >
            Cancelar
          </Botao>
        </div>
      </form>

      <AnimatePresence>
        {simulacao && (
          <ModalSimulador
            nome={simulacao.nome}
            tarifa={simulacao.tarifa}
            fechar={() => setSimulacao(null)}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
