"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import { revalidarBlog } from "@/lib/blog-revalidar";
import { slugify, slugValido } from "@/lib/slug";

/**
 * Server Actions do blog no console master.
 *
 * REGRA DE OURO: só aqui (e no resto de /master) o service_role é permitido.
 * Toda ação começa conferindo a sessão master — o admin client fura a RLS, e a
 * única coisa entre ele e o mundo é este gate. Nenhuma dessas funções é
 * alcançável do site público.
 */

/**
 * `aviso` carrega um problema NÃO-fatal — hoje só um: a revalidação do blog
 * público caiu na rede local em vez de passar pela rota HTTP. A ação deu certo,
 * mas a tela precisa dizer isso em vez de fingir que está tudo redondo.
 */
export type Resultado =
  | { ok: true; msg: string; aviso?: string }
  | { ok: false; msg: string }
  | null;

/** Resultado do salvamento: devolve id/slug para o editor seguir a navegação. */
export type ResultadoSalvar =
  | { ok: true; msg: string; id: string; slug: string; status: string; aviso?: string }
  | { ok: false; msg: string; precisaConfirmarSlug?: true }
  | null;

const ROTA = "/master/blog";
const ROTA_TAXONOMIA = "/master/blog/categorias";
const UNIQUE_VIOLATION = "23505";

/**
 * Guarda comum. Devolve `null` quando pode seguir, ou o erro pronto.
 * O retorno é só o ramo de ERRO (nunca `{ok:true}`) para servir tanto a
 * `Resultado` quanto a `ResultadoSalvar`, que têm sucessos diferentes.
 */
async function bloqueado(): Promise<{ ok: false; msg: string } | null> {
  if (!(await sessaoMasterAtiva())) {
    return { ok: false, msg: "Sessão master expirada. Entre de novo." };
  }
  return null;
}

function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
}

