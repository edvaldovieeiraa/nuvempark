"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import {
  excluirAutor,
  excluirCategoria,
  salvarAutor,
  salvarCategoria,
  type Resultado,
} from "@/app/master/(console)/blog/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/campos";
import { Confirmar } from "@/components/ui/confirmar";
import { slugify } from "@/lib/slug";

export type CategoriaRow = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  ordem: number;
  posts: number;
};

export type AutorRow = {
  id: string;
  nome: string;
  bio: string | null;
  avatarUrl: string | null;
  posts: number;
};

const CARTAO = "rounded-2xl border border-borda bg-superficie p-5 sm:p-6";
const TEXTAREA =
  "w-full min-h-[76px] rounded-xl border border-borda bg-superficie px-3.5 py-2.5 text-sm " +
  "placeholder:text-texto-3 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 focus:outline-none";

// ═══════════════════════════════════════════════════════ Form de categoria ══

function FormCategoria({
  inicial,
  aoFechar,
}: {
  /** `null` = criando. */
  inicial: CategoriaRow | null;
  aoFechar: () => void;
}) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    salvarCategoria,
    null,
  );

  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [slug, setSlug] = useState(inicial?.slug ?? "");
  // Enquanto o autor não mexer no slug, ele acompanha o nome. Depois de tocado,
  // para de ser sobrescrito — categoria já publicada tem URL que não se troca à toa.
  const [slugTocado, setSlugTocado] = useState(!!inicial);

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso(estado.msg);
      aoFechar();
    } else {
      toast.erro(estado.msg);
    }
  }, [estado, toast, aoFechar]);

  return (
    <form action={agir} className="space-y-3">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nome">
          <Input
            name="nome"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (!slugTocado) setSlug(slugify(e.target.value));
            }}
            placeholder="Gestão de Estacionamento"
            required
            maxLength={80}
          />
        </Campo>
        <Campo label="Slug (vai para a URL)">
          <Input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTocado(true);
              setSlug(e.target.value);
            }}
            placeholder="gestao-de-estacionamento"
            className="font-mono text-[13px]"
          />
        </Campo>
      </div>

      <Campo label="Descrição (aparece no topo da página da categoria)">
        <textarea
          name="descricao"
          defaultValue={inicial?.descricao ?? ""}
          maxLength={240}
          className={TEXTAREA}
          placeholder="Rotina do pátio, equipe, tarifas e controle de fluxo."
        />
      </Campo>

      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Campo label="Ordem">
          <Input
            name="ordem"
            type="number"
            defaultValue={inicial?.ordem ?? 0}
            min={0}
            max={999}
          />
        </Campo>
      </div>

      <div className="flex gap-2 pt-1">
        <Botao carregando={pendente}>
          {inicial ? "Salvar alterações" : "Criar categoria"}
        </Botao>
        <Botao variante="fantasma" type="button" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════ Form de autor ══

