import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Camada de dados do BLOG PÚBLICO (marketing da plataforma).
 *
 * Três regras que valem para o arquivo inteiro:
 *
 * 1. Cliente ANON, sem sessão. Nada aqui usa `cookies()` nem service_role.
 *    Usar `@supabase/ssr` + cookies marcaria as rotas como dinâmicas e mataria
 *    o ISR; usar service_role furaria a RLS num conteúdo que é público de
 *    propósito. Quem filtra rascunho/arquivado é a policy do db/28.
 *
 * 2. Nada quebra o build. Toda função captura erro e devolve vazio/null. As
 *    páginas do blog são pré-renderizadas — se a máquina de build não alcançar
 *    o Supabase, o deploy segue e o conteúdo entra na primeira revalidação.
 *
 * 3. `conteudo_md` NUNCA sai nas listagens. Ele é lido para calcular o tempo de
 *    leitura e descartado no mapeamento, para não inflar o payload RSC dos
 *    cards com o Markdown inteiro de cada post.
 */

export const POSTS_POR_PAGINA = 9;

// ── Tipos ───────────────────────────────────────────────────────────────────

export type BlogCategoria = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  ordem: number;
};

export type BlogAutor = {
  id: string;
  nome: string;
  bio: string | null;
  avatar_url: string | null;
};

export type BlogFaqItem = {
  pergunta: string;
  resposta: string;
};

/** Post sem o Markdown — o que as listagens (home, categoria, busca) devolvem. */
export type BlogPostResumo = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  capa_url: string | null;
  destaque: boolean;
  publicado_em: string;
  atualizado_em: string;
  minutosLeitura: number;
  categoria: BlogCategoria | null;
  autor: BlogAutor | null;
};

/** Post completo — o que a página `/blog/[slug]` renderiza. */
export type BlogPost = BlogPostResumo & {
  conteudo_md: string;
  faq: BlogFaqItem[];
  seo_titulo: string | null;
  palavras_chave: string[];
};

export type ListagemPosts = {
  posts: BlogPostResumo[];
  total: number;
  pagina: number;
  totalPaginas: number;
};

// ── Cliente ─────────────────────────────────────────────────────────────────

/**
 * Cliente anônimo puro (sem persistência de sessão). Instanciado por chamada:
 * é barato, e evita segurar estado entre requisições de um servidor de longa
 * duração.
 */
function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase (URL/ANON_KEY) ausente — blog indisponível.");
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Formatos crus vindos do Postgres ────────────────────────────────────────

type CategoriaCru = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  ordem: number;
};

type AutorCru = {
  id: string;
  nome: string;
  bio: string | null;
  avatar_url: string | null;
};

type PostCru = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  conteudo_md: string;
  capa_url: string | null;
  destaque: boolean;
  publicado_em: string | null;
  atualizado_em: string;
  categoria: CategoriaCru | CategoriaCru[] | null;
  autor: AutorCru | AutorCru[] | null;
};

type PostCruCompleto = PostCru & {
  faq: unknown;
  seo_titulo: string | null;
  palavras_chave: string[] | null;
};

/** Colunas da listagem. `conteudo_md` entra só para medir o tempo de leitura. */
const COLS_RESUMO =
  "id,slug,titulo,resumo,conteudo_md,capa_url,destaque,publicado_em,atualizado_em," +
  "categoria:blog_categorias(id,nome,slug,descricao,ordem)," +
  "autor:blog_autores(id,nome,bio,avatar_url)";

const COLS_COMPLETO = `${COLS_RESUMO},faq,seo_titulo,palavras_chave`;

// ── Normalização ────────────────────────────────────────────────────────────

/**
 * O PostgREST devolve o embed como objeto ou como array de 1, dependendo de
 * como ele infere a cardinalidade da FK. Normalizamos para "objeto ou null".
 */
