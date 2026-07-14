import { createClient } from "@/lib/supabase/server";
import { resolverPatio, ultimaSincronizacao } from "@/lib/patio-scope";
import { assinarFotosEntrada } from "@/lib/fotos";
import { mapaOperadores } from "@/lib/operadores";
import { MovimentosClient } from "@/components/movimentos/movimentos-client";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

type Busca = {
  patio?: string;
  q?: string;
  status?: string;
  periodo?: string;
};

export default async function MovimentosPage({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const { patio, q, status, periodo } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();

  let query = supabase
    .from("tickets")
    .select(
      "id, placa, tipo_veiculo, status, entrada, saida, valor_cobrado, forma_pagamento, motivo_isencao, origem, foto_entrada_path, operador_id",
      { count: "exact" },
    )
    .eq("patio_id", patioId)
    .order("entrada", { ascending: false })
    .limit(100);

  if (q) query = query.ilike("placa", `%${q.toUpperCase()}%`);
  if (status && status !== "todos") query = query.eq("status", status);

  const dias =
    periodo === "hoje" ? 1 : periodo === "30d" ? 30 : periodo === "tudo" ? 0 : 7;
  if (dias > 0) {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    inicio.setDate(inicio.getDate() - (dias - 1));
    query = query.gte("entrada", inicio.toISOString());
  }

  const [{ data: tickets, count }, sincronizadoEm] = await Promise.all([
    query,
    ultimaSincronizacao(patioId),
  ]);

  // Uma única chamada ao Storage para as miniaturas desta página.
  const [fotos, operadores] = await Promise.all([
    assinarFotosEntrada(tickets ?? []),
    mapaOperadores(),
  ]);

  return (
    <MovimentosClient
      tickets={tickets ?? []}
      fotos={fotos}
      operadores={operadores}
      total={count ?? 0}
      patioNome={patioNome ?? ""}
      patioId={patioId}
      sincronizadoEm={sincronizadoEm}
      filtros={{
        q: q ?? "",
        status: status ?? "todos",
        periodo: periodo ?? "7d",
      }}
    />
  );
}
