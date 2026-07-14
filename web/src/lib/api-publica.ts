/**
 * Cliente dos endpoints PÚBLICOS da nuvempark-api (`/api/public/v1`).
 *
 * A página do ticket não fala com o Supabase: nem no servidor, nem no cliente.
 * Todo o acesso a dado passa pela api, que é quem aplica os gates e mascara a
 * placa. Se este arquivo importar supabase algum dia, o desenho quebrou.
 *
 * Devolve `null` em 404 — a api usa 404 genérico para tudo o que não pode ser
 * visto, e a página traduz isso em notFound().
 */

const BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8080";

export const API_PUBLICA = `${BASE}/api/public/v1`;

export async function apiPublica<T>(
  caminho: string,
  init?: RequestInit,
): Promise<T | null> {
  const resp = await fetch(`${API_PUBLICA}${caminho}`, {
    ...init,
    // O valor da estadia muda com o relógio: nada de cache.
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (resp.status === 404) return null;
  if (!resp.ok) {
    throw new Error(`API pública ${caminho} → HTTP ${resp.status}`);
  }
  return (await resp.json()) as T;
}