function um<T>(valor: T | T[] | null): T | null {
  if (valor === null) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

/** ~200 palavras/minuto, mínimo de 1. Markdown cru serve bem de aproximação. */
export function calcularTempoLeitura(markdown: string): number {
  const palavras = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}

/** `faq` é jsonb: valida item a item antes de virar schema FAQPage. */
function parseFaq(valor: unknown): BlogFaqItem[] {
  if (!Array.isArray(valor)) return [];
  const itens: BlogFaqItem[] = [];
  for (const bruto of valor) {
    if (typeof bruto !== "object" || bruto === null) continue;
    const obj = bruto as Record<string, unknown>;
    const { pergunta, resposta } = obj;
    if (typeof pergunta !== "string" || typeof resposta !== "string") continue;
    if (!pergunta.trim() || !resposta.trim()) continue;
    itens.push({ pergunta: pergunta.trim(), resposta: resposta.trim() });
  }
  return itens;
}

function paraResumo(cru: PostCru): BlogPostResumo {
  return {
    id: cru.id,
    slug: cru.slug,
    titulo: cru.titulo,
    resumo: cru.resumo,
    capa_url: cru.capa_url,
    destaque: cru.destaque,
    // A policy só entrega publicado, e publicar preenche a data. O fallback
    // existe só para o tipo não precisar ser nullable no resto do código.
    publicado_em: cru.publicado_em ?? cru.atualizado_em,
    atualizado_em: cru.atualizado_em,
    minutosLeitura: calcularTempoLeitura(cru.conteudo_md),
    categoria: um(cru.categoria),
    autor: um(cru.autor),
  };
}

function paraCompleto(cru: PostCruCompleto): BlogPost {
  return {
    ...paraResumo(cru),
    conteudo_md: cru.conteudo_md,
    faq: parseFaq(cru.faq),
    seo_titulo: cru.seo_titulo,
    palavras_chave: cru.palavras_chave ?? [],
  };
}

const LISTAGEM_VAZIA: ListagemPosts = {
  posts: [],
  total: 0,
  pagina: 1,
  totalPaginas: 1,
};

/** Escapa os curingas do LIKE para uma busca do usuário não virar padrão. */
function escaparLike(termo: string): string {
  return termo.replace(/[%_\\]/g, (c) => `\\${c}`);
}

// ── Consultas ───────────────────────────────────────────────────────────────

/**
 * Lista posts publicados, do mais recente para o mais antigo.
 * `categoriaSlug` filtra por categoria; `busca` casa em título ou resumo.
 */
export async function listarPosts(opcoes?: {
  pagina?: number;
  porPagina?: number;
  categoriaSlug?: string;
  categoriaId?: string;
  busca?: string;
}): Promise<ListagemPosts> {
  const porPagina = Math.max(1, opcoes?.porPagina ?? POSTS_POR_PAGINA);
  const pagina = Math.max(1, Math.trunc(opcoes?.pagina ?? 1));
  const de = (pagina - 1) * porPagina;

  try {
    // Filtro por categoria tem de ser na LINHA, não no embed: `.eq` sobre uma
    // coluna embutida filtra o objeto aninhado e devolve o post com
    // `categoria: null`, em vez de tirá-lo da lista. Por isso resolvemos o slug
    // para o id antes de montar a consulta.
    let categoriaId = opcoes?.categoriaId;
    if (!categoriaId && opcoes?.categoriaSlug) {
      const categoria = await obterCategoriaPorSlug(opcoes.categoriaSlug);
      if (!categoria) return { ...LISTAGEM_VAZIA, pagina };
      categoriaId = categoria.id;
    }

    let q = supa()
      .from("blog_posts")
      .select(COLS_RESUMO, { count: "exact" })
      .eq("status", "publicado")
      .not("publicado_em", "is", null);

    if (categoriaId) q = q.eq("categoria_id", categoriaId);

    if (opcoes?.busca?.trim()) {
      const termo = escaparLike(opcoes.busca.trim());
      q = q.or(`titulo.ilike.%${termo}%,resumo.ilike.%${termo}%`);
    }

    const { data, error, count } = await q
      .order("publicado_em", { ascending: false })
      .range(de, de + porPagina - 1)
      .returns<PostCru[]>();

    if (error) throw error;

    const total = count ?? 0;
    return {
      posts: (data ?? []).map(paraResumo),
      total,
      pagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
    };
  } catch (erro) {
    console.error("[blog] listarPosts falhou:", erro);
    return { ...LISTAGEM_VAZIA, pagina };
  }
}

/** Um post publicado pelo slug. `null` quando não existe (ou não está publicado). */
export async function obterPostPorSlug(slug: string): Promise<BlogPost | null> {
  try {
    const { data, error } = await supa()
      .from("blog_posts")
      .select(COLS_COMPLETO)
      .eq("status", "publicado")
      .eq("slug", slug)
      .maybeSingle<PostCruCompleto>();

    if (error) throw error;
    return data ? paraCompleto(data) : null;
  } catch (erro) {
    console.error(`[blog] obterPostPorSlug(${slug}) falhou:`, erro);
    return null;
  }
}

/** Categorias na ordem definida no banco. */
export async function listarCategorias(): Promise<BlogCategoria[]> {
  try {
    const { data, error } = await supa()
      .from("blog_categorias")
      .select("id,nome,slug,descricao,ordem")
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true })
      .returns<BlogCategoria[]>();

    if (error) throw error;
    return data ?? [];
  } catch (erro) {
    console.error("[blog] listarCategorias falhou:", erro);
    return [];
  }
}

