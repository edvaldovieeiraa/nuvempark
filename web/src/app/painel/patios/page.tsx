import { createClient } from "@/lib/supabase/server";
import { PatiosClient } from "@/components/patios/patios-client";

export const dynamic = "force-dynamic";

export default async function PatiosPage() {
  const supabase = await createClient();

  const [{ data: patios }, { data: configs }, abertos] = await Promise.all([
    supabase
      .from("patios")
      .select("id, nome, codigo, codigo_acesso, qtd_vagas, ativo")
      .order("nome"),
    supabase
      .from("patio_config")
      .select("patio_id, ticket_cabecalho, ticket_rodape"),
    supabase.from("tickets").select("patio_id").eq("status", "aberto"),
  ]);

  const abertosPorPatio: Record<string, number> = {};
  for (const t of abertos.data ?? []) {
    abertosPorPatio[t.patio_id] = (abertosPorPatio[t.patio_id] ?? 0) + 1;
  }

  return (
    <PatiosClient
      patios={patios ?? []}
      configs={configs ?? []}
      abertosPorPatio={abertosPorPatio}
    />
  );
}