function FormAutor({
  inicial,
  aoFechar,
}: {
  inicial: AutorRow | null;
  aoFechar: () => void;
}) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    salvarAutor,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso(estado.msg);
      aoFechar();
    } else {
      toast.erro(estado.msg);
    }
  }, [estado, toast, aoFechar]);

  return (
    <form action={agir} className="space-y-3">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nome">
          <Input
            name="nome"
            defaultValue={inicial?.nome ?? ""}
            placeholder="Equipe NuvemPark"
            required
            maxLength={80}
          />
        </Campo>
        <Campo label="Avatar (URL)">
          <Input
            name="avatar_url"
            type="url"
            defaultValue={inicial?.avatarUrl ?? ""}
            placeholder="https://..."
          />
        </Campo>
      </div>

      <Campo label="Bio">
        <textarea
          name="bio"
          defaultValue={inicial?.bio ?? ""}
          maxLength={400}
          className={TEXTAREA}
          placeholder="Quem constrói o NuvemPark todo dia."
        />
      </Campo>

      <div className="flex gap-2 pt-1">
        <Botao carregando={pendente}>
          {inicial ? "Salvar alterações" : "Criar autor"}
        </Botao>
        <Botao variante="fantasma" type="button" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════ Tela ══

export function BlogTaxonomiaClient({
  categorias,
  autores,
}: {
  categorias: CategoriaRow[];
  autores: AutorRow[];
}) {
  const toast = useToast();

  // `null` = fechado · "novo" = criando · string = id em edição.
  const [editCategoria, setEditCategoria] = useState<string | null>(null);
  const [editAutor, setEditAutor] = useState<string | null>(null);


  const avisoExclusao = (posts: number, tipo: "categoria" | "autor") =>
    posts > 0
      ? `${posts} ${posts === 1 ? "post usa" : "posts usam"} ${tipo === "categoria" ? "esta categoria" : "este autor"}. Os posts NÃO são apagados — eles ficam sem ${tipo} e continuam no ar.`
      : `Nenhum post usa ${tipo === "categoria" ? "esta categoria" : "este autor"}.`;

  return (
    <div className="max-w-5xl space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href="/master/blog"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-texto-2 transition-colors hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para os posts
        </Link>
        <h1 className="mt-3 text-[26px] font-black tracking-tight">
          Categorias e autores
        </h1>
        <p className="text-sm text-texto-2">
          A categoria vira uma página própria em /blog/categoria/&lt;slug&gt; e
          entra no sitemap.
        </p>
      </motion.header>

      {/* ── Categorias ────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold">
            Categorias{" "}
            <span className="text-sm font-semibold text-texto-3">
              ({categorias.length})
            </span>
          </h2>
          {editCategoria !== "novo" && (
            <button
              type="button"
              onClick={() => setEditCategoria("novo")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-borda bg-superficie px-3 text-sm font-bold text-texto-2 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              <Plus className="h-4 w-4" />
              Nova
            </button>
          )}
        </div>

        {editCategoria === "novo" && (
          <div className={`${CARTAO} border-brand-200 bg-brand-50/40`}>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-extrabold">Nova categoria</p>
              <button
                type="button"
                onClick={() => setEditCategoria(null)}
                aria-label="Fechar"
                className="grid h-8 w-8 place-items-center rounded-lg text-texto-3 hover:bg-superficie hover:text-texto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <FormCategoria inicial={null} aoFechar={() => setEditCategoria(null)} />
          </div>
        )}

        <div className="space-y-2">
          {categorias.map((c) =>
            editCategoria === c.id ? (
              <div key={c.id} className={`${CARTAO} border-brand-200`}>
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-extrabold">Editando “{c.nome}”</p>
                  <button
                    type="button"
                    onClick={() => setEditCategoria(null)}
                    aria-label="Fechar"
                    className="grid h-8 w-8 place-items-center rounded-lg text-texto-3 hover:bg-fundo hover:text-texto"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <FormCategoria
                  inicial={c}
                  aoFechar={() => setEditCategoria(null)}
                />
              </div>
            ) : (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-borda bg-superficie px-4 py-3"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-black text-brand-700">
                  {c.ordem}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-texto">{c.nome}</p>
                  <p className="truncate font-mono text-[11px] text-texto-3">
                    /blog/categoria/{c.slug}
                  </p>
                </div>
                <span className="text-xs font-semibold text-texto-2">
                  {c.posts} {c.posts === 1 ? "post" : "posts"}
                </span>
                <button
                  type="button"
                  onClick={() => setEditCategoria(c.id)}
                  aria-label={`Editar ${c.nome}`}
                  className="grid h-9 w-9 place-items-center rounded-lg text-texto-2 transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <Confirmar
                  titulo={`Excluir a categoria “${c.nome}”?`}
                  descricao={avisoExclusao(c.posts, "categoria")}
                  rotuloConfirmar="Excluir"
                  aoConfirmar={async () => {
                    const r = await excluirCategoria(c.id);
                    if (r?.ok) toast.sucesso(r.msg);
                    else if (r) toast.erro(r.msg);
                  }}
                >
                  {(abrir) => (
                    <button
                      type="button"
                      onClick={abrir}
                      aria-label={`Excluir ${c.nome}`}
                      className="grid h-9 w-9 place-items-center rounded-lg text-texto-2 transition-colors hover:bg-perigo-bg hover:text-perigo disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </Confirmar>
              </div>
            ),
          )}
          {categorias.length === 0 && (
            <p className="rounded-2xl border border-dashed border-borda px-4 py-8 text-center text-sm text-texto-2">
              Nenhuma categoria ainda.
            </p>
          )}
        </div>
      </section>

      {/* ── Autores ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold">
            Autores{" "}
            <span className="text-sm font-semibold text-texto-3">
              ({autores.length})
            </span>
          </h2>
          {editAutor !== "novo" && (
            <button
              type="button"
              onClick={() => setEditAutor("novo")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-borda bg-superficie px-3 text-sm font-bold text-texto-2 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              <Plus className="h-4 w-4" />
              Novo
            </button>
          )}
        </div>

        {editAutor === "novo" && (
          <div className={`${CARTAO} border-brand-200 bg-brand-50/40`}>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-extrabold">Novo autor</p>
              <button
                type="button"
                onClick={() => setEditAutor(null)}
                aria-label="Fechar"
                className="grid h-8 w-8 place-items-center rounded-lg text-texto-3 hover:bg-superficie hover:text-texto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <FormAutor inicial={null} aoFechar={() => setEditAutor(null)} />
          </div>
        )}

        <div className="space-y-2">
          {autores.map((a) =>
            editAutor === a.id ? (
              <div key={a.id} className={`${CARTAO} border-brand-200`}>
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-extrabold">Editando “{a.nome}”</p>
                  <button
                    type="button"
                    onClick={() => setEditAutor(null)}
                    aria-label="Fechar"
                    className="grid h-8 w-8 place-items-center rounded-lg text-texto-3 hover:bg-fundo hover:text-texto"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <FormAutor inicial={a} aoFechar={() => setEditAutor(null)} />
              </div>
            ) : (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-borda bg-superficie px-4 py-3"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fundo">
                  <UserRound className="h-4 w-4 text-texto-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-texto">{a.nome}</p>
                  {a.bio && (
                    <p className="truncate text-[12px] text-texto-3">{a.bio}</p>
                  )}
                </div>
                <span className="text-xs font-semibold text-texto-2">
                  {a.posts} {a.posts === 1 ? "post" : "posts"}
                </span>
                <button
                  type="button"
                  onClick={() => setEditAutor(a.id)}
                  aria-label={`Editar ${a.nome}`}
                  className="grid h-9 w-9 place-items-center rounded-lg text-texto-2 transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <Confirmar
                  titulo={`Excluir o autor “${a.nome}”?`}
                  descricao={avisoExclusao(a.posts, "autor")}
                  rotuloConfirmar="Excluir"
                  aoConfirmar={async () => {
                    const r = await excluirAutor(a.id);
                    if (r?.ok) toast.sucesso(r.msg);
                    else if (r) toast.erro(r.msg);
                  }}
                >
                  {(abrir) => (
                    <button
                      type="button"
                      onClick={abrir}
                      aria-label={`Excluir ${a.nome}`}
                      className="grid h-9 w-9 place-items-center rounded-lg text-texto-2 transition-colors hover:bg-perigo-bg hover:text-perigo disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </Confirmar>
              </div>
            ),
          )}
          {autores.length === 0 && (
            <p className="rounded-2xl border border-dashed border-borda px-4 py-8 text-center text-sm text-texto-2">
              Nenhum autor ainda.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
