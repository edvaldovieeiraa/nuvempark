"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria, diffCampos, brl } from "@/lib/auditoria";

export type Resultado = { ok: boolean; msg: string } | null;

const ROTULOS: Record<string, string> = {
  nome: "nome",
  tipo_veiculo: "tipo",
  fracao_inicial_minutos: "fração inicial (min)",
  fracao_inicial_valor: "valor inicial",
  fracao_adicional_minutos: "fração adicional (min)",
  fracao_adicional_valor: "valor adicional",
  teto_diaria: "teto diária",
  tolerancia_minutos: "tolerância (min)",
  pernoite_valor: "pernoite",
  pernoite_hora_inicio: "pernoite início (h)",
  pernoite_hora_fim: "pernoite fim (h)",
  modalidade: "modalidade",
  diaria_valor: "valor da diária",
  diaria_horas: "duração da diária (h)",
  tarifa_atraso_id: "tabela do atraso",
};
const FMT: Record<string, (v: unknown) => string> = {
  fracao_inicial_valor: brl,
  fracao_adicional_valor: brl,
  teto_diaria: brl,
  pernoite_valor: brl,
  diaria_valor: brl,
};

/**
 * Campos da tarifa conforme a modalidade.
 *
 * Hóspede (db/41): valor e duração da diária + tabela avulsa do atraso. As
 * frações NÃO vão — o formulário as esconde nesse modo e o banco mantém os
 * padrões dele (as colunas são NOT NULL). Tipo "Todos os tipos" não vale para
 * hóspede: a tabela do atraso é escolhida entre as avulsas de UM tipo.
 */
function lerValores(
  formData: FormData,
): { ok: true; valores: Record<string, unknown>; nome: string; tipoVeiculo: string } | { ok: false; msg: string } {
  const num = (k: string) => Number(String(formData.get(k)).replace(",", "."));
  const nome = String(formData.get("nome") || "Padrão");
  const tipoVeiculo = String(formData.get("tipo_veiculo") || "carro");
  const modalidade = String(formData.get("modalidade") || "avulso");

  if (modalidade === "hospede") {
    const diariaValor = num("diaria_valor");
    const diariaHoras = num("diaria_horas");
    if (!Number.isFinite(diariaValor) || diariaValor <= 0) {
      return { ok: false, msg: "Informe o valor da diária." };
    }
    if (!Number.isInteger(diariaHoras) || diariaHoras < 1 || diariaHoras > 168) {
      return { ok: false, msg: "A duração da diária vai de 1 a 168 horas." };
    }
    if (tipoVeiculo === "ambos") {
      return { ok: false, msg: "Tabela de hóspede é por tipo de veículo: escolha um tipo." };
    }
    const atraso = String(formData.get("tarifa_atraso_id") || "");
    return {
      ok: true,
      nome,
      tipoVeiculo,
      valores: {
        nome,
        tipo_veiculo: tipoVeiculo,
        modalidade: "hospede",
        diaria_valor: diariaValor,
        diaria_horas: diariaHoras,
        tarifa_atraso_id: atraso || null,
      },
    };
  }

  return {
    ok: true,
    nome,
    tipoVeiculo,
    valores: {
      nome,
      tipo_veiculo: tipoVeiculo,
      modalidade: "avulso",
      diaria_valor: null,
      diaria_horas: null,
      tarifa_atraso_id: null,
      fracao_inicial_minutos: num("fracao_inicial_minutos"),
      fracao_inicial_valor: num("fracao_inicial_valor"),
      fracao_adicional_minutos: num("fracao_adicional_minutos"),
      fracao_adicional_valor: num("fracao_adicional_valor"),
      teto_diaria: num("teto_diaria"),
      tolerancia_minutos: num("tolerancia_minutos"),
      pernoite_valor: num("pernoite_valor"),
      pernoite_hora_inicio: num("pernoite_hora_inicio"),
      pernoite_hora_fim: num("pernoite_hora_fim"),
    },
  };
}

