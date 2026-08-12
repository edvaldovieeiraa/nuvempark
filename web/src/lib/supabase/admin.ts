import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role — FURA O RLS (enxerga todos os tenants).
 *
 * ⚠️ NUNCA importar em código que roda no browser. O import "server-only" faz
 * o build QUEBRAR se isto vazar para o client.
 *
 * Só existem DOIS lugares autorizados a chamar esta função:
 *
 *   1. Rotas `/master`, sempre atrás do gate de senha mestra.
 *   2. `lib/vouchers/usuario-parceiro.ts`, e ali SOMENTE para `auth.admin.*` —
 *      criar conta no Supabase Auth não tem caminho pelo cliente do gestor.
 *      Aquele módulo confere o parceiro pela sessão do gestor (com RLS) ANTES
 *      de pegar este cliente, e continua gravando as tabelas pelo cliente do
 *      gestor. Ler o comentário de lá antes de mexer.
 *
 * Qualquer terceiro uso precisa da mesma disciplina: provar o escopo do tenant
 * com RLS ligada primeiro, e só então furar.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente — painel master indisponível.",
    );
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
