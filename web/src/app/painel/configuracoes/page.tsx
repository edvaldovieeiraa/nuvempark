import { createClient } from "@/lib/supabase/server";
import { ConfiguracoesClient } from "@/components/configuracoes/configuracoes-client";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const [{ data: tenant }, { data: assinatura }, { data: dispositivos }, { data: patios }] =
    await Promise.all([
      supabase.from("tenants").select("nome, codigo, cnpj, razao_social").single(),
      supabase
        .from("assinaturas")
        .select("estado, valor_por_patio, vencimento")
        .maybeSingle(),
      supabase
        .from("dispositivos")
        .select("id, nome, device_uuid, status, ultimo_acesso, patio_id")
        .order("ultimo_acesso", { ascending: false, nullsFirst: false }),
      supabase.from("patios").select("id, nome, ativo, codigo_acesso"),
    ]);

  return (
    <ConfiguracoesClient
      tenant={tenant}
      assinatura={assinatura}
      dispositivos={dispositivos ?? []}
      patios={(patios ?? []).map((p) => ({
        id: p.id,
        nome: p.nome,
        codigoAcesso: p.codigo_acesso,
        ativo: p.ativo,
      }))}
      qtdPatiosAtivos={(patios ?? []).filter((p) => p.ativo).length}
    />
  );
}