function inteiro(fd: FormData, campo: string): number {
  const n = Number(texto(fd, campo));
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

// ═════════════════════════════════════════════════════════ Salvar um post ══

export type FaqItem = { pergunta: string; resposta: string };

/**
 * O que o editor manda. É um objeto (não FormData) de propósito: `faq` e
 * `palavras_chave` são listas, e serializar lista em FormData vira gambiarra.
 */
export type PostPayload = {
  /** Ausente = criando. */
  id?: string;
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
  /**
   * `salvar` mantém o status atual (post novo nasce rascunho). As outras três
   * são transições explícitas — nenhuma delas acontece por efeito colateral
   * de salvar.
   */
  acao: "salvar" | "publicar" | "despublicar" | "arquivar";
  /** Autorização explícita para trocar o slug de um post já publicado. */
  confirmarTrocaSlug?: boolean;
};

/** Só o que interessa do post atual para decidir status, slug e publicado_em. */
type PostAtual = {
  slug: string;
  status: string;
  publicado_em: string | null;
};

/**
 * Cria ou atualiza um post e aplica a transição de status pedida.
 *
 * Duas regras que moram AQUI e não na tela:
 *
 * 1. `publicado_em` é gravado só na PRIMEIRA publicação
 *    (`coalesce(publicado_em, now())`). Republicar não reescreve a data — ela
 *    é o `datePublished` do schema Article e a ordenação do blog inteiro.
 *
 * 2. Trocar o slug de um post publicado exige `confirmarTrocaSlug`. A URL
 *    antiga já pode estar indexada no Google e linkada por terceiros; a troca
 *    a quebra sem redirect. O servidor recusa e devolve
 *    `precisaConfirmarSlug` para a tela perguntar.
 */
export async function salvarPost(
  payload: PostPayload,
): Promise<ResultadoSalvar> {
  const barrado = await bloqueado();
  if (barrado) return barrado;

  const titulo = payload.titulo.trim();
  const resumo = payload.resumo.trim();
  const conteudo = payload.conteudoMd.trim();

  if (!titulo) return { ok: false, msg: "O título é obrigatório." };
  if (!resumo) return { ok: false, msg: "O resumo é obrigatório — ele vira a meta description." };
  if (!conteudo) return { ok: false, msg: "O conteúdo do post está vazio." };

  const slug = slugify(payload.slug || titulo);
  if (!slugValido(slug)) {
    return { ok: false, msg: "Slug inválido — use letras, números e hífens." };
  }
  // Rotas irmãs de /blog vencem a rota dinâmica [slug]: um post com um desses
  // slugs ficaria inalcançável no site.
  if (["categoria", "pagina", "busca", "rss.xml", "preview"].includes(slug)) {
    return { ok: false, msg: `"${slug}" é uma rota reservada do blog. Escolha outro slug.` };
  }

  const sb = createAdminClient();

  let atual: PostAtual | null = null;
  if (payload.id) {
    const { data } = await sb
      .from("blog_posts")
      .select("slug, status, publicado_em")
      .eq("id", payload.id)
      .maybeSingle<PostAtual>();
    if (!data) return { ok: false, msg: "Post não encontrado." };
    atual = data;
  }

  // Guarda da URL indexada.
  const jaPublicou = !!atual && (atual.status === "publicado" || !!atual.publicado_em);
  if (atual && slug !== atual.slug && jaPublicou && !payload.confirmarTrocaSlug) {
    return {
      ok: false,
      precisaConfirmarSlug: true,
      msg: `Este post já foi publicado como /blog/${atual.slug}. Trocar o slug quebra a URL que o Google indexou e os links que apontam para ela.`,
    };
  }

  // Status resultante.
  const statusAtual = atual?.status ?? "rascunho";
  const status =
    payload.acao === "publicar"
      ? "publicado"
      : payload.acao === "despublicar"
        ? "rascunho"
        : payload.acao === "arquivar"
          ? "arquivado"
          : statusAtual;

  const faq = payload.faq
    .map((f) => ({ pergunta: f.pergunta.trim(), resposta: f.resposta.trim() }))
    .filter((f) => f.pergunta && f.resposta);

  const palavrasChave = Array.from(
    new Set(payload.palavrasChave.map((p) => p.trim()).filter(Boolean)),
  );

  const linha = {
    titulo,
    slug,
    resumo,
    conteudo_md: conteudo,
    capa_url: payload.capaUrl?.trim() || null,
    categoria_id: payload.categoriaId || null,
    autor_id: payload.autorId || null,
    destaque: payload.destaque,
    faq,
    seo_titulo: payload.seoTitulo?.trim() || null,
    palavras_chave: palavrasChave,
    status,
    // Primeira publicação carimba a data; as seguintes preservam a original.
    publicado_em:
      status === "publicado"
        ? (atual?.publicado_em ?? new Date().toISOString())
        : (atual?.publicado_em ?? null),
  };

  const { data, error } = payload.id
    ? await sb
        .from("blog_posts")
        .update(linha)
        .eq("id", payload.id)
        .select("id, slug, status")
        .single()
    : await sb.from("blog_posts").insert(linha).select("id, slug, status").single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, msg: `Já existe um post com o slug "${slug}".` };
    }
    console.error("[master/blog] salvarPost:", error);
    return { ok: false, msg: "Não consegui salvar o post." };
  }

  revalidatePath(ROTA);

  const msg =
    payload.acao === "publicar"
      ? "Post publicado."
      : payload.acao === "despublicar"
        ? "Post despublicado — voltou para rascunho."
        : payload.acao === "arquivar"
          ? "Post arquivado."
          : "Alterações salvas.";

  // Só mexe no cache público quando a mudança é visível de fora: publicar,
  // despublicar, arquivar, ou salvar um post que ESTÁ no ar. Editar rascunho
  // não muda nada no /blog e não precisa derrubar cache de ninguém.
  const afetaPublico =
    payload.acao !== "salvar" || status === "publicado" || jaPublicou;

  let aviso: string | undefined;
  if (afetaPublico) {
    // Slug trocado: a URL ANTIGA também precisa sair do cache, senão o post
    // continua respondendo no endereço velho até a revalidação por tempo.
    if (atual && atual.slug !== slug) {
      await revalidarBlog(atual.slug);
    }
    const r = await revalidarBlog(slug);
    if (r.via === "local") aviso = r.motivo;
  }

  return { ok: true, msg, id: data.id, slug: data.slug, status: data.status, aviso };
}

// ════════════════════════════════════════════════════════ Upload de capa ══

const MIMES_CAPA = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const TAMANHO_MAX = 5 * 1024 * 1024; // casa com o file_size_limit do bucket

