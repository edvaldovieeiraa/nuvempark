"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Store, Plus, Pencil, X, Power, AlertTriangle } from "lucide-react";
import {
  criarParceiro,
  salvarParceiro,
  alternarParceiro,
  type Resultado,
} from "@/app/painel/vouchers/parceiros/actions";
import { descreverRegra, type RegraVoucher } from "@/lib/vouchers/calculo";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input, Select } from "@/components/ui/campos";

type Parceiro = {
  id: string;
  nome: string;
  documento: string | null;
  modo_custo: "cortesia" | "faturado";
  limite_quantidade: number | null;
  limite_periodo: "mes" | "total" | null;
  ativo: boolean;
};

type Regra = RegraVoucher & { id: string };
type Vinculo = { parceiro_id: string; regra_id: string };

export function ParceirosClient({
  parceiros,
  regras,
  vinculos,
  patioId,
  patioNome,
}: {
  parceiros: Parceiro[];
  regras: Regra[];
  vinculos: Vinculo[];
  patioId: string;
  patioNome: string;
}) {
  const [editando, setEditando] = useState<Parceiro | null>(null);
  const [criando, setCriando] = useState(false);

  const regrasDe = (id: string) =>
    vinculos.filter((v) => v.parceiro_id === id).map((v) => v.regra_id);

  return (
    <div className="max-w-4xl">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto flex items-center gap-2">
            <Store className="w-6 h-6 text-brand-600" />
            Parceiros
          </h1>
          <p className="text-sm text-texto-2 mt-1">
            Lojas e empresas que liberam tickets no {patioNome}.
          </p>
        </div>
        {!criando && regras.length > 0 && (
          <Botao type="button" onClick={() => { setCriando(true); setEditando(null); }}>
            <Plus className="w-4 h-4" /> Novo parceiro
          </Botao>
        )}
      </header>

      {/* Sem regra no catálogo, criar parceiro é criar um acesso que não faz
          nada. Melhor dizer isso do que deixar o gestor descobrir depois. */}
      {regras.length === 0 && (
        <div className="rounded-2xl border border-atencao/40 bg-atencao/10 p-4 mb-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-atencao shrink-0" />
          <p className="text-sm text-texto-2">
            Cadastre ao menos uma <strong>regra de voucher</strong> antes. Um
            parceiro sem regra concedida não consegue liberar nada.
          </p>
        </div>
      )}

      {criando && (
        <Formulario
          patioId={patioId}
          regras={regras}
          inicial={null}
          selecionadas={[]}
          aoFechar={() => setCriando(false)}
        />
      )}

      <ul className="space-y-2">
        {parceiros.map((p) =>
          editando?.id === p.id ? (
            <li key={p.id}>
              <Formulario
                patioId={patioId}
                regras={regras}
                inicial={p}
                selecionadas={regrasDe(p.id)}
                aoFechar={() => setEditando(null)}
              />
            </li>
          ) : (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl border border-borda bg-superficie p-4 ${
                p.ativo ? "" : "opacity-55"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-texto truncate">
                  <Link
                    href={`/painel/vouchers/parceiros/${p.id}`}
                    className="hover:text-brand-700 hover:underline"
                  >
                    {p.nome}
                  </Link>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      p.modo_custo === "faturado"
                        ? "bg-brand-100 text-brand-700"
                        : "bg-fundo text-texto-2"
                    }`}
                  >
                    {p.modo_custo === "faturado" ? "faturado" : "cortesia"}
                  </span>
                  {!p.ativo && (
                    <span className="ml-2 text-[11px] font-bold uppercase text-texto-2">
                      inativo
                    </span>
                  )}
                </p>
                <p className="text-sm text-texto-2">
                  {p.limite_quantidade === null
                    ? "sem limite"
                    : `${p.limite_quantidade} liberações por ${
                        p.limite_periodo === "total" ? "cota única" : "mês"
                      }`}
                  {" · "}
                  {regrasDe(p.id).length === 0 ? (
                    <span className="text-perigo font-semibold">
                      nenhuma regra concedida
                    </span>
                  ) : (
                    `${regrasDe(p.id).length} regra(s)`
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setEditando(p); setCriando(false); }}
                className="w-9 h-9 grid place-items-center rounded-xl border border-borda text-texto-2 hover:text-brand-700 hover:border-brand-300"
                aria-label={`Editar ${p.nome}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <BotaoAtivo parceiro={p} patioId={patioId} />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function BotaoAtivo({
  parceiro,
  patioId,
}: {
  parceiro: Parceiro;
  patioId: string;
}) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    alternarParceiro,
    null,
  );

  useEffect(() => {
    if (estado) toast[estado.ok ? "sucesso" : "erro"](estado.msg);
  }, [estado, toast]);

  return (
    <form action={agir}>
      <input type="hidden" name="id" value={parceiro.id} />
      <input type="hidden" name="ativo" value={String(parceiro.ativo)} />
      <input type="hidden" name="patio_id" value={patioId} />
      <button
        type="submit"
        disabled={pendente}
        title={parceiro.ativo ? "Desativar acesso" : "Reativar"}
        className={`w-9 h-9 grid place-items-center rounded-xl border transition-colors ${
          parceiro.ativo
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
  regras,
  inicial,
  selecionadas,
  aoFechar,
}: {
  patioId: string;
  regras: Regra[];
  inicial: Parceiro | null;
  selecionadas: string[];
  aoFechar: () => void;
}) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    inicial ? salvarParceiro : criarParceiro,
    null,
  );
  const [semLimite, setSemLimite] = useState(
    inicial ? inicial.limite_quantidade === null : false,
  );

  useEffect(() => {
    if (!estado) return;
    toast[estado.ok ? "sucesso" : "erro"](estado.msg);
    if (estado.ok) aoFechar();
  }, [estado, toast, aoFechar]);

  return (
    <form
      action={agir}
      className="rounded-2xl border border-brand-300 bg-brand-50/40 p-4 mb-3 space-y-4"
    >
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="patio_id" value={patioId} />

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-texto">
          {inicial ? "Editar parceiro" : "Novo parceiro"}
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

      <div className="grid sm:grid-cols-2 gap-3">
        <Campo label="Nome">
          <Input
            name="nome"
            defaultValue={inicial?.nome ?? ""}
            placeholder="Ex.: Padaria do Zé"
            required
          />
        </Campo>
        <Campo label="CNPJ / documento (opcional)">
          <Input name="documento" defaultValue={inicial?.documento ?? ""} />
        </Campo>
      </div>

      <Campo label="Quem paga a isenção">
        <Select name="modo_custo" defaultValue={inicial?.modo_custo ?? "cortesia"}>
          <option value="cortesia">Cortesia do pátio — não é cobrado</option>
          <option value="faturado">Faturado — entra no fechamento mensal</option>
        </Select>
      </Campo>

      <div>
        <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-texto-2">
          <input
            type="checkbox"
            name="sem_limite"
            checked={semLimite}
            onChange={(e) => setSemLimite(e.target.checked)}
            className="w-4 h-4 accent-[var(--brand-600,#16A34A)]"
          />
          Sem limite de liberações
        </label>

        {!semLimite && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Quantas liberações">
              <Input
                name="limite_quantidade"
                type="number"
                min={1}
                defaultValue={inicial?.limite_quantidade ?? 10}
              />
            </Campo>
            <Campo label="Período">
              <Select
                name="limite_periodo"
                defaultValue={inicial?.limite_periodo ?? "mes"}
              >
                <option value="mes">Por mês — renova todo dia 1º</option>
                <option value="total">Cota única — não renova</option>
              </Select>
            </Campo>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-bold text-texto-2 mb-1.5">
          Regras que este parceiro pode usar
        </p>
        {regras.length === 0 ? (
          <p className="text-sm text-texto-2">Nenhuma regra ativa no catálogo.</p>
        ) : (
          <div className="space-y-1.5">
            {regras.map((r) => (
              <label
                key={r.id}
                className="flex items-start gap-2.5 rounded-xl border border-borda bg-superficie p-2.5 cursor-pointer hover:border-brand-300"
              >
                <input
                  type="checkbox"
                  name="regras"
                  value={r.id}
                  defaultChecked={selecionadas.includes(r.id)}
                  className="mt-0.5 w-4 h-4 accent-[var(--brand-600,#16A34A)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-texto">
                    {r.nome}
                  </span>
                  <span className="block text-xs text-texto-2">
                    {descreverRegra(r)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Botao carregando={pendente}>
          {inicial ? "Salvar" : "Criar parceiro"}
        </Botao>
        <Botao type="button" variante="fantasma" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
