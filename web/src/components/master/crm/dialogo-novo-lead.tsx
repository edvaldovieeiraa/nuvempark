"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { criarLeadManual, type Duplicado } from "@/app/master/(console)/crm/actions";
import { localSPParaIso } from "@/lib/crm/data-local";
import { ROTULO_ESTAGIO } from "@/lib/crm/rotulos";
import { LIMITE_ACAO, LIMITE_TEXTO, validarLeadManual, type EntradaLeadManual } from "@/lib/crm/validacao";
import { Folha } from "@/components/ui/folha";
import { useToast } from "@/components/ui/toast";
import { AvisoDuplicados, CamposContato, type ValoresContato } from "@/components/master/crm/campos-contato";
import {
  AREA_TEXTO,
  BTN_FANTASMA,
  BTN_PRIMARIO,
  CAMPO,
  ERRO,
  PILULA_RADIO,
  ROTULO,
} from "@/components/master/crm/estilos";

type Props = {
  aberto: boolean;
  onFechar: () => void;
  onCriado: (id: string) => void;
  onAbrirLead: (id: string) => void;
};

const INICIAIS = ["novo", "em_contato"] as const;

/**
 * Novo lead à mão (design doc, tela 5; req. 18 e 19). O duplicado é checado
 * ao salvar: a action não cria e devolve os leads que casaram, cada um com
 * "Abrir". Não existe "criar mesmo assim".
 */
export function DialogoNovoLead(props: Props) {
  if (!props.aberto) return null;
  return <NovoLeadAberto {...props} />;
}

function NovoLeadAberto({ onFechar, onCriado, onAbrirLead }: Props) {
  const toast = useToast();
  const id = useId();
  const idForm = `${id}-form`;
  const idAviso = `${id}-aviso`;
  const [contato, setContato] = useState<ValoresContato>({ nome: "", empresa: "", telefone: "", email: "" });
  const [nota, setNota] = useState("");
  const [status, setStatus] = useState<(typeof INICIAIS)[number]>("novo");
  const [acao, setAcao] = useState("");
  const [quando, setQuando] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
  const [pendente, comecar] = useTransition();

  const temAcao = acao.trim() !== "";

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (pendente) return;
    setDuplicados([]);
    const entrada: EntradaLeadManual = {
      nome: contato.nome,
      empresa: contato.empresa,
      telefone: contato.telefone,
      email: contato.email,
      nota,
      status,
      // "Quando" só vale com ação; o campo é hora de São Paulo.
      proximaAcao: temAcao ? acao : null,
      proximaAcaoEm: temAcao ? (localSPParaIso(quando) ?? "") : null,
    };
    const v = validarLeadManual(entrada);
    if (!v.ok) {
      setErro(v.msg);
      return;
    }
    setErro(null);
    comecar(async () => {
      const r = await criarLeadManual(v.dados);
      if (r.ok) {
        toast.sucesso(r.msg);
        onCriado(r.id);
        return;
      }
      setErro(r.msg);
      setDuplicados(r.duplicados ?? []);
    });
  }

  const ehContato = !!erro && (duplicados.length > 0 || /contato|telefone|e-mail/i.test(erro));

  return (
    <Folha
      aberta
      onFechar={onFechar}
      titulo="Novo lead"
      rodape={
        <div className="flex gap-3">
          <button type="button" onClick={onFechar} disabled={pendente} className={`${BTN_FANTASMA} flex-1`}>
            Cancelar
          </button>
          <button type="submit" form={idForm} disabled={pendente} className={`${BTN_PRIMARIO} flex-1`}>
            {pendente && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            Criar lead
          </button>
        </div>
      }
    >
      <form id={idForm} onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <CamposContato
          valores={contato}
          onMudar={setContato}
          desabilitado={pendente}
          idAvisoContato={ehContato ? idAviso : undefined}
        />

        {erro &&
          (duplicados.length > 0 ? (
            <AvisoDuplicados id={idAviso} msg={erro} duplicados={duplicados} onAbrirLead={onAbrirLead} />
          ) : (
            <p id={idAviso} role="alert" className={ERRO}>
              {erro}
            </p>
          ))}

        <div>
          <label htmlFor={`${id}-nota`} className={ROTULO}>
            Observação inicial <span className="font-normal">(vira a primeira nota)</span>
          </label>
          <textarea
            id={`${id}-nota`}
            value={nota}
            maxLength={LIMITE_TEXTO}
            onChange={(e) => setNota(e.target.value)}
            className={AREA_TEXTO}
          />
        </div>

        <fieldset>
          <legend className={ROTULO}>Começa em</legend>
          <div className="flex flex-wrap gap-2">
            {INICIAIS.map((s) => (
              <label key={s} className={PILULA_RADIO}>
                <input
                  type="radio"
                  name={`${id}-status`}
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  className="sr-only"
                />
                {ROTULO_ESTAGIO[s]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <legend className="text-sm font-bold text-texto mb-2">
            Próxima ação <span className="font-normal">(opcional)</span>
          </legend>
          <div>
            <label htmlFor={`${id}-acao`} className={ROTULO}>
              O que fazer
            </label>
            <input
              id={`${id}-acao`}
              value={acao}
              maxLength={LIMITE_ACAO}
              placeholder="Ex.: ligar para apresentar"
              onChange={(e) => setAcao(e.target.value)}
              className={CAMPO}
            />
          </div>
          <div>
            <label htmlFor={`${id}-quando`} className={ROTULO}>
              Quando
            </label>
            <input
              id={`${id}-quando`}
              type="datetime-local"
              value={quando}
              disabled={!temAcao}
              aria-describedby={`${id}-quando-dica`}
              onChange={(e) => setQuando(e.target.value)}
              className={CAMPO}
            />
          </div>
          <p id={`${id}-quando-dica`} className="sm:col-span-2 -mt-1 text-xs text-texto-2">
            “Quando” só vale com uma ação escrita. Horário de Brasília.
          </p>
        </fieldset>
      </form>
    </Folha>
  );
}
