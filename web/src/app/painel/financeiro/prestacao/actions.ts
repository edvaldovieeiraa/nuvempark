"use server";

import { createClient } from "@/lib/supabase/server";

/** Escopo comum de todas as seções. operadorId null = todos. */
export type Escopo = {
  patioId: string;
  inicioIso: string;
  fimIso: string;
  operadorId: string | null;
};

export type OperadorLite = { id: string; nome: string };

export async function listarOperadores(
  patioId: string,
): Promise<OperadorLite[]> {
  const sb = await createClient();
  // operadores vinculados ao pátio (junção), com nome.
  const { data } = await sb
    .from("operador_patios")
    .select("operador:operadores(id, nome)")
    .eq("patio_id", patioId);
  const lista = (data ?? [])
    .map((v) => v.operador as unknown as OperadorLite | null)
    .filter((o): o is OperadorLite => Boolean(o));
  // dedup por id
  const map = new Map(lista.map((o) => [o.id, o]));
  return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

/** Ids das sessões de caixa do operador no período (para escopar movimentos). */
async function sessaoIdsDoOperador(e: Escopo): Promise<string[] | null> {
  if (!e.operadorId) return null; // "Todos" → sem filtro
  const sb = await createClient();
  const { data } = await sb
    .from("caixa_sessoes")
    .select("id")
    .eq("patio_id", e.patioId)
    .eq("operador_id", e.operadorId);
  return (data ?? []).map((s) => s.id as string);
}

// ── 1) Movimentos (fechamentos de caixa no período) ──────────────────────────
export type MovimentoLinha = {
  id: string;
  operador_nome: string | null;
  fundo: number;
  entradas: number;
  sangrias: number;
  esperado: number;
  contado: number;
  divergencia: number;
  fechamento: string | null;
  observacao: string | null;
};
export type MovimentosResumo = {
  sessoes: MovimentoLinha[];
  qtd: number;
  totalFundo: number;
  totalContado: number;
  totalDivergencia: number;
  comDivergencia: number;
};

export async function gerarMovimentos(e: Escopo): Promise<MovimentosResumo> {
  const sb = await createClient();
  let q = sb
    .from("caixa_sessoes")
    .select(
      "id, operador_nome, fundo_caixa, total_fechamento, fechamento, observacao_fechamento",
    )
    .eq("patio_id", e.patioId)
    .eq("status", "fechada")
    .gte("fechamento", e.inicioIso)
    .lte("fechamento", e.fimIso);
  if (e.operadorId) q = q.eq("operador_id", e.operadorId);
  const { data: sessoes } = await q.order("fechamento", { ascending: false });

  const ids = (sessoes ?? []).map((s) => s.id as string);
  const somas: Record<string, { entradas: number; sangrias: number }> = {};
  if (ids.length > 0) {
    const { data: movs } = await sb
      .from("caixa_movimentos")
      .select("caixa_sessao_id, tipo, valor")
      .in("caixa_sessao_id", ids);
    for (const m of movs ?? []) {
      const s = (somas[m.caixa_sessao_id as string] ??= {
        entradas: 0,
        sangrias: 0,
      });
      if (m.tipo === "entrada") s.entradas += Number(m.valor) || 0;
      if (m.tipo === "sangria") s.sangrias += Number(m.valor) || 0;
    }
  }

  const linhas: MovimentoLinha[] = (sessoes ?? []).map((s) => {
    const mov = somas[s.id as string] ?? { entradas: 0, sangrias: 0 };
    const fundo = Number(s.fundo_caixa) || 0;
    const esperado = fundo + mov.entradas - mov.sangrias;
    const contado = Number(s.total_fechamento ?? esperado);
    return {
      id: s.id as string,
      operador_nome: (s.operador_nome as string | null) ?? null,
      fundo,
      entradas: mov.entradas,
      sangrias: mov.sangrias,
      esperado,
      contado,
      divergencia: contado - esperado,
      fechamento: (s.fechamento as string | null) ?? null,
      observacao: (s.observacao_fechamento as string | null) ?? null,
    };
  });

  return {
    sessoes: linhas,
    qtd: linhas.length,
    totalFundo: linhas.reduce((t, l) => t + l.fundo, 0),
    totalContado: linhas.reduce((t, l) => t + l.contado, 0),
    totalDivergencia: linhas.reduce((t, l) => t + l.divergencia, 0),
    comDivergencia: linhas.filter((l) => Math.abs(l.divergencia) > 0.01).length,
  };
}

// ── 2) Pagamentos de tickets ─────────────────────────────────────────────────
export type PagamentosTicketsResumo = {
  qtd: number;
  total: number;
  ticketMedio: number;
};

export async function gerarPagamentosTickets(
  e: Escopo,
): Promise<PagamentosTicketsResumo> {
  const sb = await createClient();
  let q = sb
    .from("tickets")
    .select("valor_cobrado")
    .eq("patio_id", e.patioId)
    .eq("status", "fechado")
    .gte("saida", e.inicioIso)
    .lte("saida", e.fimIso)
    .gt("valor_cobrado", 0);
  if (e.operadorId) q = q.eq("operador_id", e.operadorId);
  const { data } = await q;
  const valores = (data ?? []).map((t) => Number(t.valor_cobrado) || 0);
  const total = valores.reduce((a, b) => a + b, 0);
  const qtd = valores.length;
  return { qtd, total, ticketMedio: qtd > 0 ? total / qtd : 0 };
}

// ── 3) Pagamentos de mensalidade ─────────────────────────────────────────────
export type MensalidadesResumo = {
  qtd: number;
  total: number;
  porForma: { forma: string; qtd: number; total: number }[];
  origem: { app: { qtd: number; total: number }; painel: { qtd: number; total: number } };
};

export async function gerarPagamentosMensalidade(
  e: Escopo,
): Promise<MensalidadesResumo> {
  const sb = await createClient();
  let q = sb
    .from("mensalidade_pagamentos")
    .select("valor, forma_pagamento, origem")
    .eq("patio_id", e.patioId)
    .is("cancelado_em", null)
    .gte("pago_em", e.inicioIso)
    .lte("pago_em", e.fimIso);
  if (e.operadorId) q = q.eq("registrado_por", e.operadorId);
  const { data } = await q;
  const linhas = data ?? [];

  const formas: Record<string, { qtd: number; total: number }> = {};
  const origem = { app: { qtd: 0, total: 0 }, painel: { qtd: 0, total: 0 } };
  let total = 0;
  for (const p of linhas) {
    const v = Number(p.valor) || 0;
    total += v;
    const f = (p.forma_pagamento as string | null) ?? "—";
    (formas[f] ??= { qtd: 0, total: 0 }).qtd += 1;
    formas[f].total += v;
    if (p.origem === "painel") {
      origem.painel.qtd += 1;
      origem.painel.total += v;
    } else {
      origem.app.qtd += 1;
      origem.app.total += v;
    }
  }
  return {
    qtd: linhas.length,
    total,
    porForma: Object.entries(formas)
      .map(([forma, v]) => ({ forma, ...v }))
      .sort((a, b) => b.total - a.total),
    origem,
  };
}

// ── 4) Receitas (entradas de caixa) ──────────────────────────────────────────
export type ReceitasResumo = {
  total: number;
  tickets: number;
  mensalidades: number;
  outras: number;
};

export async function gerarReceitas(e: Escopo): Promise<ReceitasResumo> {
  const sb = await createClient();
  const ids = await sessaoIdsDoOperador(e);
  let q = sb
    .from("caixa_movimentos")
    .select("valor, ticket_id, descricao")
    .eq("patio_id", e.patioId)
    .eq("tipo", "entrada")
    .gte("criado_em", e.inicioIso)
    .lte("criado_em", e.fimIso);
  if (ids) q = q.in("caixa_sessao_id", ids.length ? ids : ["__none__"]);
  const { data } = await q;

  let tickets = 0;
  let mensalidades = 0;
  let outras = 0;
  for (const m of data ?? []) {
    const v = Number(m.valor) || 0;
    if (m.ticket_id) tickets += v;
    else if (String(m.descricao ?? "").startsWith("Mensalidade")) mensalidades += v;
    else outras += v;
  }
  return { total: tickets + mensalidades + outras, tickets, mensalidades, outras };
}

// ── 5) Despesas (sangrias) ───────────────────────────────────────────────────
export type DespesasResumo = {
  qtd: number;
  total: number;
  itens: { descricao: string; valor: number; quando: string | null }[];
};

export async function gerarDespesas(e: Escopo): Promise<DespesasResumo> {
  const sb = await createClient();
  const ids = await sessaoIdsDoOperador(e);
  let q = sb
    .from("caixa_movimentos")
    .select("valor, descricao, criado_em")
    .eq("patio_id", e.patioId)
    .eq("tipo", "sangria")
    .gte("criado_em", e.inicioIso)
    .lte("criado_em", e.fimIso);
  if (ids) q = q.in("caixa_sessao_id", ids.length ? ids : ["__none__"]);
  const { data } = await q.order("criado_em", { ascending: false });

  const itens = (data ?? []).map((m) => ({
    descricao: (m.descricao as string | null) ?? "Sangria",
    valor: Number(m.valor) || 0,
    quando: (m.criado_em as string | null) ?? null,
  }));
  return {
    qtd: itens.length,
    total: itens.reduce((t, i) => t + i.valor, 0),
    itens,
  };
}

// ── 6) Formas de pagamento (tickets + mensalidades) ──────────────────────────
export type FormasResumo = {
  total: number;
  formas: { forma: string; qtd: number; valor: number; pct: number }[];
};

export async function gerarFormasPagamento(e: Escopo): Promise<FormasResumo> {
  const sb = await createClient();
  let qt = sb
    .from("tickets")
    .select("valor_cobrado, forma_pagamento")
    .eq("patio_id", e.patioId)
    .eq("status", "fechado")
    .gte("saida", e.inicioIso)
    .lte("saida", e.fimIso)
    .gt("valor_cobrado", 0);
  if (e.operadorId) qt = qt.eq("operador_id", e.operadorId);

  let qm = sb
    .from("mensalidade_pagamentos")
    .select("valor, forma_pagamento")
    .eq("patio_id", e.patioId)
    .is("cancelado_em", null)
    .gte("pago_em", e.inicioIso)
    .lte("pago_em", e.fimIso);
  if (e.operadorId) qm = qm.eq("registrado_por", e.operadorId);

  const [{ data: tks }, { data: mens }] = await Promise.all([qt, qm]);

  const acc: Record<string, { qtd: number; valor: number }> = {};
  for (const t of tks ?? []) {
    const f = (t.forma_pagamento as string | null) ?? "—";
    (acc[f] ??= { qtd: 0, valor: 0 }).qtd += 1;
    acc[f].valor += Number(t.valor_cobrado) || 0;
  }
  for (const p of mens ?? []) {
    const f = (p.forma_pagamento as string | null) ?? "—";
    (acc[f] ??= { qtd: 0, valor: 0 }).qtd += 1;
    acc[f].valor += Number(p.valor) || 0;
  }
  const total = Object.values(acc).reduce((t, v) => t + v.valor, 0);
  return {
    total,
    formas: Object.entries(acc)
      .map(([forma, v]) => ({
        forma,
        qtd: v.qtd,
        valor: v.valor,
        pct: total > 0 ? (v.valor / total) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor),
  };
}

// ── 7) Totalizador (independente das outras seções) ──────────────────────────
export type TotalizadorResumo = {
  receitas: number;
  despesas: number;
  saldo: number;
};

export async function gerarTotalizador(e: Escopo): Promise<TotalizadorResumo> {
  const [rec, desp] = await Promise.all([gerarReceitas(e), gerarDespesas(e)]);
  // mensalidades registradas no painel não passam pelo caixa — soma à receita.
  const sb = await createClient();
  let qm = sb
    .from("mensalidade_pagamentos")
    .select("valor")
    .eq("patio_id", e.patioId)
    .is("cancelado_em", null)
    .eq("origem", "painel")
    .gte("pago_em", e.inicioIso)
    .lte("pago_em", e.fimIso);
  if (e.operadorId) qm = qm.eq("registrado_por", e.operadorId);
  const { data } = await qm;
  const painel = (data ?? []).reduce((t, p) => t + (Number(p.valor) || 0), 0);

  const receitas = rec.total + painel;
  return { receitas, despesas: desp.total, saldo: receitas - desp.total };
}
