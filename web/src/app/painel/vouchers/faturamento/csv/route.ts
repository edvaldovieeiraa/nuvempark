import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Extrato de um parceiro numa competência, em CSV.
 *
 * Route handler e não server action: action devolve dados para o React, não
 * dispara download. Aqui os cabeçalhos `Content-Disposition` fazem o navegador
 * salvar o arquivo, que é o que o gestor vai anexar na cobrança.
 *
 * Sem checagem de tenant explícita: a consulta usa a sessão do gestor e a RLS
 * de db/32 escopa `liberacoes` por `current_tenant_id()`. Um parceiro de outro
 * cliente devolve zero linhas.
 */
function campo(v: unknown): string {
  const s = String(v ?? "");
  // Aspas e ponto-e-vírgula quebrariam a coluna; a aspa dupla escapa dobrando.
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const parceiroId = req.nextUrl.searchParams.get("parceiro") ?? "";
  const competencia = req.nextUrl.searchParams.get("competencia") ?? "";

  if (!parceiroId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: parceiro } = await supabase
    .from("parceiros")
    .select("nome")
    .eq("id", parceiroId)
    .maybeSingle();

  if (!parceiro) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  const { data: linhas } = await supabase
    .from("liberacoes")
    .select(
      "liberado_em, ticket_id, valor_abatido, voucher_regras(nome), tickets(placa, saida)",
    )
    .eq("parceiro_id", parceiroId)
    .eq("competencia", competencia)
    .is("cancelada_em", null)
    .order("liberado_em");

  const um = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const data = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  // Ponto-e-vírgula e vírgula decimal: é o que o Excel em português abre sem
  // pedir assistente de importação.
  const cabecalho = [
    "Liberado em",
    "Saida",
    "Placa",
    "Ticket",
    "Regra",
    "Valor abatido",
  ].join(";");

  const corpo = (linhas ?? []).map((l) => {
    const t = um(
      l.tickets as unknown as { placa: string; saida: string | null } | null,
    );
    const r = um(l.voucher_regras as unknown as { nome: string } | null);
    return [
      campo(data.format(new Date(l.liberado_em as string))),
      campo(t?.saida ? data.format(new Date(t.saida)) : ""),
      campo(t?.placa ?? ""),
      campo(l.ticket_id),
      campo(r?.nome ?? ""),
      campo(String(l.valor_abatido ?? 0).replace(".", ",")),
    ].join(";");
  });

  const total = (linhas ?? []).reduce(
    (s, l) => s + Number(l.valor_abatido ?? 0),
    0,
  );
  corpo.push(["", "", "", "", "TOTAL", campo(total.toFixed(2).replace(".", ","))].join(";"));

  // BOM UTF-8: sem ele o Excel no Windows mostra "Ã§" no lugar de "ç".
  const csv = `﻿${cabecalho}\n${corpo.join("\n")}\n`;
  const arquivo = `vouchers-${parceiro.nome.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}-${competencia}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
