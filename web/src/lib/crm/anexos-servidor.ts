import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  LIMITE_BYTES,
  caminhoDoLead,
  dimensoesDoCabecalho,
  ehTipoPrint,
  novoCaminho,
  tipoPorBytes,
  type TipoPrint,
} from "@/lib/crm/anexos";

/**
 * Tudo o que toca no bucket privado `crm-anexos` (db/54). Quem chama já
 * conferiu a sessão master; aqui só entram caminhos gerados pelo servidor e
 * conferidos contra o lead.
 *
 * Regra da limpeza: um arquivo só é apagado se NÃO estiver em `lead_anexos`.
 * Assim, uma nota que falhou, um caminho repetido ou um forjado nunca apagam
 * o print de uma nota já salva.
 */

export const BUCKET_ANEXOS = "crm-anexos";
/** 1 h: o painel recarrega a linha do tempo quando o link vence. */
const TTL = 3600;

type Admin = ReturnType<typeof createAdminClient>;

export type AnexoConferido = {
  caminho: string;
  tipo_mime: TipoPrint;
  bytes: number;
  largura: number | null;
  altura: number | null;
};

/** Confere os bytes (tipo e dimensões pelo cabeçalho) e sobe com caminho novo. */
export async function subirPrint(
  sb: Admin,
  leadId: string,
  arquivo: Uint8Array,
): Promise<{ ok: true; caminho: string } | { ok: false; msg: string }> {
  if (arquivo.length === 0) return { ok: false, msg: "Print vazio." };
  if (arquivo.length > LIMITE_BYTES) return { ok: false, msg: "Print grande demais (passou de 5 MB)." };
  const tipo = tipoPorBytes(arquivo);
  if (!tipo) return { ok: false, msg: "Formato não aceito (só PNG, JPEG e WebP)." };
  const dim = dimensoesDoCabecalho(arquivo, tipo);
  if (!dim) return { ok: false, msg: "Imagem inválida." };

  const caminho = novoCaminho(leadId, crypto.randomUUID(), tipo);
  const { error } = await sb.storage.from(BUCKET_ANEXOS).upload(caminho, arquivo, {
    contentType: tipo,
    upsert: false,
    metadata: { largura: dim.largura, altura: dim.altura },
  });
  if (error) {
    console.error("[master/crm] upload do print:", error.message);
    return { ok: false, msg: "Não foi possível enviar o print." };
  }
  return { ok: true, caminho };
}

/**
 * Lê no Storage o que foi de fato enviado: tipo, tamanho e dimensões vêm daqui,
 * nunca do navegador. Devolve null se algum arquivo não existe ou não confere.
 */
export async function conferirPrints(
  sb: Admin,
  leadId: string,
  caminhos: readonly string[],
): Promise<AnexoConferido[] | null> {
  const out: AnexoConferido[] = [];
  for (const caminho of caminhos) {
    if (!caminhoDoLead(leadId, caminho)) return null;
    const { data, error } = await sb.storage.from(BUCKET_ANEXOS).info(caminho);
    if (error || !data) return null;
    const tipo = data.contentType;
    const bytes = data.size;
    if (!ehTipoPrint(tipo) || typeof bytes !== "number" || bytes < 1 || bytes > LIMITE_BYTES) return null;
    const meta = (data.metadata ?? {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null);
    out.push({ caminho, tipo_mime: tipo, bytes, largura: num(meta.largura), altura: num(meta.altura) });
  }
  return out;
}

/** Apaga do bucket os caminhos deste lead que não pertencem a nenhuma nota. */
export async function descartarOrfaos(sb: Admin, leadId: string, caminhos: readonly string[]): Promise<void> {
  const deste = [...new Set(caminhos.filter((c) => caminhoDoLead(leadId, c)))];
  if (deste.length === 0) return;
  const { data, error } = await sb.from("lead_anexos").select("caminho").in("caminho", deste);
  if (error) {
    console.error("[master/crm] limpeza de prints (leitura):", error.message);
    return; // na dúvida, não apaga nada
  }
  const salvos = new Set(((data ?? []) as { caminho: string }[]).map((r) => r.caminho));
  const orfaos = deste.filter((c) => !salvos.has(c));
  if (orfaos.length === 0) return;
  const { error: e2 } = await sb.storage.from(BUCKET_ANEXOS).remove(orfaos);
  if (e2) console.error("[master/crm] limpeza de prints:", e2.message);
}

/** Links assinados em lote (uma chamada por página da linha do tempo). */
export async function assinarPrints(sb: Admin, caminhos: readonly string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (caminhos.length === 0) return mapa;
  const { data, error } = await sb.storage.from(BUCKET_ANEXOS).createSignedUrls([...caminhos], TTL);
  if (error || !data) {
    console.error("[master/crm] assinar prints:", error?.message);
    return mapa;
  }
  for (const item of data) {
    if (!item.error && item.path && item.signedUrl) mapa.set(item.path, item.signedUrl);
  }
  return mapa;
}

/** Apaga um arquivo (remover print salvo). */
export async function apagarPrint(sb: Admin, caminho: string): Promise<boolean> {
  const { error } = await sb.storage.from(BUCKET_ANEXOS).remove([caminho]);
  if (error) {
    console.error("[master/crm] remover print:", error.message);
    return false;
  }
  return true;
}
