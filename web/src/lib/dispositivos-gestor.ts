import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helpers de dispositivos do PAINEL DO GESTOR — sempre com o cliente da sessão
 * (RLS ativa). NUNCA service_role aqui.
 */

/** Janela em que um pendente ainda é "ativo" (tentou logar recentemente). */
export const JANELA_PENDENTE_MS = 7 * 24 * 60 * 60 * 1000;

/** Rótulo da competência a partir da qual um extra passa a ser cobrado (mês seguinte). */
export function competenciaSeguinte(): string {
  const agora = new Date();
  const prox = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(prox);
}

export type ResumoPendentes = { total: number; patios: string[] };

type PendRow = { patio_id: string; device_uuid: string; patios: { nome: string } | null };
type EvRow = { patio_id: string; device_uuid: string };

/**
 * Resumo de dispositivos PENDENTES ATIVOS (com tentativa de login nos últimos
 * 7 dias) — alimenta o card de alerta do dashboard. Pendentes "esquecidos"
 * (sem nova tentativa há >7 dias) não contam.
 */
export async function resumoPendentes(sb: SupabaseClient): Promise<ResumoPendentes> {
  const desde = new Date(Date.now() - JANELA_PENDENTE_MS).toISOString();
  const [{ data: pendData }, { data: evData }] = await Promise.all([
    sb.from("dispositivos").select("patio_id, device_uuid, patios(nome)").eq("status", "pendente"),
    sb
      .from("dispositivo_acessos")
      .select("patio_id, device_uuid")
      .eq("evento", "login_negado")
      .gte("criado_em", desde),
  ]);

  const ativos = new Set(((evData as EvRow[] | null) ?? []).map((e) => `${e.patio_id}|${e.device_uuid}`));
  const porPatio = new Map<string, string>();
  let total = 0;
  for (const p of (pendData as PendRow[] | null) ?? []) {
    if (ativos.has(`${p.patio_id}|${p.device_uuid}`)) {
      total += 1;
      porPatio.set(p.patio_id, p.patios?.nome ?? "pátio");
    }
  }
  return { total, patios: [...porPatio.values()] };
}
