"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { CalendarClock, Check, Loader2, Plus } from "lucide-react";
import { definirProximaAcao } from "@/app/master/(console)/crm/actions";
import { isoParaLocalSP, localSPParaIso } from "@/lib/crm/data-local";
import { varianteProximaAcao, type VarianteProximaAcao } from "@/lib/crm/prazos";
import { textoProximaAcao } from "@/lib/crm/textos-card";
import type { LeadCrm } from "@/lib/crm/tipos";
import { LIMITE_ACAO, validarProximaAcao } from "@/lib/crm/validacao";
import { useToast } from "@/components/ui/toast";
import {
  BTN_FANTASMA,
  BTN_PEQUENO,
  BTN_PRIMARIO,
  CAMPO,
  ERRO,
  ROTULO,
  SECAO_TITULO,
} from "@/components/master/crm/estilos";

type Acao = { proximaAcao: string | null; proximaAcaoEm: string | null };

const TOM: Record<Exclude<VarianteProximaAcao, "sem">, { caixa: string; rotulo: string; selo: string }> = {
  vencida: { caixa: "bg-perigo-bg border-perigo-borda", rotulo: "text-perigo-texto", selo: "Vencida" },
  hoje: { caixa: "bg-aviso-bg border-aviso-borda", rotulo: "text-aviso-texto", selo: "Hoje" },
  futura: { caixa: "bg-superficie border-borda", rotulo: "text-texto-2", selo: "Agendada" },
};

/**
 * Próxima ação no painel (Revisão 9): vencida em vermelho, hoje em âmbar,
 * futura neutra e, sem ação, o convite "Definir próxima ação". Reagendar e
 * concluir ficam dentro do bloco; concluir oferece "definir a próxima" logo
 * em seguida.
 */
export function BlocoProximaAcao({
  lead,
  agora,
  onAlterado,
}: {
  lead: LeadCrm;
  /** ISO da página; o bloco nunca lê o relógio. */
  agora: string;
  onAlterado?: () => void;
}) {
  const toast = useToast();
  const id = useId();
  const idErro = `${id}-erro`;
  const [pendente, comecar] = useTransition();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [quando, setQuando] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [acabouDeConcluir, setAcabouDeConcluir] = useState(false);

  // O que foi salvo aqui vale até o servidor mandar o lead de novo
  // (revalidatePath). Quando a ação do lead muda, a dele volta a mandar.
  const chave = `${lead.proximaAcao ?? ""}|${lead.proximaAcaoEm ?? ""}`;
  const [chaveVista, setChaveVista] = useState(chave);
  const [local, setLocal] = useState<Acao | null>(null);
  if (chave !== chaveVista) {
    setChaveVista(chave);
    setLocal(null);
  }
  const acao: Acao = local ?? { proximaAcao: lead.proximaAcao, proximaAcaoEm: lead.proximaAcaoEm };

  const agoraD = new Date(agora);
  const temAcao = !!(acao.proximaAcao || acao.proximaAcaoEm);
  const variante = temAcao ? varianteProximaAcao(acao.proximaAcaoEm, agoraD) : "sem";
  const quandoTexto = textoProximaAcao(acao.proximaAcaoEm, agoraD);

  function abrirEdicao(preencher: boolean) {
    setTexto(preencher ? (acao.proximaAcao ?? "") : "");
    setQuando(preencher ? isoParaLocalSP(acao.proximaAcaoEm) : "");
    setErro(null);
    setAcabouDeConcluir(false);
    setEditando(true);
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (pendente) return;
    // O campo é hora de São Paulo: converte antes de validar e de enviar.
    const v = validarProximaAcao({ proximaAcao: texto, proximaAcaoEm: localSPParaIso(quando) ?? "" });
    if (!v.ok) {
      setErro(v.msg);
      return;
    }
    const nova = { proximaAcao: v.proximaAcao ?? "", proximaAcaoEm: v.proximaAcaoEm ?? "" };
    comecar(async () => {
      const r = await definirProximaAcao(lead.id, nova);
      if (!r.ok) {
        setErro(r.msg);
        return;
      }
      toast.sucesso(r.msg);
      setLocal(nova);
      setEditando(false);
      onAlterado?.();
    });
  }

  function concluir() {
    if (pendente) return;
    comecar(async () => {
      const r = await definirProximaAcao(lead.id, null);
      if (!r.ok) {
        toast.erro(r.msg);
        return;
      }
      toast.sucesso(r.msg);
      setLocal({ proximaAcao: null, proximaAcaoEm: null });
      setAcabouDeConcluir(true);
      onAlterado?.();
    });
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-2">
      <h3 id={`${id}-titulo`} className={SECAO_TITULO}>
        Próxima ação
      </h3>

      {editando ? (
        <form onSubmit={salvar} noValidate className="flex flex-col gap-3 rounded-2xl border border-borda bg-fundo p-4">
          <div>
            <label htmlFor={`${id}-texto`} className={ROTULO}>
              O que fazer
            </label>
            <input
              id={`${id}-texto`}
              value={texto}
              maxLength={LIMITE_ACAO}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex.: ligar para fechar a proposta"
              aria-describedby={erro ? idErro : undefined}
              className={CAMPO}
            />
          </div>
          <div>
            <label htmlFor={`${id}-quando`} className={ROTULO}>
              Quando <span className="font-normal">(horário de Brasília)</span>
            </label>
            <input
              id={`${id}-quando`}
              type="datetime-local"
              value={quando}
              onChange={(e) => setQuando(e.target.value)}
              aria-describedby={erro ? idErro : undefined}
              className={CAMPO}
            />
          </div>
          {erro && (
            <p id={idErro} role="alert" className={ERRO}>
              {erro}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pendente} className={BTN_PRIMARIO}>
              {pendente && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              Salvar
            </button>
            <button type="button" onClick={() => setEditando(false)} disabled={pendente} className={BTN_FANTASMA}>
              Cancelar
            </button>
          </div>
        </form>
      ) : variante === "sem" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-borda-campo px-4 py-3">
          <p className="flex-1 min-w-40 text-sm text-texto-2">
            {acabouDeConcluir ? (
              <>
                <b className="text-texto">Ação concluída.</b> Qual é a próxima?
              </>
            ) : (
              "Nenhuma próxima ação marcada."
            )}
          </p>
          <button type="button" onClick={() => abrirEdicao(false)} className={BTN_PEQUENO}>
            <Plus className="w-3.5 h-3.5" aria-hidden />
            {acabouDeConcluir ? "Definir a próxima" : "Definir próxima ação"}
          </button>
        </div>
      ) : (
        <div className={`rounded-2xl border px-4 py-3 ${TOM[variante].caixa}`}>
          <p className={`flex items-center gap-1.5 text-xs font-bold ${TOM[variante].rotulo}`}>
            <CalendarClock className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span>
              {TOM[variante].selo}
              {quandoTexto ? ` · ${quandoTexto}` : null}
            </span>
          </p>
          {acao.proximaAcao && (
            <p className="mt-1 text-sm font-semibold text-texto break-words">{acao.proximaAcao}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={concluir} disabled={pendente} className={BTN_PEQUENO}>
              {pendente ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="w-3.5 h-3.5" aria-hidden />
              )}
              Concluir
            </button>
            <button type="button" onClick={() => abrirEdicao(true)} disabled={pendente} className={BTN_PEQUENO}>
              <CalendarClock className="w-3.5 h-3.5" aria-hidden />
              Reagendar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
