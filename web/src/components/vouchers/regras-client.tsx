"use client";

import { useActionState, useEffect, useState } from "react";
import { Ticket, Plus, Pencil, X, Power } from "lucide-react";
import {
  criarRegra,
  salvarRegra,
  alternarRegra,
  type Resultado,
} from "@/app/painel/vouchers/regras/actions";
import { descreverRegra } from "@/lib/vouchers/calculo";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/campos";

type Regra = {
  id: string;
  nome: string;
  abater_minutos: number;
  desconto_percentual: number;
  desconto_valor: number;
  ativo: boolean;
};

/**
 * Atalhos do formulário.
 *
 * Eles NÃO são tipos de regra — só preenchem os três números. É o que mantém
 * a promessa de "genérico como tabela de preço": o banco não sabe o que é uma
 * "isenção de 2h", ele sabe que `abater_minutos = 120`. Um campo `tipo` aqui
 * desfaria isso, e a quinta regra que alguém inventasse exigiria migração.
 */
const ATALHOS: { rotulo: string; valores: Partial<Regra> }[] = [
  { rotulo: "2 horas", valores: { abater_minutos: 120 } },
  { rotulo: "4 horas", valores: { abater_minutos: 240 } },
  { rotulo: "12 horas", valores: { abater_minutos: 720 } },
  { rotulo: "24 horas", valores: { abater_minutos: 1440 } },
  { rotulo: "Isenção total", valores: { desconto_percentual: 100 } },
  { rotulo: "Metade", valores: { desconto_percentual: 50 } },
];

const VAZIA: Omit<Regra, "id" | "ativo"> = {
  nome: "",
  abater_minutos: 0,
  desconto_percentual: 0,
  desconto_valor: 0,
};

