import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { MensalistasClient } from "@/components/mensalistas/mensalistas-client";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function MensalistasPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();

  const [{ data: planos }, { data: clientes }, { data: veiculos }, { data: pagamentos }] =
    await Promise.all([
      supabase
        .from("planos")
        .select("id, nome, tipo, valor, patio_id, ativo")
        .eq("patio_id", patioId)
        .order("ordem")
        .order("nome"),
      supabase
        .from("clientes")
        .select(
          "id, nome, documento, telefone, patio_id, plano_id, vencimento, vagas, bloqueado, ativo, criado_em",
        )
        .eq("patio_id", patioId)
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("cliente_veiculos")
        .select("id, cliente_id, placa, descricao")
        .eq("patio_id", patioId),
      // UMA query agregada: competências ativas do pátio inteiro (sem N+1).
      supabase
        .from("mensalidade_pagamentos")
        .select("cliente_id, competencia")
        .eq("patio_id", patioId)
        .is("cancelado_em", null),
    ]);

  // Resumo por cliente: competências pagas + última competência paga.
  const pagasPorCliente: Record<string, string[]> = {};
  const ultimaPagaPorCliente: Record<string, string> = {};
  for (const p of pagamentos ?? []) {
    const comp = String(p.competencia); // 'YYYY-MM-01'
    (pagasPorCliente[p.cliente_id] ??= []).push(comp);
    if (
      !ultimaPagaPorCliente[p.cliente_id] ||
      comp > ultimaPagaPorCliente[p.cliente_id]
    ) {
      ultimaPagaPorCliente[p.cliente_id] = comp;
    }
  }

  // "Hoje" no fuso de São Paulo (evita erro de status perto da virada do dia/mês).
  const spNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  const hoje = {
    ano: spNow.getFullYear(),
    mes: spNow.getMonth() + 1,
    dia: spNow.getDate(),
  };

  return (
    <MensalistasClient
      patioId={patioId}
      patioNome={patioNome ?? ""}
      planos={planos ?? []}
      clientes={clientes ?? []}
      veiculos={veiculos ?? []}
      pagasPorCliente={pagasPorCliente}
      ultimaPagaPorCliente={ultimaPagaPorCliente}
      hoje={hoje}
    />
  );
}
