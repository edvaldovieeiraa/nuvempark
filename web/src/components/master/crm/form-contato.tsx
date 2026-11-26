"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { editarContatoLead, type Duplicado } from "@/app/master/(console)/crm/actions";
import { normalizarContato } from "@/lib/crm/contato";
import type { LeadCrm } from "@/lib/crm/tipos";
import { formatarTelefone } from "@/lib/telefone";
import { useToast } from "@/components/ui/toast";
import { AvisoDuplicados, CamposContato, type ValoresContato } from "@/components/master/crm/campos-contato";
import { BTN_FANTASMA, BTN_PRIMARIO, ERRO } from "@/components/master/crm/estilos";

/**
 * Edição de nome, empresa e contatos do lead, com os campos do "Novo lead".
 * Pelo menos um contato; o duplicado é checado ao salvar, pela action.
 */
export function FormContato({
  lead,
  onCancelar,
  onSalvo,
  onAbrirLead,
}: {
  lead: LeadCrm;
  onCancelar: () => void;
  onSalvo: () => void;
  onAbrirLead: (id: string) => void;
}) {
  const toast = useToast();
  const id = useId();
  const idAviso = `${id}-aviso`;
  const [valores, setValores] = useState<ValoresContato>({
    nome: lead.nome,
    empresa: lead.empresa ?? "",
    telefone: formatarTelefone(lead.telefone ?? ""),
    email: lead.email ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
  const [pendente, comecar] = useTransition();

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (pendente) return;
    setDuplicados([]);
    if (!valores.nome.trim()) {
      setErro("Informe o nome.");
      return;
    }
    const c = normalizarContato({ email: valores.email, telefone: valores.telefone });
    if (!c.ok) {
      setErro(c.msg);
      return;
    }
    setErro(null);
    comecar(async () => {
      const r = await editarContatoLead({
        id: lead.id,
        nome: valores.nome,
        empresa: valores.empresa,
        telefone: c.telefone,
        email: c.email,
      });
      if (r.ok) {
        toast.sucesso(r.msg);
        onSalvo();
        return;
      }
      setErro(r.msg);
      setDuplicados(r.duplicados ?? []);
    });
  }

  const temAviso = !!erro;

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
      <CamposContato
        valores={valores}
        onMudar={setValores}
        desabilitado={pendente}
        idAvisoContato={temAviso ? idAviso : undefined}
      />
      {erro &&
        (duplicados.length > 0 ? (
          <AvisoDuplicados id={idAviso} msg={erro} duplicados={duplicados} onAbrirLead={onAbrirLead} />
        ) : (
          <p id={idAviso} role="alert" className={ERRO}>
            {erro}
          </p>
        ))}
      <div className="flex gap-2">
        <button type="submit" disabled={pendente} className={BTN_PRIMARIO}>
          {pendente && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
          Salvar contato
        </button>
        <button type="button" onClick={onCancelar} disabled={pendente} className={BTN_FANTASMA}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