export async function criarTarifa(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const patioId = String(formData.get("patio_id"));
  const lidos = lerValores(formData);
  if (!lidos.ok) return { ok: false, msg: lidos.msg };
  const { valores, nome, tipoVeiculo } = lidos;

  const { error } = await sb
    .from("tarifas")
    .insert({ tenant_id: tenantId, patio_id: patioId, ...valores });

  if (error) {
    console.error("[painel/tarifas] criarTarifa:", error);
    return { ok: false, msg: "Não foi possível criar a tarifa." };
  }

  await registrarAuditoria({
    modulo: "tarifas",
    acao: "criou",
    patioId,
    descricao: `Criou a tarifa "${nome}" (${tipoVeiculo})`,
    dados: valores,
  });

  revalidatePath("/painel/tarifas");
  return { ok: true, msg: `Tarifa "${nome}" criada com sucesso.` };
}

export async function atualizarTarifa(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const sb = await createClient();
  const id = String(formData.get("id"));
  const lidos = lerValores(formData);
  if (!lidos.ok) return { ok: false, msg: lidos.msg };
  const { valores, nome, tipoVeiculo } = lidos;

  // Estado anterior para o diff antes→depois.
  const { data: antes } = await sb
    .from("tarifas")
    .select(
      "patio_id, nome, tipo_veiculo, modalidade, diaria_valor, diaria_horas, tarifa_atraso_id, fracao_inicial_minutos, fracao_inicial_valor, fracao_adicional_minutos, fracao_adicional_valor, teto_diaria, tolerancia_minutos, pernoite_valor, pernoite_hora_inicio, pernoite_hora_fim",
    )
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb.from("tarifas").update(valores).eq("id", id);
  if (error) {
    console.error("[painel/tarifas] atualizarTarifa:", error);
    return { ok: false, msg: "Não foi possível salvar a tarifa." };
  }

  const dif = antes
    ? diffCampos(antes, valores, ROTULOS, FMT)
    : { mudou: false, resumo: "", antes: {}, depois: {} };
  await registrarAuditoria({
    modulo: "tarifas",
    acao: "alterou",
    patioId: (antes?.patio_id as string | undefined) ?? null,
    descricao: dif.mudou
      ? `Alterou a tarifa "${nome}" (${tipoVeiculo}): ${dif.resumo}`
      : `Salvou a tarifa "${nome}" (${tipoVeiculo}) sem mudança de valores`,
    dados: { antes: dif.antes, depois: dif.depois },
  });

  revalidatePath("/painel/tarifas");
  return {
    ok: true,
    msg: `Tarifa "${nome}" atualizada — vale já na próxima cobrança do app.`,
  };
}

/**
 * Salva a nova ordem das tarifas (a ordem que o app mostra os chips e o app
 * pré-seleciona a primeira). Recebe os ids na ordem desejada.
 */
export async function reordenarTarifas(ids: string[]): Promise<Resultado> {
  const sb = await createClient();
  const updates = await Promise.all(
    ids.map((id, i) => sb.from("tarifas").update({ ordem: i }).eq("id", id)),
  );
  if (updates.some((u) => u.error))
    return { ok: false, msg: "Não foi possível salvar a ordem." };

  const { data: patio } = await sb
    .from("tarifas")
    .select("patio_id")
    .eq("id", ids[0] ?? "")
    .maybeSingle();
  await registrarAuditoria({
    modulo: "tarifas",
    acao: "reordenou",
    patioId: (patio?.patio_id as string | undefined) ?? null,
    descricao: `Reordenou as tarifas (${ids.length} no total)`,
    dados: { ordem: ids },
  });

  revalidatePath("/painel/tarifas");
  return { ok: true, msg: "Ordem das tarifas atualizada." };
}

export async function desativarTarifa(id: string): Promise<Resultado> {
  const sb = await createClient();
  const { data: antes } = await sb
    .from("tarifas")
    .select("nome, tipo_veiculo, patio_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb.from("tarifas").update({ ativo: false }).eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível desativar." };

  await registrarAuditoria({
    modulo: "tarifas",
    acao: "removeu",
    patioId: (antes?.patio_id as string | undefined) ?? null,
    descricao: `Desativou a tarifa "${antes?.nome ?? "?"}" (${antes?.tipo_veiculo ?? "?"})`,
    dados: { id },
  });

  revalidatePath("/painel/tarifas");
  return { ok: true, msg: "Tarifa desativada." };
}
