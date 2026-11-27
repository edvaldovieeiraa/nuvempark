import { createClient } from "@/lib/supabase/server";
import { ParametrizacaoClient } from "@/components/parametrizacao/parametrizacao-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Parametrização — NuvemPark" };

type ModoFoto = "ativada" | "operador" | "desativada";

function normalizarModo(v: unknown): ModoFoto {
  return v === "ativada" || v === "operador" ? v : "desativada";
}

type ModoRecibo = "automatica" | "perguntar" | "desativada";

/** Ausente ou desconhecido = automática (o padrão da coluna, db/53). */
function normalizarRecibo(v: unknown): ModoRecibo {
  return v === "perguntar" || v === "desativada" ? v : "automatica";
}

export default async function ParametrizacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio: patioParam } = await searchParams;
  const supabase = await createClient();

  // Pátios ativos do tenant (RLS garante o escopo). O selecionado vem do
  // ?patio= (mesmo seletor do resto do painel); sem ele, cai no primeiro.
  const { data: patios } = await supabase
    .from("patios")
    .select(
      "id, nome, foto_recibo_modo, modo_quiosque, modo_rapido_entrada, recibo_saida_modo, recibo_estadia_modo, recibo_caixa_modo",
    )
    .eq("ativo", true)
    .order("nome");

  const lista = patios ?? [];
  const atual =
    lista.find((p) => p.id === patioParam) ?? lista[0] ?? null;

  return (
    <ParametrizacaoClient
      patioId={atual?.id ?? null}
      patioNome={atual?.nome ?? null}
      modoInicial={normalizarModo(atual?.foto_recibo_modo)}
      quiosqueInicial={atual?.modo_quiosque ?? false}
      rapidoInicial={atual?.modo_rapido_entrada ?? false}
      recibosIniciais={{
        saida: normalizarRecibo(atual?.recibo_saida_modo),
        estadia: normalizarRecibo(atual?.recibo_estadia_modo),
        caixa: normalizarRecibo(atual?.recibo_caixa_modo),
      }}
    />
  );
}
