import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Eye, Pencil } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import { ConteudoMarkdown } from "@/components/blog/markdown";
import { FaqPost } from "@/components/blog/faq";
import { Marca } from "@/components/marca";
import { calcularTempoLeitura } from "@/lib/blog";
import { normalizarFaq, type PostCruMaster } from "@/lib/blog-master";
import { dataLonga } from "@/lib/blog-datas";

/**
 * Pré-visualização de um post — inclusive RASCUNHO e ARQUIVADO, que a rota
 * pública /blog/[slug] devolve como 404 (a policy da RLS só entrega
 * `publicado`).
 *
 * ── Por que mora em /master e não em /blog/preview/[id] ──────────────────
 * O plano pedia /blog/preview/[id] com "a mesma guarda de auth do /master".
 * Essa combinação não funciona na topologia atual, por dois motivos
 * independentes:
 *
 *  1. O cookie de sessão master (`np_master`) é gravado com `path: "/master"`.
 *     O navegador simplesmente não o envia para /blog/... — a guarda barraria
 *     o próprio master.
 *  2. Em produção os hosts são separados: o console vive em
 *     painel.nuvempark.com e o site em nuvempark.com. Cookie não atravessa
 *     domínio, e o middleware ainda redireciona qualquer rota não-/master do
 *     host do console de volta para /master.
 *
 * Aqui embaixo de /master os dois problemas somem e a guarda é literalmente a
 * `sessaoMasterAtiva()` pedida. A rota fica FORA do grupo (console) — mesmo
 * padrão de /master/recibo/[id] — para renderizar sem a sidebar.
 *
 * A fidelidade visual vem de reusar os mesmos ConteudoMarkdown e FaqPost das
 * páginas públicas. O que não aparece aqui é o entorno de conversão (CTAs,
 * share, relacionados) — é preview de conteúdo, não da página de vendas.
 */

/** Preview nunca é indexável, nem por acidente. */
export const metadata: Metadata = {
  title: "Pré-visualização | Blog NuvemPark",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const STATUS_ROTULO: Record<string, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export default async function BlogPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Sem sessão master é 404, não 401: a rota não confirma nem a existência do
  // post para quem não deveria estar aqui.
  if (!(await sessaoMasterAtiva())) notFound();

  const { id } = await params;
  const sb = createAdminClient();

  const { data: post } = await sb
    .from("blog_posts")
    .select(
      "id, titulo, slug, resumo, conteudo_md, capa_url, categoria_id, autor_id, destaque, faq, seo_titulo, palavras_chave, status, publicado_em",
    )
    .eq("id", id)
    .maybeSingle<PostCruMaster>();

  if (!post) notFound();

  const [{ data: categoria }, { data: autor }] = await Promise.all([
    post.categoria_id
      ? sb
          .from("blog_categorias")
          .select("nome")
          .eq("id", post.categoria_id)
          .maybeSingle<{ nome: string }>()
      : Promise.resolve({ data: null }),
    post.autor_id
      ? sb
          .from("blog_autores")
          .select("nome")
          .eq("id", post.autor_id)
          .maybeSingle<{ nome: string }>()
      : Promise.resolve({ data: null }),
  ]);

  const minutos = calcularTempoLeitura(post.conteudo_md);
  const faq = normalizarFaq(post.faq).filter((f) => f.pergunta && f.resposta);

  return (
    <div className="min-h-dvh bg-superficie">
      {/* ── Barra de preview (não existe no site) ─────────────────────── */}
      <div className="sticky top-0 z-50 border-b border-aviso/25 bg-aviso-bg">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-black tracking-wide text-aviso uppercase">
            <Eye className="h-3.5 w-3.5" />
            Pré-visualização
          </span>
          <span className="text-[13px] text-texto-2">
            {STATUS_ROTULO[post.status] ?? post.status} · só quem tem sessão
            master vê esta página.
          </span>
          <Link
            href={`/master/blog/${post.id}/editar`}
            className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-bold text-texto transition-colors hover:text-brand-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            Voltar ao editor
          </Link>
        </div>
      </div>

      <article>
        <header className="fundo-mesh border-b border-borda py-10">
          <div className="mx-auto max-w-3xl px-5">
            <p className="text-[13px] text-texto-3">
              Início › Blog{categoria ? ` › ${categoria.nome}` : ""}
            </p>

            <h1 className="mt-4 text-3xl leading-[1.12] font-black tracking-tight text-texto sm:text-[2.75rem]">
              {post.titulo || "(sem título)"}
            </h1>

            {post.resumo && (
              <p className="mt-5 text-lg leading-relaxed text-texto-2">
                {post.resumo}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700"
                  aria-hidden
                >
                  <Marca className="h-4.5 w-4.5" corP="#065F46" />
                </span>
                <span className="text-sm font-bold text-texto">
                  {autor?.nome ?? "Equipe NuvemPark"}
                </span>
              </div>

              <span className="h-4 w-px bg-borda" aria-hidden />

              <span className="text-sm text-texto-2">
                {post.publicado_em
                  ? dataLonga(post.publicado_em)
                  : "sem data de publicação"}
              </span>

              <span className="h-4 w-px bg-borda" aria-hidden />

              <span className="inline-flex items-center gap-1.5 text-sm text-texto-2">
                <Clock className="h-4 w-4" aria-hidden />
                {minutos} min de leitura
              </span>
            </div>
          </div>
        </header>

        {post.capa_url && (
          <div className="mx-auto max-w-4xl px-5 pt-10">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-borda bg-fundo">
              {/* `unoptimized`: a capa pode vir de qualquer host enquanto o post
                  é rascunho; no site público ela sai do nosso Storage e passa
                  pelo next/image otimizado. */}
              <Image
                src={post.capa_url}
                alt={post.titulo}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl px-5 pt-10 pb-20">
          {post.conteudo_md.trim() ? (
            <ConteudoMarkdown markdown={post.conteudo_md} />
          ) : (
            <p className="py-16 text-center text-texto-3">
              Este post ainda não tem conteúdo.
            </p>
          )}

          <FaqPost itens={faq} />
        </div>
      </article>
    </div>
  );
}
