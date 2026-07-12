import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role — FURA O RLS (enxerga todos os tenants).
 *
 * ⚠️ EXCLUSIVO das rotas /master, SEMPRE atrás do gate de senha mestra.
 * NUNCA importar em código que roda no browser nem em rotas de gestor.
 * O import "server-only" faz o build QUEBRAR se isto vazar para o client.
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