export function RegrasClient({
  regras,
  patioId,
  patioNome,
}: {
  regras: Regra[];
  patioId: string;
  patioNome: string;
}) {
  const [editando, setEditando] = useState<Regra | null>(null);
  const [criando, setCriando] = useState(false);

  return (
    <div className="max-w-4xl">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto flex items-center gap-2">
            <Ticket className="w-6 h-6 text-brand-600" />
            Regras de voucher
          </h1>
          <p className="text-sm text-texto-2 mt-1">
            O catálogo do pátio {patioNome}. Cada parceiro recebe acesso a um
            subconjunto destas regras.
          </p>
        </div>
        {!criando && (
          <Botao type="button" onClick={() => { setCriando(true); setEditando(null); }}>
            <Plus className="w-4 h-4" /> Nova regra
          </Botao>
        )}
      </header>

      {criando && (
        <Formulario
          patioId={patioId}
          inicial={null}
          aoFechar={() => setCriando(false)}
        />
      )}

      {regras.length === 0 && !criando && (
        <div className="rounded-2xl border border-dashed border-borda p-8 text-center">
          <p className="text-sm text-texto-2">
            Nenhuma regra ainda. Sem pelo menos uma, nenhum parceiro consegue
            liberar ticket.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {regras.map((r) =>
          editando?.id === r.id ? (
            <li key={r.id}>
              <Formulario
                patioId={patioId}
                inicial={r}
                aoFechar={() => setEditando(null)}
              />
            </li>
          ) : (
            <li
              key={r.id}
              className={`flex items-center gap-3 rounded-2xl border border-borda bg-superficie p-4 ${
                r.ativo ? "" : "opacity-55"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-texto truncate">
                  {r.nome}
                  {!r.ativo && (
                    <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-texto-2">
                      inativa
                    </span>
                  )}
                </p>
                <p className="text-sm text-texto-2">{descreverRegra(r)}</p>
              </div>
              <button
                type="button"
                onClick={() => { setEditando(r); setCriando(false); }}
                className="w-9 h-9 grid place-items-center rounded-xl border border-borda text-texto-2 hover:text-brand-700 hover:border-brand-300"
                aria-label={`Editar ${r.nome}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <BotaoAtivo regra={r} patioId={patioId} />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function BotaoAtivo({ regra, patioId }: { regra: Regra; patioId: string }) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    alternarRegra,
    null,
  );

  useEffect(() => {
    if (estado) toast[estado.ok ? "sucesso" : "erro"](estado.msg);
  }, [estado, toast]);

  return (
    <form action={agir}>
      <input type="hidden" name="id" value={regra.id} />
      <input type="hidden" name="ativo" value={String(regra.ativo)} />
      <input type="hidden" name="patio_id" value={patioId} />
      <button
        type="submit"
        disabled={pendente}
        title={regra.ativo ? "Desativar" : "Reativar"}
        className={`w-9 h-9 grid place-items-center rounded-xl border transition-colors ${
          regra.ativo
            ? "border-borda text-texto-2 hover:text-perigo hover:border-perigo/40"
            : "border-brand-300 text-brand-700"
        }`}
      >
        <Power className="w-4 h-4" />
      </button>
    </form>
  );
}

function Formulario({
  patioId,
  inicial,
  aoFechar,
}: {
  patioId: string;
  inicial: Regra | null;
  aoFechar: () => void;
}) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    inicial ? salvarRegra : criarRegra,
    null,
  );
  const [v, setV] = useState(inicial ?? VAZIA);

  useEffect(() => {
    if (!estado) return;
    toast[estado.ok ? "sucesso" : "erro"](estado.msg);
    if (estado.ok) aoFechar();
  }, [estado, toast, aoFechar]);

  const preview = descreverRegra(v);

  return (
    <form
      action={agir}
      className="rounded-2xl border border-brand-300 bg-brand-50/40 p-4 mb-3 space-y-4"
    >
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="patio_id" value={patioId} />

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-texto">
          {inicial ? "Editar regra" : "Nova regra"}
        </h2>
        <button
          type="button"
          onClick={aoFechar}
          className="w-8 h-8 grid place-items-center rounded-lg text-texto-2 hover:bg-fundo"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Campo label="Nome">
        <Input
          name="nome"
          value={v.nome}
          onChange={(e) => setV({ ...v, nome: e.target.value })}
          placeholder="Ex.: 2 horas grátis"
          required
        />
      </Campo>

      <div>
        <p className="text-xs font-bold text-texto-2 mb-1.5">Atalhos</p>
        <div className="flex flex-wrap gap-2">
          {ATALHOS.map((a) => (
            <button
              key={a.rotulo}
              type="button"
              onClick={() =>
                setV({
                  ...VAZIA,
                  nome: v.nome || a.rotulo,
                  ...a.valores,
                })
              }
              className="px-3 py-1.5 rounded-full border border-borda bg-superficie text-xs font-bold text-texto-2 hover:border-brand-300 hover:text-brand-700"
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Campo label="Tempo abatido (min)">
          <Input
            name="abater_minutos"
            type="number"
            min={0}
            value={v.abater_minutos}
            onChange={(e) =>
              setV({ ...v, abater_minutos: Number(e.target.value) })
            }
          />
        </Campo>
        <Campo label="Desconto (%)">
          <Input
            name="desconto_percentual"
            type="number"
            min={0}
            max={100}
            value={v.desconto_percentual}
            onChange={(e) =>
              setV({ ...v, desconto_percentual: Number(e.target.value) })
            }
          />
        </Campo>
        <Campo label="Abatimento (R$)">
          <Input
            name="desconto_valor"
            type="number"
            min={0}
            step="0.01"
            value={v.desconto_valor}
            onChange={(e) =>
              setV({ ...v, desconto_valor: Number(e.target.value) })
            }
          />
        </Campo>
      </div>

      {/* Traduz os três números de volta para linguagem humana. É a única
          checagem que o gestor tem de que preencheu o que queria. */}
      <p className="text-sm">
        <span className="text-texto-2">Resultado: </span>
        <span className="font-bold text-brand-700">{preview}</span>
      </p>

      <div className="flex gap-2">
        <Botao carregando={pendente}>{inicial ? "Salvar" : "Criar regra"}</Botao>
        <Botao type="button" variante="fantasma" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
