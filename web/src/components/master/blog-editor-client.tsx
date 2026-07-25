"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  ExternalLink,
  EyeOff,
  Save,
  Send,
  TriangleAlert,
} from "lucide-react";
import {
  salvarPost,
  type FaqItem,
  type PostPayload,
  type ResultadoSalvar,
} from "@/app/master/(console)/blog/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input, Select } from "@/components/ui/campos";
import { EditorMarkdown } from "@/components/master/blog-editor-markdown";
import { PainelSeo } from "@/components/master/blog-editor-seo";
import {
  CampoCapa,
  ChipsPalavrasChave,
  EditorFaq,
} from "@/components/master/blog-editor-campos";
import { slugify } from "@/lib/slug";

/**
 * Editor de post — a mesma tela para criar (`/master/blog/novo`) e editar
 * (`/master/blog/[id]/editar`). A diferença é só o `inicial` vir preenchido.
 */

export type OpcaoSimples = { id: string; nome: string };

export type PostInicial = {
  id: string;
  titulo: string;
  slug: string;
  resumo: string;
  conteudoMd: string;
  capaUrl: string | null;
  categoriaId: string | null;
  autorId: string | null;
  destaque: boolean;
  faq: FaqItem[];
  seoTitulo: string | null;
  palavrasChave: string[];
  status: string;
  publicadoEm: string | null;
};

const CARTAO = "rounded-2xl border border-borda bg-superficie p-5";
const TEXTAREA =
  "w-full rounded-xl border border-borda bg-superficie px-3.5 py-2.5 text-sm " +
  "placeholder:text-texto-3 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 focus:outline-none";

/** Faixa de contagem do resumo: 140–160 é a janela que o Google costuma exibir. */
function corResumo(n: number): string {
  if (n === 0) return "text-texto-3";
  if (n >= 140 && n <= 160) return "text-brand-700";
  if (n >= 120 && n <= 175) return "text-aviso";
  return "text-perigo";
}

