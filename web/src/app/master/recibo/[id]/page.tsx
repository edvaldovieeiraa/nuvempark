import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import { ReciboPrint } from "@/components/master/recibo-print";
import { moeda, formatarCompetencia } from "@/lib/financeiro";

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

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await sessaoMasterAtiva())) redirect("/master/login");

  const { id } = await params;
  const sb = createAdminClient();

  const { data } = await sb
    .from("faturas")
    .select(
      "id, competencia, vencimento, valor, qtd_patios, valor_por_patio, estado, pago_em, forma_pagamento, tenants(nome, codigo)",
    )
    .eq("id", id)
    .single();

  const f = data as unknown as RawFatura | null;
  if (!f) notFound();

  const pagoEm = f.pago_em
    ? new Date(f.pago_em).toLocaleDateString("pt-BR")
    : null;

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
      pagoEm={pagoEm}
      formaPagamento={f.forma_pagamento}
    />
  );
}
