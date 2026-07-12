import { createClient } from "@/lib/supabase/server";
import { PerfilClient } from "@/components/perfil/perfil-client";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: tenant }, { data: patios }] = await Promise.all([
    supabase.from("tenants").select("nome, codigo, criado_em").single(),
    supabase.from("patios").select("id, ativo"),
  ]);

  return (
    <PerfilClient
      email={user?.email ?? "—"}
      criadoEm={user?.created_at ?? null}
      tenantNome={tenant?.nome ?? "—"}
      tenantCodigo={tenant?.codigo ?? "—"}
      patiosAtivos={(patios ?? []).filter((p) => p.ativo).length}
      patiosTotal={(patios ?? []).length}
    />
  );
}