export function BlogEditorClient({
  inicial,
  categorias,
  autores,
}: {
  /** `null` = post novo. */
  inicial: PostInicial | null;
  categorias: OpcaoSimples[];
  autores: OpcaoSimples[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [salvando, comecar] = useTransition();

  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [slug, setSlug] = useState(inicial?.slug ?? "");
  const [resumo, setResumo] = useState(inicial?.resumo ?? "");
  const [conteudoMd, setConteudoMd] = useState(inicial?.conteudoMd ?? "");
  const [capaUrl, setCapaUrl] = useState<string | null>(inicial?.capaUrl ?? null);
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? "");
  const [autorId, setAutorId] = useState(
    inicial?.autorId ?? (autores.length === 1 ? autores[0].id : ""),
  );
  const [destaque, setDestaque] = useState(inicial?.destaque ?? false);
  const [faq, setFaq] = useState<FaqItem[]>(inicial?.faq ?? []);
  const [seoTitulo, setSeoTitulo] = useState(inicial?.seoTitulo ?? "");
  const [palavrasChave, setPalavrasChave] = useState<string[]>(
    inicial?.palavrasChave ?? [],
  );

  // Enquanto o post é rascunho e ninguém tocou no slug, ele segue o título.
  // Depois de publicado (ou tocado), o slug é território do autor.
  const [slugTocado, setSlugTocado] = useState(!!inicial);
  const status = inicial?.status ?? "rascunho";
  const jaPublicou = status === "publicado" || !!inicial?.publicadoEm;
  const slugMudou = !!inicial && slugify(slug) !== inicial.slug;

  const [avisoSlug, setAvisoSlug] = useState<string | null>(null);

  // Aviso de saída com alterações não salvas — o editor perde texto longo fácil.
  const [sujo, setSujo] = useState(false);
  useEffect(() => {
    if (!sujo) return;
    const aoSair = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [sujo]);

  const entradaSeo = useMemo(
    () => ({
      titulo,
      resumo,
      conteudoMd,
      capaUrl,
      faqQtd: faq.filter((f) => f.pergunta.trim() && f.resposta.trim()).length,
      palavrasChave,
    }),
    [titulo, resumo, conteudoMd, capaUrl, faq, palavrasChave],
  );

  function enviar(acao: PostPayload["acao"], confirmarTrocaSlug = false) {
    comecar(async () => {
      const payload: PostPayload = {
        id: inicial?.id,
        titulo,
        slug,
        resumo,
        conteudoMd,
        capaUrl,
        categoriaId: categoriaId || null,
        autorId: autorId || null,
        destaque,
        faq,
        seoTitulo: seoTitulo || null,
        palavrasChave,
        acao,
        confirmarTrocaSlug,
      };

      const r: ResultadoSalvar = await salvarPost(payload);
      if (!r) return;

      if (!r.ok) {
        if (r.precisaConfirmarSlug) {
          setAvisoSlug(r.msg);
          toast.erro("Confirme a troca de slug", "Veja o aviso no campo do slug.");
          return;
        }
        toast.erro(r.msg);
        return;
      }

      setSujo(false);
      setAvisoSlug(null);
      toast.sucesso(r.msg);

      if (!inicial) {
        // Post novo: sai da rota /novo e passa a editar o registro criado.
        router.replace(`/master/blog/${r.id}/editar`);
      } else {
        router.refresh();
      }
    });
  }

  /** Marca sujo em qualquer alteração de campo. */
  function mudar<T>(set: (v: T) => void) {
    return (v: T) => {
      setSujo(true);
      set(v);
    };
  }

  const publicado = status === "publicado";
  const arquivado = status === "arquivado";

  return (
    <div className="max-w-6xl space-y-6">
      {/* ── Cabeçalho + ações ─────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="min-w-0">
          <Link
            href="/master/blog"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-texto-2 transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Posts
          </Link>
          <h1 className="mt-2 truncate text-[26px] font-black tracking-tight">
            {inicial ? titulo || "(sem título)" : "Novo post"}
          </h1>
          <p className="text-sm text-texto-2">
            {arquivado
              ? "Arquivado — fora do ar."
              : publicado
                ? "Publicado — no ar em /blog."
                : "Rascunho — invisível para o público."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {inicial && (
            <a
              href={
                publicado
                  ? `/blog/${inicial.slug}`
                  : `/master/blog-preview/${inicial.id}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-borda bg-superficie px-4 text-sm font-bold text-texto-2 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              <ExternalLink className="h-4 w-4" />
              {publicado ? "Ver no site" : "Pré-visualizar"}
            </a>
          )}

          <Botao
            variante="fantasma"
            type="button"
            carregando={salvando}
            onClick={() => enviar("salvar", slugMudou)}
          >
            <Save className="h-4 w-4" />
            {publicado ? "Salvar alterações" : "Salvar rascunho"}
          </Botao>

          {!publicado && (
            <Botao
              type="button"
              carregando={salvando}
              onClick={() => enviar("publicar", slugMudou)}
            >
              <Send className="h-4 w-4" />
              Publicar
            </Botao>
          )}

          {publicado && (
            <Botao
              variante="fantasma"
              type="button"
              carregando={salvando}
              onClick={() => enviar("despublicar")}
            >
              <EyeOff className="h-4 w-4" />
              Despublicar
            </Botao>
          )}

          {inicial && !arquivado && (
            <Botao
              variante="fantasma"
              type="button"
              carregando={salvando}
              onClick={() => enviar("arquivar")}
            >
              <Archive className="h-4 w-4" />
              Arquivar
            </Botao>
          )}
        </div>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Coluna principal ───────────────────────────────────────── */}
        <div className="min-w-0 space-y-6">
          <section className={`${CARTAO} space-y-4`}>
            <Campo label="Título">
              <Input
                value={titulo}
                onChange={(e) => {
                  setSujo(true);
                  setTitulo(e.target.value);
                  if (!slugTocado) setSlug(slugify(e.target.value));
                }}
                placeholder="Como controlar o faturamento do estacionamento"
                maxLength={160}
              />
            </Campo>

            <div>
              <Campo label="Slug (URL do post)">
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSujo(true);
                    setSlugTocado(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="como-controlar-o-faturamento"
                  className="font-mono text-[13px]"
                />
              </Campo>
              <p className="mt-1.5 font-mono text-[11px] text-texto-3">
                /blog/{slugify(slug) || "…"}
              </p>

              {/* A URL antiga pode estar indexada e linkada: trocar o slug de um
                  post publicado quebra tudo isso, e não há redirect automático. */}
              {slugMudou && jaPublicou && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-aviso/25 bg-aviso-bg p-3">
                  <TriangleAlert className="mt-px h-4 w-4 shrink-0 text-aviso" />
                  <div className="text-[12px] leading-snug text-texto">
                    <b>Este post já foi publicado como /blog/{inicial?.slug}.</b>{" "}
                    Trocar o slug quebra a URL indexada pelo Google e os links
                    que apontam para ela — e não existe redirect automático.
                    {avisoSlug && (
                      <span className="mt-1 block text-texto-2">
                        Clique de novo em salvar/publicar para confirmar a troca.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label
                  htmlFor="resumo"
                  className="text-xs font-bold text-texto-2"
                >
                  Resumo (vira a meta description)
                </label>
                <span
                  className={`text-[11px] font-black tabular-nums ${corResumo(resumo.length)}`}
                >
                  {resumo.length}/140–160
                </span>
              </div>
              <textarea
                id="resumo"
                value={resumo}
                onChange={(e) => {
                  setSujo(true);
                  setResumo(e.target.value);
                }}
                rows={3}
                maxLength={260}
                className={TEXTAREA}
                placeholder="Uma frase que explique o que o leitor ganha lendo. É o que aparece no Google e no card de compartilhamento."
              />
            </div>
          </section>

          <EditorMarkdown valor={conteudoMd} aoMudar={mudar(setConteudoMd)} />

          <EditorFaq itens={faq} aoMudar={mudar(setFaq)} />
        </div>

        {/* ── Coluna lateral ─────────────────────────────────────────── */}
        <aside className="space-y-6">
          <PainelSeo entrada={entradaSeo} />

          <section className={`${CARTAO} space-y-4`}>
            <h2 className="font-extrabold">Publicação</h2>

            <Campo label="Categoria">
              <Select
                value={categoriaId}
                onChange={(e) => {
                  setSujo(true);
                  setCategoriaId(e.target.value);
                }}
              >
                <option value="">— sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Campo>

            <Campo label="Autor">
              <Select
                value={autorId}
                onChange={(e) => {
                  setSujo(true);
                  setAutorId(e.target.value);
                }}
              >
                <option value="">— sem autor</option>
                {autores.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </Select>
            </Campo>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={destaque}
                onChange={(e) => {
                  setSujo(true);
                  setDestaque(e.target.checked);
                }}
                className="mt-0.5 h-4 w-4 accent-[var(--color-brand-600)]"
              />
              <span className="text-sm">
                <b className="font-bold">Post em destaque</b>
                <span className="block text-[12px] leading-snug text-texto-2">
                  Ocupa o herói grande no topo do /blog. Só o mais recente
                  marcado aparece lá.
                </span>
              </span>
            </label>
          </section>

          <section className={`${CARTAO} space-y-4`}>
            <h2 className="font-extrabold">Imagem e SEO</h2>

            <CampoCapa url={capaUrl} aoMudar={mudar(setCapaUrl)} />

            <Campo label="Título de SEO (opcional)">
              <Input
                value={seoTitulo}
                onChange={(e) => {
                  setSujo(true);
                  setSeoTitulo(e.target.value);
                }}
                placeholder="Sobrescreve o <title> da página"
                maxLength={160}
              />
            </Campo>

            <ChipsPalavrasChave
              valores={palavrasChave}
              aoMudar={mudar(setPalavrasChave)}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
