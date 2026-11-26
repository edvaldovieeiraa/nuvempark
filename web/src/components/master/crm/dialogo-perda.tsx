"use client";

import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { MOTIVOS_MANUAIS } from "@/lib/crm/regras";
import { ROTULO_MOTIVO } from "@/lib/crm/rotulos";
import type { LeadCrm, MotivoPerda } from "@/lib/crm/tipos";
import { LIMITE_TEXTO, validarMovimento } from "@/lib/crm/validacao";
import { Folha } from "@/components/ui/folha";
import { AREA_TEXTO, BTN_FANTASMA, BTN_PRIMARIO, ERRO, ROTULO } from "@/components/master/crm/estilos";

type MotivoManual = Exclude<MotivoPerda, "cancelou">;

type Props = {
  aberto: boolean;
  lead: LeadCrm | null;
  enviando?: boolean;
  onCancelar: () => void;
  onConfirmar: (motivo: MotivoManual, texto: string) => void;
};

/**
 * Motivo da perda (design doc, tela 4). É uma Folha, e não um modal solto,
 * porque abre por cima do painel do lead: tudo fora da Folha de cima fica
 * `inert`. "Cancelou" é do sistema; quem desiste por telefone é "Desistiu".
 */
export function DialogoPerda(props: Props) {
  if (!props.aberto || !props.lead) return null;
  return <PerdaAberta key={props.lead.id} {...props} lead={props.lead} />;
}

function PerdaAberta({ lead, enviando = false, onCancelar, onConfirmar }: Props & { lead: LeadCrm }) {
  const id = useId();
  const idForm = `${id}-form`;
  const idErro = `${id}-erro`;
  const [motivo, setMotivo] = useState<MotivoManual | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    // A mesma validação da action, com o lead como a tela o vê.
    const v = validarMovimento(lead, { de: lead.status, para: "perdido", motivoPerda: motivo, texto });
    if (!v.ok || !motivo) {
      setErro(v.ok ? "Escolha o motivo da perda." : v.msg);
      return;
    }
    setErro(null);
    onConfirmar(motivo, texto.trim());
  }

  const outro = motivo === "outro";

  return (
    <Folha
      aberta
      onFechar={onCancelar}
      titulo="Marcar como perdido"
      largura={440}
      rodape={
        <div className="flex gap-3">
          <button type="button" onClick={onCancelar} disabled={enviando} className={`${BTN_FANTASMA} flex-1`}>
            Cancelar
          </button>
          <button type="submit" form={idForm} disabled={enviando} className={`${BTN_PRIMARIO} flex-1`}>
            {enviando && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            Marcar como perdido
          </button>
        </div>
      }
    >
      <form id={idForm} onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-texto-2">
          <b className="text-texto">{lead.nome}</b> vai para Perdido. O histórico fica guardado.
        </p>

        <fieldset aria-describedby={erro && !motivo ? idErro : undefined}>
          <legend className={ROTULO}>Motivo</legend>
          <div className="flex flex-col gap-1">
            {MOTIVOS_MANUAIS.map((m) => (
              <label
                key={m}
                className="toque-44 flex items-center gap-3 min-h-10 px-3 rounded-lg border border-transparent cursor-pointer hover:bg-fundo has-[:checked]:border-brand-200 has-[:checked]:bg-brand-50"
              >
                <input
                  type="radio"
                  name={`${id}-motivo`}
                  value={m}
                  checked={motivo === m}
                  onChange={() => setMotivo(m)}
                  className="w-4 h-4 accent-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                />
                <span className="text-sm font-semibold text-texto">{ROTULO_MOTIVO[m]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor={`${id}-texto`} className={ROTULO}>
            Comentário <span className="font-normal">{outro ? "(obrigatório em Outro)" : "(opcional)"}</span>
          </label>
          <textarea
            id={`${id}-texto`}
            value={texto}
            maxLength={LIMITE_TEXTO}
            required={outro}
            aria-invalid={!!erro && outro && !texto.trim()}
            aria-describedby={erro ? idErro : undefined}
            onChange={(e) => setTexto(e.target.value)}
            className={AREA_TEXTO}
          />
        </div>

        {erro && (
          <p id={idErro} role="alert" className={ERRO}>
            {erro}
          </p>
        )}
      </form>
    </Folha>
  );
}
