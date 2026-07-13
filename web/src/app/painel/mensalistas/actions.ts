"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria, brl } from "@/lib/auditoria";
import {
  proximoVencimento,
  hojeYmdSaoPaulo,
  formatarVencimentoBR,
} from "@/lib/vencimento";

/** Lê 'dia_vencimento' de um FormData e valida 1..28 (fora da faixa => null). */
function lerDiaVencimento(fd: FormData): number | null {
  const n = Number(fd.get("dia_vencimento"));
  return Number.isInteger(n) && n >= 1 && n <= 28 ? n : null;
}

export type Resultado = { ok: boolean; msg: string } | null;

/** "julho de 2026" a partir de uma competência 'YYYY-MM-01'. */
function competenciaLabel(comp: string): string {
  return new Date(`${comp}T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

async function tenantDoGestor() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return {
    sb,
    tenantId: (user?.app_metadata as { tenant_id?: string })?.tenant_id,
  };
}

export async function criarPlano(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await tenantDoGestor();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const nome = String(formData.get("nome") || "").trim();
  const patioId = String(formData.get("patio_id"));
  const tipo = String(formData.get("tipo") || "mensalista");
  const valor =
    Number(String(formData.get("valor") || "0").replace(",", ".")) || 0;
  if (!nome) return { ok: false, msg: "Informe o nome do plano." };

  const { error } = await sb.from("planos").insert({
    tenant_id: tenantId,
    patio_id: patioId,
    nome,
    tipo,
    valor,
  });
  if (error) return { ok: false, msg: "Não foi possível criar o plano." };

  await registrarAuditoria({
    modulo: "mensalistas",
    acao: "criou",
    patioId,
    descricao: `Criou o plano "${nome}" (${tipo}${valor > 0 ? `, ${brl(valor)}/mês` : ""})`,
    dados: { nome, tipo, valor },
  });

  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: `Plano "${nome}" criado.` };
}

export async function desativarPlano(id: string): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const { data: antes } = await sb
    .from("planos")
    .select("nome, tipo, patio_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb
    .from("planos")
    .update({ ativo: false })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível desativar o plano." };

  await registrarAuditoria({
    modulo: "mensalistas",
    acao: "removeu",
    patioId: (antes?.patio_id as string | undefined) ?? null,
    descricao: `Desativou o plano "${antes?.nome ?? "?"}"`,
    dados: { id },
  });

  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: "Plano desativado." };
}

export async function criarCliente(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await tenantDoGestor();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const nome = String(formData.get("nome") || "").trim();
  const patioId = String(formData.get("patio_id"));
  const placa = String(formData.get("placa") || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!nome) return { ok: false, msg: "Informe o nome do cliente." };

  const { data: cliente, error } = await sb
    .from("clientes")
    .insert({
      tenant_id: tenantId,
      patio_id: patioId,
      plano_id: String(formData.get("plano_id") || "") || null,
      nome,
      documento: String(formData.get("documento") || "").trim() || null,
      telefone: String(formData.get("telefone") || "").trim() || null,
      vencimento: String(formData.get("vencimento") || "") || null,
      dia_vencimento: lerDiaVencimento(formData),
      vagas: Number(formData.get("vagas") || 1),
    })
    .select("id")
    .single();
  if (error || !cliente)
    return { ok: false, msg: "Não foi possível criar o cliente." };

  if (placa) {
    const { error: erroVeic } = await sb.from("cliente_veiculos").insert({
      cliente_id: cliente.id,
      patio_id: patioId,
      tenant_id: tenantId,
      placa,
    });
    if (erroVeic)
      return {
        ok: false,
        msg:
          erroVeic.code === "23505"
            ? `Cliente criado, mas a placa ${placa} já está cadastrada neste pátio.`
            : "Cliente criado, mas falhou o cadastro da placa.",
      };
  }

  await registrarAuditoria({
    modulo: "mensalistas",
    acao: "criou",
    patioId,
    descricao: `Cadastrou o cliente "${nome}"${placa ? ` com a placa ${placa}` : ""}`,
    dados: { nome, placa: placa || null },
  });

  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: `Cliente ${nome} cadastrado.` };
}

export async function alternarBloqueio(
  id: string,
  bloqueadoAtual: boolean,
): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const { data: antes } = await sb
    .from("clientes")
    .select("nome, patio_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb
    .from("clientes")
    .update({ bloqueado: !bloqueadoAtual })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível alterar o bloqueio." };

  await registrarAuditoria({
    modulo: "mensalistas",
    acao: "alterou",
    patioId: (antes?.patio_id as string | undefined) ?? null,
    descricao: `${bloqueadoAtual ? "Desbloqueou" : "Bloqueou"} o cliente "${antes?.nome ?? "?"}"`,
    dados: { id, bloqueado: !bloqueadoAtual },
  });

  revalidatePath("/painel/mensalistas");
  return {
    ok: true,
    msg: bloqueadoAtual
      ? "Cliente desbloqueado — volta a ter livre passagem."
      : "Cliente bloqueado — o app passa a cobrar normalmente.",
  };
}

export async function adicionarVeiculo(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await tenantDoGestor();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const placa = String(formData.get("placa") || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const clienteId = String(formData.get("cliente_id"));
  const patioId = String(formData.get("patio_id"));
  if (placa.length < 7) return { ok: false, msg: "Placa inválida." };

  const { error } = await sb.from("cliente_veiculos").insert({
    cliente_id: clienteId,
    patio_id: patioId,
    tenant_id: tenantId,
    placa,
    descricao: String(formData.get("descricao") || "").trim() || null,
  });
  if (error)
    return {
      ok: false,
      msg:
        error.code === "23505"
          ? `A placa ${placa} já está cadastrada neste pátio.`
          : "Não foi possível adicionar o veículo.",
    };

  // Nome do cliente para a descrição legível.
  const { data: cli } = await sb
    .from("clientes")
    .select("nome")
    .eq("id", clienteId)
    .maybeSingle();

  await registrarAuditoria({
    modulo: "mensalistas",
    acao: "criou",
    patioId,
    descricao: `Adicionou a placa ${placa} ao cliente "${cli?.nome ?? "?"}"`,
    dados: { cliente_id: clienteId, placa },
  });

  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: `Placa ${placa} adicionada.` };
}

export async function removerVeiculo(id: string): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const { data: antes } = await sb
    .from("cliente_veiculos")
    .select("placa, patio_id, cliente_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb.from("cliente_veiculos").delete().eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível remover o veículo." };

  await registrarAuditoria({
    modulo: "mensalistas",
    acao: "removeu",
    patioId: (antes?.patio_id as string | undefined) ?? null,
    descricao: `Removeu a placa ${antes?.placa ?? "?"} de um mensalista`,
    dados: { id, placa: antes?.placa ?? null },
  });

  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: "Veículo removido." };
}

// ============================================================================
// Entrega 4a — Mensalidades (planos.valor + pagamentos)
// ============================================================================

/** Edita o valor mensal de um plano existente. */
export async function atualizarValorPlano(
  id: string,
  valor: number,
): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const seguro = Number.isFinite(valor) && valor >= 0 ? valor : 0;

  const { data: antes } = await sb
    .from("planos")
    .select("nome, valor, patio_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb.from("planos").update({ valor: seguro }).eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível salvar o valor." };

  await registrarAuditoria({
    modulo: "mensalistas",
    acao: "alterou",
    patioId: (antes?.patio_id as string | undefined) ?? null,
    descricao: `Alterou o valor do plano "${antes?.nome ?? "?"}": ${brl(antes?.valor)} → ${brl(seguro)}`,
    dados: { id, antes: antes?.valor ?? 0, depois: seguro },
  });

  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: `Valor do plano atualizado para ${brl(seguro)}.` };
}

/** Define/limpa o dia fixo de vencimento (1..28; null = ciclo de 30 dias). */
export async function atualizarDiaVencimento(
  id: string,
  dia: number | null,
): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const seguro =
    dia !== null && Number.isInteger(dia) && dia >= 1 && dia <= 28 ? dia : null;

  const { data: antes } = await sb
    .from("clientes")
    .select("nome, patio_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb
    .from("clientes")
    .update({ dia_vencimento: seguro })
    .eq("id", id);
  if (error)
    return { ok: false, msg: "Não foi possível salvar o dia de vencimento." };

  await registrarAuditoria({
    modulo: "mensalistas",
    acao: "alterou",
    patioId: (antes?.patio_id as string | undefined) ?? null,
    descricao: seguro
      ? `Definiu o dia de vencimento de "${antes?.nome ?? "?"}" para o dia ${seguro}`
      : `Removeu o dia fixo de vencimento de "${antes?.nome ?? "?"}" (volta ao ciclo de 30 dias)`,
    dados: { id, dia_vencimento: seguro },
  });

  revalidatePath("/painel/mensalistas");
  return {
    ok: true,
    msg: seguro
      ? `Vencimento no dia ${seguro} de cada mês.`
      : "Dia fixo removido — passa a usar ciclo de 30 dias.",
  };
}

export type PagamentoRow = {
  id: string;
  competencia: string;
  valor: number;
  forma_pagamento: string | null;
  pago_em: string;
  origem: string;
  registrado_por_nome: string | null;
  observacao: string | null;
  cancelado_em: string | null;
  cancelado_por_nome: string | null;
  cancelamento_motivo: string | null;
};

/** Registra um pagamento de mensalidade pelo painel (sem caixa — Decisão A). */
export async function registrarPagamento(input: {
  clienteId: string;
  patioId: string;
  planoId: string | null;
  competencia: string; // 'YYYY-MM-01'
  valor: number;
  formaPagamento: string;
  observacao?: string;
}): Promise<Resultado> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!user || !tenantId)
    return { ok: false, msg: "Sessão sem rede vinculada." };
  if (!Number.isFinite(input.valor) || input.valor < 0)
    return { ok: false, msg: "Valor inválido." };

  const nome =
    (user.user_metadata as { nome?: string } | undefined)?.nome ??
    user.email ??
    "gestor";

  const { data: cli } = await sb
    .from("clientes")
    .select("nome, vencimento, dia_vencimento")
    .eq("id", input.clienteId)
    .maybeSingle();

  const { error } = await sb.from("mensalidade_pagamentos").insert({
    id: crypto.randomUUID(),
    patio_id: input.patioId,
    tenant_id: tenantId,
    cliente_id: input.clienteId,
    plano_id: input.planoId,
    competencia: input.competencia,
    valor: input.valor,
    forma_pagamento: input.formaPagamento,
    origem: "painel",
    registrado_por: user.id,
    registrado_por_nome: nome,
    observacao: input.observacao?.trim() || null,
  });
  if (error) return { ok: false, msg: "Não foi possível registrar o pagamento." };

  // Avança a vigência: 1 pagamento = +1 ciclo (dia fixo ou +30 dias). Base é o
  // vencimento atual (estende de onde estava), ou hoje se ainda não houver.
  const vencAtual = cli?.vencimento
    ? String(cli.vencimento).slice(0, 10)
    : null;
  const novoVencimento = proximoVencimento(
    vencAtual,
    (cli?.dia_vencimento as number | null) ?? null,
    hojeYmdSaoPaulo(),
  );
  await sb
    .from("clientes")
    .update({ vencimento: novoVencimento })
    .eq("id", input.clienteId);

  const comp = competenciaLabel(input.competencia);
  await registrarAuditoria({
    modulo: "mensalistas",
    acao: "registrou_pagamento",
    patioId: input.patioId,
    descricao: `Registrou pagamento de ${brl(input.valor)} de "${cli?.nome ?? "?"}" (${comp}) — vence ${formatarVencimentoBR(novoVencimento)}`,
    dados: {
      cliente_id: input.clienteId,
      competencia: input.competencia,
      valor: input.valor,
      forma_pagamento: input.formaPagamento,
      vencimento_anterior: vencAtual,
      vencimento_novo: novoVencimento,
    },
  });

  revalidatePath("/painel/mensalistas");
  return {
    ok: true,
    msg: `Pagamento de ${brl(input.valor)} registrado. Próximo vencimento: ${formatarVencimentoBR(novoVencimento)}.`,
  };
}

/** Lista os pagamentos de um cliente (inclui cancelados). */
export async function listarPagamentos(
  clienteId: string,
): Promise<PagamentoRow[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("mensalidade_pagamentos")
    .select(
      "id, competencia, valor, forma_pagamento, pago_em, origem, registrado_por_nome, observacao, cancelado_em, cancelado_por_nome, cancelamento_motivo",
    )
    .eq("cliente_id", clienteId)
    .order("competencia", { ascending: false })
    .order("pago_em", { ascending: false });
  return (data ?? []) as PagamentoRow[];
}

/**
 * Cancela um pagamento (soft). O trigger do banco só permite tocar os campos de
 * cancelamento — por isso o UPDATE abaixo NÃO altera mais nada.
 */
export async function cancelarPagamento(
  id: string,
  motivo: string,
): Promise<Resultado> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, msg: "Sessão inválida." };

  const m = motivo.trim();
  if (!m) return { ok: false, msg: "Informe o motivo do cancelamento." };

  const nome =
    (user.user_metadata as { nome?: string } | undefined)?.nome ??
    user.email ??
    "gestor";

  const { data: pag } = await sb
    .from("mensalidade_pagamentos")
    .select("valor, competencia, patio_id, cancelado_em")
    .eq("id", id)
    .maybeSingle();
  if (pag?.cancelado_em)
    return { ok: false, msg: "Este pagamento já está cancelado." };

  const { error } = await sb
    .from("mensalidade_pagamentos")
    .update({
      cancelado_em: new Date().toISOString(),
      cancelado_por: user.id,
      cancelado_por_nome: nome,
      cancelamento_motivo: m,
    })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível cancelar o pagamento." };

  await registrarAuditoria({
    modulo: "mensalistas",
    acao: "cancelou_pagamento",
    patioId: (pag?.patio_id as string | undefined) ?? null,
    descricao: `Cancelou pagamento de ${brl(pag?.valor)}${pag?.competencia ? ` (${competenciaLabel(String(pag.competencia))})` : ""}. Motivo: ${m}`,
    dados: { id, motivo: m },
  });

  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: "Pagamento cancelado." };
}
