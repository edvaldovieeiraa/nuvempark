"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Store,
  UserPlus,
  Trash2,
  Copy,
  Check,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import {
  criarAcesso,
  removerAcesso,
  type Resultado,
} from "@/app/painel/vouchers/parceiros/[id]/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/campos";

type Parceiro = {
  id: string;
  nome: string;
  modo_custo: "cortesia" | "faturado";
  limite_quantidade: number | null;
  limite_periodo: "mes" | "total" | null;
  ativo: boolean;
};
type Usuario = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  criado_em: string;
};
type Liberacao = {
  id: string;
  ticket_id: string;
  liberado_em: string;
  cancelada_em: string | null;
  valor_abatido: number | null;
  competencia: string | null;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** Senha legível ao telefone: sem caracteres que se confundem falados. */
function senhaSugerida(): string {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  const numeros = "23456789";
  const sorteia = (s: string, n: number) =>
    Array.from(
      { length: n },
      () => s[Math.floor(Math.random() * s.length)],
    ).join("");
  return `${sorteia(letras, 4)}-${sorteia(numeros, 4)}`;
}

export function ParceiroDetalheClient({
  parceiro,
  usuarios,
  liberacoes,
  usadasNoPeriodo,
}: {
  parceiro: Parceiro;
  usuarios: Usuario[];
  liberacoes: Liberacao[];
  usadasNoPeriodo: number;
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/painel/vouchers/parceiros"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-texto-2 hover:text-brand-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Parceiros
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-texto flex items-center gap-2">
          <Store className="w-6 h-6 text-brand-600" />
          {parceiro.nome}
        </h1>
        <p className="text-sm text-texto-2 mt-1">
          {parceiro.modo_custo === "faturado"
            ? "Faturado — entra no fechamento mensal."
            : "Cortesia do pátio — não é cobrado."}
          {parceiro.limite_quantidade !== null && (
            <>
              {" · "}
              <strong
                className={
                  usadasNoPeriodo >= parceiro.limite_quantidade
                    ? "text-perigo"
                    : "text-texto"
                }
              >
                {usadasNoPeriodo} de {parceiro.limite_quantidade}
              </strong>{" "}
              {parceiro.limite_periodo === "total"
                ? "da cota única"
                : "usadas neste mês"}
            </>
          )}
        </p>
      </div>

      <Acessos parceiro={parceiro} usuarios={usuarios} />

      <section>
        <h2 className="font-bold text-texto mb-2">Últimas liberações</h2>
        {liberacoes.length === 0 ? (
          <p className="text-sm text-texto-2">Nenhuma liberação ainda.</p>
        ) : (
          <ul className="divide-y divide-borda rounded-2xl border border-borda bg-superficie">
            {liberacoes.map((l) => (
              <li key={l.id} className="flex items-center gap-3 p-3 text-sm">
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-texto">
                    {dataHora.format(new Date(l.liberado_em))}
                  </span>
                  <span className="block text-xs text-texto-2 truncate">
                    ticket {l.ticket_id}
                    {l.competencia && ` · fechado em ${l.competencia}`}
                  </span>
                </span>
                {l.cancelada_em ? (
                  <span className="text-xs font-bold text-texto-2">
                    cancelada
                  </span>
                ) : l.valor_abatido === null ? (
                  // Liberado, mas o carro ainda não saiu — ou saiu sem o
                  // desconto ter sido aplicado. A tela de divergências (Fase 6)
                  // é quem separa os dois casos.
                  <span className="text-xs font-bold text-texto-2">
                    aguardando saída
                  </span>
                ) : (
                  <span className="font-bold text-brand-700">
                    {moeda.format(l.valor_abatido)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Acessos({
  parceiro,
  usuarios,
}: {
  parceiro: Parceiro;
  usuarios: Usuario[];
}) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    criarAcesso,
    null,
  );
  const [abrindo, setAbrindo] = useState(false);
  const [senha, setSenha] = useState(senhaSugerida);
  const [copiado, setCopiado] = useState(false);

  const credencial = estado?.ok ? estado.credencial : undefined;

  useEffect(() => {
    if (!estado) return;
    toast[estado.ok ? "sucesso" : "erro"](estado.msg);
    if (estado.ok) {
      setAbrindo(false);
      setSenha(senhaSugerida());
    }
  }, [estado, toast]);

  const texto = credencial
    ? `Acesso NuvemPark — ${parceiro.nome}\n` +
      `Endereço: ${typeof window !== "undefined" ? window.location.origin : ""}/parceiro\n` +
      `E-mail: ${credencial.email}\n` +
      `Senha: ${credencial.senha}`
    : "";

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-texto">Acessos</h2>
        {!abrindo && (
          <Botao type="button" variante="fantasma" onClick={() => setAbrindo(true)}>
            <UserPlus className="w-4 h-4" /> Novo acesso
          </Botao>
        )}
      </div>

      {/* A senha só existe aqui, uma vez. Depois disto o Supabase guarda só o
          hash — nem o gestor nem nós conseguimos recuperá-la, só trocar. */}
      {credencial && (
        <div className="rounded-2xl border border-brand-300 bg-brand-50 p-4 mb-3">
          <p className="flex items-center gap-2 font-bold text-brand-700 mb-2">
            <KeyRound className="w-4 h-4" /> Copie agora — a senha não aparece
            de novo
          </p>
          <pre className="whitespace-pre-wrap break-all text-sm text-texto font-mono bg-superficie rounded-xl p-3 border border-borda">
            {texto}
          </pre>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(texto);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline"
          >
            {copiado ? (
              <>
                <Check className="w-4 h-4" /> Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copiar tudo
              </>
            )}
          </button>
        </div>
      )}

      {abrindo && (
        <form
          action={agir}
          className="rounded-2xl border border-brand-300 bg-brand-50/40 p-4 mb-3 space-y-3"
        >
          <input type="hidden" name="parceiro_id" value={parceiro.id} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Nome de quem vai usar">
              <Input name="nome" placeholder="Ex.: Balcão" required />
            </Campo>
            <Campo label="E-mail (é o login)">
              <Input name="email" type="email" required />
            </Campo>
          </div>
          <Campo label="Senha (mínimo 8 caracteres)">
            <div className="flex gap-2">
              <Input
                name="senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={8}
                required
              />
              <Botao
                type="button"
                variante="fantasma"
                onClick={() => setSenha(senhaSugerida())}
              >
                Gerar
              </Botao>
            </div>
          </Campo>
          <div className="flex gap-2">
            <Botao carregando={pendente}>Criar acesso</Botao>
            <Botao type="button" variante="fantasma" onClick={() => setAbrindo(false)}>
              Cancelar
            </Botao>
          </div>
        </form>
      )}

      {usuarios.length === 0 ? (
        <div className="rounded-2xl border border-atencao/40 bg-atencao/10 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-atencao shrink-0" />
          <p className="text-sm text-texto-2">
            Nenhum acesso criado — ninguém do parceiro consegue entrar ainda.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-borda rounded-2xl border border-borda bg-superficie">
          {usuarios.map((u) => (
            <li key={u.id} className="flex items-center gap-3 p-3">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-texto truncate">
                  {u.nome}
                </span>
                <span className="block text-xs text-texto-2 truncate">
                  {u.email}
                </span>
              </span>
              <BotaoRemover usuario={u} parceiroId={parceiro.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BotaoRemover({
  usuario,
  parceiroId,
}: {
  usuario: Usuario;
  parceiroId: string;
}) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    removerAcesso,
    null,
  );

  useEffect(() => {
    if (estado) toast[estado.ok ? "sucesso" : "erro"](estado.msg);
  }, [estado, toast]);

  return (
    <form action={agir}>
      <input type="hidden" name="usuario_id" value={usuario.id} />
      <input type="hidden" name="parceiro_id" value={parceiroId} />
      <button
        type="submit"
        disabled={pendente}
        title={`Remover acesso de ${usuario.email}`}
        className="w-9 h-9 grid place-items-center rounded-xl border border-borda text-texto-2 hover:text-perigo hover:border-perigo/40"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </form>
  );
}
