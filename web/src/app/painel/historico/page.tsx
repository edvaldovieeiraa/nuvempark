import { createClient } from "@/lib/supabase/server";
import { HistoricoClient, type AuditRow } from "@/components/historico/historico-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{
    modulo?: string;
    di?: string;
    df?: string;
    q?: string;
    p?: string;
  }>;
}) {
  const { modulo, di, df, q, p } = await searchParams;
  const pagina = Math.max(1, Number(p) || 1);
  const from = (pagina - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  // Log do TENANT inteiro (RLS já limita à rede do gestor). Paginação real via range.
  let query = supabase
    .from("audit_log")
    .select(
      "id, criado_em, usuario_nome, usuario_email, modulo, acao, descricao, dados, patio_id",
      { count: "exact" },
    )
    .order("criado_em", { ascending: false });

  if (modulo) query = query.eq("modulo", modulo);
  if (di) query = query.gte("criado_em", di);
  if (df) query = query.lte("criado_em", df);
  if (q) query = query.ilike("descricao", `%${q}%`);

  const [{ data, count }, { data: patiosData }] = await Promise.all([
    query.range(from, to),
    supabase.from("patios").select("id, nome"),
  ]);

  const patios: Record<string, string> = {};
  (patiosData ?? []).forEach((pt) => {
    patios[pt.id] = pt.nome;
  });

  return (
    <HistoricoClient
      linhas={(data ?? []) as AuditRow[]}
      total={count ?? 0}
      pagina={pagina}
      pageSize={PAGE_SIZE}
      patios={patios}
      filtros={{ modulo: modulo ?? "", di: di ?? "", df: df ?? "", q: q ?? "" }}
    />
  );
}