/** Uma categoria pelo slug. `null` quando não existe. */
export async function obterCategoriaPorSlug(
  slug: string,
): Promise<BlogCategoria | null> {
  try {
    const { data, error } = await supa()
      .from("blog_categorias")
      .select("id,nome,slug,descricao,ordem")
      .eq("slug", slug)
      .maybeSingle<BlogCategoria>();

    if (error) throw error;
    return data;
  } catch (erro) {
    console.error(`[blog] obterCategoriaPorSlug(${slug}) falhou:`, erro);
    return null;
  }
}

/**
 * Posts da MESMA categoria, sem o post atual. Se a categoria não render o
 * limite (ou o post não tiver categoria), completa com os mais recentes —
 * o bloco de relacionados nunca aparece pela metade.
 */
export async function postsRelacionados(
  post: Pick<BlogPostResumo, "slug" | "categoria">,
  limite = 3,
): Promise<BlogPostResumo[]> {
  try {
    const cliente = supa();
    const encontrados: BlogPostResumo[] = [];
    const vistos = new Set<string>([post.slug]);

    const acumular = (linhas: PostCru[]) => {
      for (const linha of linhas) {
        if (vistos.has(linha.slug) || encontrados.length >= limite) continue;
        vistos.add(linha.slug);
        encontrados.push(paraResumo(linha));
      }
    };

    if (post.categoria) {
      const { data, error } = await cliente
        .from("blog_posts")
        .select(COLS_RESUMO)
        .eq("status", "publicado")
        .eq("categoria_id", post.categoria.id)
        .neq("slug", post.slug)
        .not("publicado_em", "is", null)
        .order("publicado_em", { ascending: false })
        .limit(limite)
        .returns<PostCru[]>();
      if (error) throw error;
      acumular(data ?? []);
    }

    if (encontrados.length < limite) {
      const { data, error } = await cliente
        .from("blog_posts")
        .select(COLS_RESUMO)
        .eq("status", "publicado")
        .neq("slug", post.slug)
        .not("publicado_em", "is", null)
        .order("publicado_em", { ascending: false })
        .limit(limite + encontrados.length + 1)
        .returns<PostCru[]>();
      if (error) throw error;
      acumular(data ?? []);
    }

    return encontrados;
  } catch (erro) {
    console.error(`[blog] postsRelacionados(${post.slug}) falhou:`, erro);
    return [];
  }
}

/** Todos os posts publicados — usado por sitemap e RSS. */
export async function listarPostsParaFeed(
  limite = 200,
): Promise<BlogPostResumo[]> {
  try {
    const { data, error } = await supa()
      .from("blog_posts")
      .select(COLS_RESUMO)
      .eq("status", "publicado")
      .not("publicado_em", "is", null)
      .order("publicado_em", { ascending: false })
      .limit(limite)
      .returns<PostCru[]>();

    if (error) throw error;
    return (data ?? []).map(paraResumo);
  } catch (erro) {
    console.error("[blog] listarPostsParaFeed falhou:", erro);
    return [];
  }
}

/** O post em destaque mais recente; cai no mais recente publicado se não houver. */
export async function obterPostDestaque(): Promise<BlogPostResumo | null> {
  try {
    const cliente = supa();
    const base = () =>
      cliente
        .from("blog_posts")
        .select(COLS_RESUMO)
        .eq("status", "publicado")
        .not("publicado_em", "is", null)
        .order("publicado_em", { ascending: false })
        .limit(1);

    const { data, error } = await base()
      .eq("destaque", true)
      .returns<PostCru[]>();
    if (error) throw error;
    if (data && data.length > 0) return paraResumo(data[0]);

    const { data: recente, error: erroRecente } = await base().returns<
      PostCru[]
    >();
    if (erroRecente) throw erroRecente;
    return recente && recente.length > 0 ? paraResumo(recente[0]) : null;
  } catch (erro) {
    console.error("[blog] obterPostDestaque falhou:", erro);
    return null;
  }
}
