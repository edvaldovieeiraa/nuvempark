"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Archive,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  Tags,
} from "lucide-react";
import {
  arquivarPost,
  restaurarPost,
  type Resultado,
} from "@/app/master/(console)/blog/actions";
import { useToast } from "@/components/ui/toast";
import { Input, Select } from "@/components/ui/campos";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Confirmar } from "@/components/ui/confirmar";
import { formatarData } from "@/lib/format-data";

export type CategoriaOpcao = { id: string; nome: string; slug: string };

export type PostRow = {
  id: string;
  slug: string;
  titulo: string;
  status: string;
  destaque: boolean;
  publicadoEm: string | null;
  atualizadoEm: string;
  categoriaId: string | null;
  categoriaNome: string | null;
  autorNome: string | null;
};

const STATUS: Record<string, { cls: string; rotulo: string }> = {
  rascunho: { cls: "bg-fundo text-texto-2 border-borda", rotulo: "Rascunho" },
  publicado: {
    cls: "bg-brand-50 text-brand-700 border-brand-200",
    rotulo: "Publicado",
  },
  arquivado: { cls: "bg-aviso-bg text-aviso border-aviso/25", rotulo: "Arquivado" },
};

function BadgeStatus({ status }: { status: string }) {
  const it = STATUS[status] ?? {
    cls: "bg-fundo text-texto-3 border-borda",
    rotulo: status,
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${it.cls}`}
    >
      {it.rotulo}
    </span>
  );
}

export function BlogPostsClient({
  posts,
  categorias,
}: {
  posts: PostRow[];
  categorias: CategoriaOpcao[];
}) {
  const toast = useToast();
  const [pendente, comecar] = useTransition();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [categoria, setCategoria] = useState("");

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return posts
      .filter((p) => !status || p.status === status)
      .filter((p) => !categoria || p.categoriaId === categoria)
      .filter(
        (p) =>
          !termo ||
          p.titulo.toLowerCase().includes(termo) ||
          p.slug.includes(termo),
      );
  }, [posts, busca, status, categoria]);

  const publicados = posts.filter((p) => p.status === "publicado").length;
  const rascunhos = posts.filter((p) => p.status === "rascunho").length;

  function executar(acao: () => Promise<Resultado>) {
    comecar(async () => {
      const r = await acao();
      if (!r) return;
      if (r.ok) toast.sucesso(r.msg);
      else toast.erro(r.msg);
    });
  }

  return (
    <div className="max-w-6xl space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Blog</h1>
          <p className="text-sm text-texto-2">
            {posts.length} {posts.length === 1 ? "post" : "posts"} ·{" "}
            <b className="text-brand-700">{publicados}</b> no ar
            {rascunhos > 0 && (
              <>
                {" · "}
                {rascunhos} {rascunhos === 1 ? "rascunho" : "rascunhos"}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/master/blog/categorias"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-borda bg-superficie px-4 text-sm font-bold text-texto-2 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            <Tags className="h-4 w-4" />
            Categorias e autores
          </Link>
          <Link
            href="/master/blog/novo"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition-all hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Novo post
          </Link>
        </div>
      </motion.header>

      {/* ── Filtros ───────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-texto-3" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou slug..."
            className="pl-10"
            aria-label="Buscar posts"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="publicado">Publicado</option>
          <option value="arquivado">Arquivado</option>
        </Select>
        <Select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
      </div>

      {/* ── Tabela ────────────────────────────────────────────────────── */}
      {visiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-borda bg-superficie px-6 py-16 text-center">
          <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-fundo">
            <FileText className="h-5 w-5 text-texto-3" />
          </span>
          <p className="mt-4 font-extrabold text-texto">
            {posts.length === 0
              ? "Nenhum post ainda"
              : "Nenhum post com esses filtros"}
          </p>
          <p className="mt-1 text-sm text-texto-2">
            {posts.length === 0
              ? "Crie o primeiro artigo do blog."
              : "Ajuste a busca ou os filtros acima."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-borda bg-superficie">
          <ResponsiveTable>
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-fundo">
                <tr className="text-left text-[11px] font-black tracking-wide text-texto-2 uppercase">
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Destaque</th>
                  <th className="px-4 py-3">Publicado em</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-borda transition-colors hover:bg-fundo/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/master/blog/${p.id}/editar`}
                        className="font-bold text-texto transition-colors hover:text-brand-700"
                      >
                        {p.titulo}
                      </Link>
                      <div className="font-mono text-[11px] text-texto-3">
                        /{p.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-texto-2">
                      {p.categoriaNome ?? (
                        <span className="text-texto-3">— sem categoria</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeStatus status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.destaque ? (
                        <Star
                          className="mx-auto h-4 w-4 fill-aviso text-aviso"
                          aria-label="Em destaque"
                        />
                      ) : (
                        <span className="text-texto-3">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-texto-2">
                      {p.publicadoEm ? (
                        formatarData(p.publicadoEm)
                      ) : (
                        <span className="text-texto-3">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/master/blog/${p.id}/editar`}
                          title="Editar"
                          aria-label={`Editar ${p.titulo}`}
                          className="grid h-9 w-9 place-items-center rounded-lg text-texto-2 transition-colors hover:bg-brand-50 hover:text-brand-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>

                        {/* Só faz sentido "ver no site" o que está no ar: a
                            rota pública devolve 404 para rascunho/arquivado. */}
                        {p.status === "publicado" && (
                          <a
                            href={`/blog/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver no site"
                            aria-label={`Ver ${p.titulo} no site`}
                            className="grid h-9 w-9 place-items-center rounded-lg text-texto-2 transition-colors hover:bg-brand-50 hover:text-brand-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}

                        {p.status === "arquivado" ? (
                          <button
                            type="button"
                            disabled={pendente}
                            onClick={() => executar(() => restaurarPost(p.id))}
                            title="Restaurar como rascunho"
                            aria-label={`Restaurar ${p.titulo}`}
                            className="grid h-9 w-9 place-items-center rounded-lg text-texto-2 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <Confirmar
                            titulo="Arquivar este post?"
                            descricao={`"${p.titulo}" sai do ar imediatamente e some do /blog. Ele continua aqui no console e pode ser restaurado como rascunho depois.`}
                            rotuloConfirmar="Arquivar"
                            aoConfirmar={async () => {
                              const r = await arquivarPost(p.id);
                              if (r?.ok) toast.sucesso(r.msg);
                              else if (r) toast.erro(r.msg);
                            }}
                          >
                            {(abrir) => (
                              <button
                                type="button"
                                onClick={abrir}
                                title="Arquivar"
                                aria-label={`Arquivar ${p.titulo}`}
                                className="grid h-9 w-9 place-items-center rounded-lg text-texto-2 transition-colors hover:bg-aviso-bg hover:text-aviso"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            )}
                          </Confirmar>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>
      )}
    </div>
  );
}
