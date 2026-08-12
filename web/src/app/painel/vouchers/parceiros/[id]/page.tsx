import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ParceiroDetalheClient } from "@/components/vouchers/parceiro-detalhe-client";

export const dynamic = "force-dynamic";

/**
 * Primeiro instante do mês corrente no fuso de Brasília, em ISO.
 *
 * O servidor roda em UTC. `new Date().setDate(1)` daria a virada às 21h do dia
 * 30 no horário local do pátio, e nessas três horas o gestor veria a cota já
 * renovada enquanto o banco (que usa America/Sao_Paulo em db/34) ainda contaria
 * o mês anterior. Duas telas discordando sobre o mesmo número.
 */
function inicioDoMesEmSaoPaulo(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  // `en-CA` devolve YYYY-MM; -03:00 é o deslocamento de Brasília, que não tem
  // mais horário de verão desde 2019.
  return `${partes}-01T00:00:00-03:00`;
}

export default async function ParceiroDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Sem filtro de tenant na consulta: a RLS de db/32 já escopa. Um id de outro
  // cliente simplesmente não é encontrado, e cai no notFound().
  const { data: parceiro } = await supabase
    .from("parceiros")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!parceiro) notFound();

  const [{ data: usuarios }, { data: liberacoes }] = await Promise.all([
    supabase
      .from("usuarios_parceiro")
      .select("id, nome, email, ativo, criado_em")
      .eq("parceiro_id", id)
      .order("criado_em"),
    supabase
      .from("liberacoes")
      .select("id, ticket_id, liberado_em, cancelada_em, valor_abatido, competencia")
      .eq("parceiro_id", id)
      .order("liberado_em", { ascending: false })
      .limit(25),
  ]);

  // Consumo do período corrente. Contagem PRÓPRIA, e não derivada da lista
  // acima: aquela é limitada a 25 para exibição, e contar a partir dela faria
  // a cota parecer menor do que é assim que o parceiro passasse de 25.
  //
  // Mesmo critério de db/34: canceladas não contam, e "mes" começa no dia 1º
  // no fuso de Brasília — não no fuso do servidor, que é UTC.
  let contagem = supabase
    .from("liberacoes")
    .select("id", { count: "exact", head: true })
    .eq("parceiro_id", id)
    .is("cancelada_em", null);

  if (parceiro.limite_periodo === "mes") {
    contagem = contagem.gte("liberado_em", inicioDoMesEmSaoPaulo());
  }
  const { count } = await contagem;

  return (
    <ParceiroDetalheClient
      parceiro={parceiro}
      usuarios={usuarios ?? []}
      liberacoes={liberacoes ?? []}
      usadasNoPeriodo={count ?? 0}
    />
  );
}
