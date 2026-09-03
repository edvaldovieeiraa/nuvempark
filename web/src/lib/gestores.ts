import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Gestores (usuários do painel web) de um tenant.
 *
 * O vínculo usuário↔rede mora em `app_metadata.tenant_id` no Supabase Auth —
 * é o que a RLS lê via `current_tenant_id()`. Não existe tabela espelho em
 * `public`, então a única fonte é a Admin API, que não filtra por metadado:
 * é preciso paginar e filtrar aqui.
 *
 * Custo: O(total de usuários do projeto), não O(usuários da rede). Aceitável na
 * escala atual (uma tela de detalhe, sob a senha master) e limitado a 20 páginas
 * de 200 — o mesmo teto de `resolverEmailGestor` em `lib/emails/dispositivos`.
 * Se a base de usuários crescer a ponto de isso pesar, o caminho é uma tabela
 * `public.gestores` alimentada por trigger, não aumentar o teto.
 */
export type Gestor = {
  id: string;
  email: string | null;
  nome: string | null;
  telefone: string | null;
  criadoEm: string | null;
  ultimoLogin: string | null;
  emailConfirmadoEm: string | null;
  /** 'email', 'google'… — como ele entra no painel. */
  provedores: string[];
};

function extrair(u: User): Gestor {
  const meta = (u.user_metadata ?? {}) as { nome?: string; telefone?: string };
  const app = (u.app_metadata ?? {}) as {
    provider?: string;
    providers?: string[];
  };
  const provedores =
    app.providers && app.providers.length > 0
      ? app.providers
      : app.provider
        ? [app.provider]
        : (u.identities ?? []).map((i) => i.provider);

  return {
    id: u.id,
    email: u.email ?? null,
    nome: meta.nome?.trim() || null,
    telefone: meta.telefone?.trim() || null,
    criadoEm: u.created_at ?? null,
    ultimoLogin: u.last_sign_in_at ?? null,
    emailConfirmadoEm: u.email_confirmed_at ?? u.confirmed_at ?? null,
    provedores: [...new Set(provedores)],
  };
}

/**
 * Todos os usuários do Auth cujo `app_metadata.tenant_id` bate com o tenant.
 * Ordena pelo login mais recente (nunca logou vai pro fim). Falha de privilégio
 * ou de rede devolve lista vazia — a tela mostra o vazio, não quebra.
 */
export async function listarGestoresDoTenant(
  sb: SupabaseClient,
  tenantId: string,
): Promise<Gestor[]> {
  const achados: Gestor[] = [];
  try {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await sb.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error || !data) break;
      for (const u of data.users) {
        const tid = (u.app_metadata as { tenant_id?: string } | null)?.tenant_id;
        if (tid === tenantId) achados.push(extrair(u));
      }
      if (data.users.length < 200) break;
    }
  } catch {
    // Cliente sem privilégio de Auth → devolve o que já tiver (provavelmente nada).
  }

  return achados.sort((a, b) => {
    if (a.ultimoLogin && b.ultimoLogin) return b.ultimoLogin.localeCompare(a.ultimoLogin);
    if (a.ultimoLogin) return -1;
    if (b.ultimoLogin) return 1;
    return (b.criadoEm ?? "").localeCompare(a.criadoEm ?? "");
  });
}