export type ResultadoUpload =
  | { ok: true; url: string }
  | { ok: false; msg: string };

/**
 * Sobe a capa para o bucket `blog-assets` com o admin client.
 *
 * O bucket é público para leitura e NÃO tem policy de escrita (db/29) — este
 * é o único caminho de upload que existe. As validações abaixo são a primeira
 * barreira; o bucket repete o limite de tamanho e a lista de mime como rede.
 */
export async function enviarCapa(fd: FormData): Promise<ResultadoUpload> {
  if (!(await sessaoMasterAtiva())) {
    return { ok: false, msg: "Sessão master expirada. Entre de novo." };
  }

  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, msg: "Nenhum arquivo recebido." };
  }
  if (!MIMES_CAPA.includes(arquivo.type)) {
    return { ok: false, msg: "Formato não aceito. Use JPG, PNG, WebP, AVIF ou GIF." };
  }
  if (arquivo.size > TAMANHO_MAX) {
    return { ok: false, msg: "Imagem acima de 5 MB. Comprima antes de subir." };
  }

  // Nome final: uuid + nome higienizado. O uuid evita colisão e impede que
  // alguém sobrescreva a capa de outro post adivinhando o nome do arquivo.
  const extensao = (arquivo.name.split(".").pop() ?? "jpg").toLowerCase();
  const base = slugify(arquivo.name.replace(/\.[^.]+$/, ""), 40) || "capa";
  const caminho = `capas/${crypto.randomUUID()}-${base}.${extensao.replace(/[^a-z0-9]/g, "")}`;

  const sb = createAdminClient();
  const { error } = await sb.storage
    .from("blog-assets")
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });

  if (error) {
    console.error("[master/blog] enviarCapa:", error);
    return {
      ok: false,
      msg: `Falha no upload: ${error.message}. O bucket "blog-assets" existe? (db/29)`,
    };
  }

  const { data } = sb.storage.from("blog-assets").getPublicUrl(caminho);
  return { ok: true, url: data.publicUrl };
}

// ═══════════════════════════════════════════════════ Ciclo de vida do post ══

/**
 * Arquiva um post: sai do ar imediatamente (a policy pública só entrega
 * `publicado`), mas continua no console e mantém `publicado_em` — se for
 * restaurado e republicado, a data original de publicação é preservada.
 */
export async function arquivarPost(postId: string): Promise<Resultado> {
  const barrado = await bloqueado();
  if (barrado) return barrado;

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("blog_posts")
    .update({ status: "arquivado" })
    .eq("id", postId)
    .select("slug, status")
    .single();

  if (error) {
    console.error("[master/blog] arquivarPost:", error);
    return { ok: false, msg: "Não consegui arquivar o post." };
  }

  revalidatePath(ROTA);
  // Sem isto o post arquivado continuaria servido do cache ISR até 5 min.
  const r = await revalidarBlog(data.slug);

  return {
    ok: true,
    msg: "Post arquivado — saiu do ar.",
    aviso: r.via === "local" ? r.motivo : undefined,
  };
}

/**
 * Desarquiva para RASCUNHO, nunca direto para publicado.
 * Restaurar não pode ser um jeito silencioso de pôr conteúdo no ar de novo:
 * quem quiser publicar abre o post e clica em Publicar.
 */
export async function restaurarPost(postId: string): Promise<Resultado> {
  const barrado = await bloqueado();
  if (barrado) return barrado;

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("blog_posts")
    .update({ status: "rascunho" })
    .eq("id", postId)
    .select("slug")
    .single();

  if (error) {
    console.error("[master/blog] restaurarPost:", error);
    return { ok: false, msg: "Não consegui restaurar o post." };
  }

  revalidatePath(ROTA);
  const r = await revalidarBlog(data.slug);

  return {
    ok: true,
    msg: "Post restaurado como rascunho.",
    aviso: r.via === "local" ? r.motivo : undefined,
  };
}

// ═════════════════════════════════════════════════════════════ Categorias ══

/**
 * Cria ou atualiza uma categoria. `id` vazio = criação.
 * O slug vem do formulário (editável) mas é normalizado aqui: o que o autor
 * digitou é sugestão, o que vai para a URL passa pelo mesmo slugify de sempre.
 */
