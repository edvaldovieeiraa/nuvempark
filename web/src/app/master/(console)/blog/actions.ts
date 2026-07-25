"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import { slugify, slugValido } from "@/lib/slug";

/**
 * Server Actions do blog no console master.
 *
 * REGRA DE OURO: só aqui (e no resto de /master) o service_role é permitido.
 * Toda ação começa conferindo a sessão master — o admin client fura a RLS, e a
 * única coisa entre ele e o mundo é este gate. Nenhuma dessas funções é
 * alcançável do site público.
 */

export type Resultado =
  | { ok: true; msg: string }
  | { ok: false; msg: string }
  | null;

const ROTA = "/master/blog";
const ROTA_TAXONOMIA = "/master/blog/categorias";
const UNIQUE_VIOLATION = "23505";

/** Guarda comum. Devolve `null` quando pode seguir, ou o erro pronto. */
async function bloqueado(): Promise<Resultado> {
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
  const { error } = await sb
    .from("blog_posts")
    .update({ status: "arquivado" })
    .eq("id", postId);

  if (error) {
    console.error("[master/blog] arquivarPost:", error);
    return { ok: false, msg: "Não consegui arquivar o post." };
  }

  revalidatePath(ROTA);
  return { ok: true, msg: "Post arquivado — saiu do ar." };
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
  const { error } = await sb
    .from("blog_posts")
    .update({ status: "rascunho" })
    .eq("id", postId);

  if (error) {
    console.error("[master/blog] restaurarPost:", error);
    return { ok: false, msg: "Não consegui restaurar o post." };
  }

  revalidatePath(ROTA);
  return { ok: true, msg: "Post restaurado como rascunho." };
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
  return { ok: true, msg: id ? "Categoria atualizada." : "Categoria criada." };
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
  return {
    ok: true,
    msg:
      count && count > 0
        ? `Categoria excluída. ${count} ${count === 1 ? "post ficou" : "posts ficaram"} sem categoria.`
        : "Categoria excluída.",
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
