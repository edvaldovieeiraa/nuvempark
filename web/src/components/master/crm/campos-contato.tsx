"use client";

import { useId, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { restaurarLead, type Duplicado } from "@/app/master/(console)/crm/actions";
import { ROTULO_ESTAGIO } from "@/lib/crm/rotulos";
import { formatarData } from "@/lib/format-data";
import { formatarTelefone } from "@/lib/telefone";
import { useToast } from "@/components/ui/toast";
import { chamarAction } from "@/components/master/crm/chamar-action";
import { BTN_PEQUENO, CAMPO, ROTULO } from "@/components/master/crm/estilos";

export type ValoresContato = { nome: string; empresa: string; telefone: string; email: string };

/**
 * Nome, empresa, telefone e e-mail: os mesmos campos no "Novo lead" (tela 5)
 * e na edição de contato do painel. O aviso de duplicado é ligado ao telefone
 * e ao e-mail por `aria-describedby`, sem `aria-invalid`: duplicado não é
 * campo errado, é um lead que já existe.
 */
export function CamposContato({
  valores,
  onMudar,
  idAvisoContato,
  desabilitado,
}: {
  valores: ValoresContato;
  onMudar: (v: ValoresContato) => void;
  /** id do aviso de duplicado ou do "pelo menos um contato". */
  idAvisoContato?: string;
  desabilitado?: boolean;
}) {
  const id = useId();
  const idDica = `${id}-dica`;
  const descricao = [idDica, idAvisoContato].filter(Boolean).join(" ");
  const set = (campo: keyof ValoresContato, valor: string) => onMudar({ ...valores, [campo]: valor });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-nome`} className={ROTULO}>
          Nome <span className="font-normal">(obrigatório)</span>
        </label>
        <input
          id={`${id}-nome`}
          required
          maxLength={120}
          autoComplete="off"
          value={valores.nome}
          disabled={desabilitado}
          onChange={(e) => set("nome", e.target.value)}
          className={CAMPO}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-empresa`} className={ROTULO}>
          Empresa
        </label>
        <input
          id={`${id}-empresa`}
          maxLength={120}
          autoComplete="off"
          value={valores.empresa}
          disabled={desabilitado}
          onChange={(e) => set("empresa", e.target.value)}
          className={CAMPO}
        />
      </div>
      <div>
        <label htmlFor={`${id}-tel`} className={ROTULO}>
          Telefone
        </label>
        <input
          id={`${id}-tel`}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(00) 00000-0000"
          value={valores.telefone}
          disabled={desabilitado}
          aria-describedby={descricao}
          onChange={(e) => set("telefone", formatarTelefone(e.target.value))}
          className={CAMPO}
        />
      </div>
      <div>
        <label htmlFor={`${id}-email`} className={ROTULO}>
          E-mail
        </label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="off"
          maxLength={254}
          value={valores.email}
          disabled={desabilitado}
          aria-describedby={descricao}
          onChange={(e) => set("email", e.target.value)}
          className={CAMPO}
        />
      </div>
      <p id={idDica} className="sm:col-span-2 -mt-1 text-xs text-texto-2">
        Pelo menos um contato: telefone ou e-mail.
      </p>
    </div>
  );
}

const CASOU_POR: Record<Duplicado["casouPor"], string> = {
  email: "mesmo e-mail",
  telefone: "mesmo telefone",
  ambos: "mesmo e-mail e telefone",
};

/**
 * "Esse contato já está no CRM": até 2 leads, cada um com "Abrir". Um excluído
 * (db/54) vem marcado, com "Restaurar e abrir".
 */
export function AvisoDuplicados({
  id,
  msg,
  duplicados,
  onAbrirLead,
}: {
  id: string;
  msg: string;
  duplicados: Duplicado[];
  onAbrirLead: (id: string) => void;
}) {
  return (
    <div
      id={id}
      role="alert"
      className="rounded-xl border border-aviso-borda bg-aviso-bg px-3.5 py-3 text-sm text-aviso-texto"
    >
      <p className="flex items-start gap-2 font-bold">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
        {msg}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {duplicados.slice(0, 2).map((d) => (
          <li key={d.id} className="flex items-center gap-3 rounded-lg bg-superficie/70 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-texto break-words">{d.nome}</p>
              <p className="text-xs text-texto-2 break-words">
                {(d.excluido
                  ? [
                      d.excluidoEm ? `Excluído em ${formatarData(new Date(d.excluidoEm))}` : "Excluído",
                      `estava em ${ROTULO_ESTAGIO[d.status]}`,
                      CASOU_POR[d.casouPor],
                    ]
                  : [d.empresa, ROTULO_ESTAGIO[d.status], CASOU_POR[d.casouPor]]
                )
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {d.excluido ? (
              <BotaoRestaurarEAbrir duplicado={d} onAbrirLead={onAbrirLead} />
            ) : (
              <button
                type="button"
                onClick={() => onAbrirLead(d.id)}
                aria-label={`Abrir ${d.nome}`}
                className={BTN_PEQUENO}
              >
                Abrir
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BotaoRestaurarEAbrir({
  duplicado,
  onAbrirLead,
}: {
  duplicado: Duplicado;
  onAbrirLead: (id: string) => void;
}) {
  const toast = useToast();
  const [pendente, comecar] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Restaurar e abrir ${duplicado.nome}`}
      aria-disabled={pendente || undefined}
      onClick={() => {
        if (pendente) return;
        comecar(async () => {
          const r = await chamarAction(() => restaurarLead(duplicado.id));
          if (!r.ok) {
            toast.erro(r.msg);
            return;
          }
          toast.sucesso(r.msg);
          onAbrirLead(duplicado.id);
        });
      }}
      className={`${BTN_PEQUENO} !bg-brand-700 !text-white !border-brand-700 whitespace-nowrap`}
    >
      {pendente && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
      Restaurar e abrir
    </button>
  );
}