export async function salvarCategoria(
  _prev: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const barrado = await bloqueado();
  if (barrado) return barrado;

  const id = texto(fd, "id");
  const nome = texto(fd, "nome");
  if (!nome) return { ok: false, msg: "O nome da categoria é obrigatório." };

  const slug = slugify(texto(fd, "slug") || nome);
  if (!slugValido(slug)) {
    return { ok: false, msg: "Slug inválido — use letras, números e hífens." };
  }

  const linha = {
    nome,
    slug,
    descricao: texto(fd, "descricao") || null,
    ordem: inteiro(fd, "ordem"),
  };

  const sb = createAdminClient();
  const { error } = id
    ? await sb.from("blog_categorias").update(linha).eq("id", id)
    : await sb.from("blog_categorias").insert(linha);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, msg: `Já existe uma categoria com o slug "${slug}".` };
    }
    console.error("[master/blog] salvarCategoria:", error);
    return { ok: false, msg: "Não consegui salvar a categoria." };
  }

  revalidatePath(ROTA_TAXONOMIA);
  revalidatePath(ROTA);
  // A categoria aparece nas pílulas do /blog, tem página própria e entra no
  // sitemap — mexer nela é mudança visível no site.
  const rev = await revalidarBlog();

  return {
    ok: true,
    msg: id ? "Categoria atualizada." : "Categoria criada.",
    aviso: rev.via === "local" ? rev.motivo : undefined,
  };
}

/**
 * Exclui uma categoria. Os posts dela NÃO são apagados: a FK é
 * `on delete set null`, então eles ficam sem categoria e continuam no ar.
 */
export async function excluirCategoria(id: string): Promise<Resultado> {
  const barrado = await bloqueado();
  if (barrado) return barrado;

  const sb = createAdminClient();
  const { count } = await sb
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", id);

  const { error } = await sb.from("blog_categorias").delete().eq("id", id);
  if (error) {
    console.error("[master/blog] excluirCategoria:", error);
    return { ok: false, msg: "Não consegui excluir a categoria." };
  }

  revalidatePath(ROTA_TAXONOMIA);
  revalidatePath(ROTA);
  const rev = await revalidarBlog();

  return {
    ok: true,
    msg:
      count && count > 0
        ? `Categoria excluída. ${count} ${count === 1 ? "post ficou" : "posts ficaram"} sem categoria.`
        : "Categoria excluída.",
    aviso: rev.via === "local" ? rev.motivo : undefined,
  };
}

// ════════════════════════════════════════════════════════════════ Autores ══

export async function salvarAutor(
  _prev: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const barrado = await bloqueado();
  if (barrado) return barrado;

  const id = texto(fd, "id");
  const nome = texto(fd, "nome");
  if (!nome) return { ok: false, msg: "O nome do autor é obrigatório." };

  const linha = {
    nome,
    bio: texto(fd, "bio") || null,
    avatar_url: texto(fd, "avatar_url") || null,
  };

  const sb = createAdminClient();
  const { error } = id
    ? await sb.from("blog_autores").update(linha).eq("id", id)
    : await sb.from("blog_autores").insert(linha);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, msg: `Já existe um autor chamado "${nome}".` };
    }
    console.error("[master/blog] salvarAutor:", error);
    return { ok: false, msg: "Não consegui salvar o autor." };
  }

  revalidatePath(ROTA_TAXONOMIA);
  revalidatePath(ROTA);
  return { ok: true, msg: id ? "Autor atualizado." : "Autor criado." };
}

/** Exclui um autor. Posts dele ficam sem autor (FK `on delete set null`). */
export async function excluirAutor(id: string): Promise<Resultado> {
  const barrado = await bloqueado();
  if (barrado) return barrado;

  const sb = createAdminClient();
  const { count } = await sb
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("autor_id", id);

  const { error } = await sb.from("blog_autores").delete().eq("id", id);
  if (error) {
    console.error("[master/blog] excluirAutor:", error);
    return { ok: false, msg: "Não consegui excluir o autor." };
  }

  revalidatePath(ROTA_TAXONOMIA);
  revalidatePath(ROTA);
  return {
    ok: true,
    msg:
      count && count > 0
        ? `Autor excluído. ${count} ${count === 1 ? "post ficou" : "posts ficaram"} sem autor.`
        : "Autor excluído.",
  };
}
