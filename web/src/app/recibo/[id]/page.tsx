import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReciboPrint } from "@/components/master/recibo-print";
import { moeda, formatarCompetencia } from "@/lib/financeiro";
import { formatarDataHora } from "@/lib/format-data";

export const dynamic = "force-dynamic";

type RawFatura = {
  id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  qtd_patios: number;
  valor_por_patio: number;
  estado: string;
  pago_em: string | null;
  forma_pagamento: string | null;
  tenants: { nome: string; codigo: string } | null;
};

/**
 * Recibo/fatura do PRÓPRIO cliente (gestor). Mesmo documento que o master vê em
 * /master/recibo/[id], mas por um caminho diferente: aqui vale a sessão do
 * usuário e a RLS — nada de service_role. Se a fatura for de outro tenant, a
 * RLS simplesmente não devolve linha e cai no notFound; a autorização mora no
 * banco, não num `if` daqui.
 *
 * Fora de /painel de propósito — ver o comentário em middleware.ts.
 */
export default async function ReciboClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  // /recibo não está sob o gate do middleware (que só cobre /painel), então a
  // sessão é conferida aqui.
  if (!user) redirect("/login");

  const { id } = await params;

  const { data } = await sb
    .from("faturas")
    .select(
      "id, competencia, vencimento, valor, qtd_patios, valor_por_patio, estado, pago_em, forma_pagamento, tenants(nome, codigo)",
    )
    .eq("id", id)
    .maybeSingle();

  const f = data as unknown as RawFatura | null;
  if (!f) notFound();

  return (
    <ReciboPrint
      numero={f.id.slice(0, 8).toUpperCase()}
      rede={f.tenants?.nome ?? "—"}
      codigo={f.tenants?.codigo ?? ""}
      competencia={formatarCompetencia(f.competencia)}
      valor={moeda.format(Number(f.valor))}
      qtdPatios={f.qtd_patios}
      valorPorPatio={moeda.format(Number(f.valor_por_patio))}
      estado={f.estado}
      pagoEm={f.pago_em ? formatarDataHora(f.pago_em) : null}
      formaPagamento={f.forma_pagamento}
      voltarHref="/painel/assinatura"
    />
  );
}
