import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { SemPatio } from "@/components/sem-patio";
import { FaturamentoClient } from "@/components/vouchers/faturamento-client";

export const dynamic = "force-dynamic";

/**
 * Competência padrão: o MÊS PASSADO.
 *
 * O mês corrente não pode ser fechado — `fechar_competencia` recusa com NPV12,
 * porque uma cobrança parcial não teria como ser completada depois (a
 * competência já estaria gravada). Abrir a tela no mês corrente daria ao gestor
 * um botão que sempre falha.
 */
function competenciaPadrao(): string {
  const agora = new Date(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  agora.setDate(1);
  agora.setMonth(agora.getMonth() - 1);
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FaturamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string; competencia?: string }>;
}) {
  const { patio, competencia: compParam } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const competencia = /^\d{4}-(0[1-9]|1[0-2])$/.test(compParam ?? "")
    ? compParam!
    : competenciaPadrao();

  const supabase = await createClient();
  const { data: parceiros } = await supabase
    .from("parceiros")
    .select("id, nome, modo_custo")
    .eq("patio_id", patioId)
    .order("modo_custo")
    .order("nome");

  // Uma prévia por parceiro. São poucas linhas por pátio e a função já faz a
  // conta inteira no banco — agregar aqui exigiria trazer as liberações todas.
  const linhas = await Promise.all(
    (parceiros ?? []).map(async (p) => {
      const { data } = await supabase.rpc("previa_competencia", {
        p_parceiro_id: p.id,
        p_competencia: competencia,
      });
      const previa = Array.isArray(data) ? data[0] : null;

      // Já fechada: os números que valem são os GRAVADOS, não a prévia. A
      // prévia recalcula sobre o que ainda não foi carimbado, e depois do
      // fechamento isso é outra coisa.
      const { data: fechada } = await supabase
        .from("parceiro_competencias")
        .select("total_liberacoes, total_abatido, fechada_em")
        .eq("parceiro_id", p.id)
        .eq("competencia", competencia)
        .maybeSingle();

      return {
        id: p.id,
        nome: p.nome as string,
        faturado: p.modo_custo === "faturado",
        jaFechada: !!fechada,
        fechadaEm: fechada?.fechada_em ?? null,
        totalLiberacoes: fechada
          ? Number(fechada.total_liberacoes)
          : Number(previa?.total_liberacoes ?? 0),
        totalAbatido: fechada
          ? Number(fechada.total_abatido)
          : Number(previa?.total_abatido ?? 0),
      };
    }),
  );

  return (
    <FaturamentoClient
      linhas={linhas}
      competencia={competencia}
      patioNome={patioNome ?? ""}
    />
  );
}
