"use client";

import { useId, useState, useTransition, type FormEvent, type RefObject } from "react";
import { Loader2 } from "lucide-react";
import { registrarInteracao } from "@/app/master/(console)/crm/actions";
import { ROTULO_TIPO } from "@/lib/crm/rotulos";
import { TIPOS_INTERACAO_MANUAL, type LeadCrm, type TipoInteracaoManual } from "@/lib/crm/tipos";
import { LIMITE_TEXTO, validarInteracao } from "@/lib/crm/validacao";
import { useToast } from "@/components/ui/toast";
import { AREA_TEXTO, BTN_PRIMARIO, ERRO, PILULA_RADIO, ROTULO } from "@/components/master/crm/estilos";

/**
 * Registrar interação (design doc, tela 3). Tipos em radios nativos. O
 * "também concluir a próxima ação" só aparece quando há ação, e desmarcado
 * (Revisão 9).
 */
export function FormInteracao({
  lead,
  onRegistrado,
  refTexto,
}: {
  lead: LeadCrm;
  onRegistrado?: () => void;
  /** Para a Folha do celular focar o texto ao abrir. */
  refTexto?: RefObject<HTMLTextAreaElement | null>;
}) {
  const toast = useToast();
  const id = useId();
  const idErro = `${id}-erro`;
  const [tipo, setTipo] = useState<TipoInteracaoManual>("nota");
  const [texto, setTexto] = useState("");
  const [concluir, setConcluir] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();
  const temAcao = !!(lead.proximaAcao || lead.proximaAcaoEm);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (pendente) return;
    const v = validarInteracao({ tipo, texto });
    if (!v.ok) {
      setErro(v.msg);
      return;
    }
    setErro(null);
    comecar(async () => {
      const r = await registrarInteracao({
        leadId: lead.id,
        tipo: v.tipo,
        texto: v.texto,
        concluirProximaAcao: temAcao && concluir,
      });
      if (!r.ok) {
        setErro(r.msg);
        return;
      }
      toast.sucesso(r.msg);
      setTexto("");
      setConcluir(false);
      onRegistrado?.();
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
      <fieldset>
        <legend className={ROTULO}>Tipo</legend>
        <div className="flex flex-wrap gap-2">
          {TIPOS_INTERACAO_MANUAL.map((t) => (
            <label key={t} className={PILULA_RADIO}>
              <input
                type="radio"
                name={`${id}-tipo`}
                value={t}
                checked={tipo === t}
                onChange={() => setTipo(t)}
                className="sr-only"
              />
              {ROTULO_TIPO[t]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-texto`} className={ROTULO}>
          O que aconteceu
        </label>
        <textarea
          id={`${id}-texto`}
          ref={refTexto}
          value={texto}
          maxLength={LIMITE_TEXTO}
          aria-invalid={!!erro && !texto.trim()}
          aria-describedby={erro ? idErro : undefined}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: liguei, pediu proposta para 2 pátios"
          className={AREA_TEXTO}
        />
      </div>

      {temAcao && (
        <label className="toque-44 flex items-start gap-2.5 text-sm text-texto cursor-pointer">
          <input
            type="checkbox"
            checked={concluir}
            onChange={(e) => setConcluir(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          />
          <span>
            Também concluir a próxima ação
            {lead.proximaAcao && <span className="text-texto-2"> ({lead.proximaAcao})</span>}
          </span>
        </label>
      )}

      {erro && (
        <p id={idErro} role="alert" className={ERRO}>
          {erro}
        </p>
      )}

      <div>
        <button type="submit" disabled={pendente} className={BTN_PRIMARIO}>
          {pendente && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
          Registrar
        </button>
      </div>
    </form>
  );
}
