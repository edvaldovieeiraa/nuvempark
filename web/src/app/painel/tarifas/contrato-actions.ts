"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { idCampo, mensagem, prepararContrato, type ErroCampo } from "@/lib/contrato-painel";

/**
 * Contratos (motor v2) no painel — Feature 2a, só simulação: nada daqui chega
 * ao app ou ao QR (o bootstrap só entrega `contrato` a quem pede, e o QR cai
 * na reserva avulsa — PR #7).
 *
 * O servidor nunca confia no navegador: o contrato passa de novo por
 * `prepararContrato` (forma + `validar` + limites do painel) e é gravado já
 * normalizado. As ações das tarifas (`actions.ts`) continuam recusando contrato.
 */
export type ResultadoContrato =
  | { ok: true; msg: string }
  | { ok: false; msg: string; erros?: ErroCampo[] }
  | null;

const MSG_SEM_DB44 = "O banco ainda não aceita contratos — aplique a migração 44.";
const MAX_NOME = 80;

/**
 * Banco sem `db/44`: a coluna `contrato` não existe (PostgREST PGRST204 ou
 * Postgres 42703) ou o check de modalidade não tem 'contrato' (23514 — db/42
 * reaplicado depois da 44).
 */
function semDb44(error: { code?: string } | null): boolean {
  return ["PGRST204", "42703", "23514"].includes(error?.code ?? "");
}

type Campos =
  | { ok: true; nome: string; tipoVeiculo: string; json: object }
  | { ok: false; resultado: ResultadoContrato };

function lerCampos(formData: FormData): Campos {
  const nome = String(formData.get("nome") ?? "").trim();
  const tipoVeiculo = String(formData.get("tipo_veiculo") ?? "").trim() || "carro";
  if (!nome) return { ok: false, resultado: { ok: false, msg: "Dê um nome ao contrato." } };
  if (nome.length > MAX_NOME || tipoVeiculo.length > MAX_NOME) {
    return { ok: false, resultado: { ok: false, msg: "Nome grande demais." } };
  }
  const preparo = prepararContrato(formData.get("contrato"));
  if (!preparo.ok) {
    return {
      ok: false,
      resultado: {
        ok: false,
        msg: "O contrato tem erros: corrija antes de salvar.",
        erros: preparo.erros.map((e) => ({
          ...e,
          campo: idCampo(e.caminho),
          mensagem: mensagem(e.codigo),
        })),
      },
    };
  }
  return { ok: true, nome, tipoVeiculo, json: preparo.json };
}

export async function criarContrato(
  _prev: ResultadoContrato,
  formData: FormData,
): Promise<ResultadoContrato> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const patioId = String(formData.get("patio_id") ?? "");
  if (!patioId) return { ok: false, msg: "Pátio não informado." };
  const campos = lerCampos(formData);
  if (!campos.ok) return campos.resultado;
  const { nome, tipoVeiculo, json } = campos;

  // O pátio vem do navegador: só grava num pátio que a RLS deixa este gestor ver.
  const { data: patio } = await sb.from("patios").select("id").eq("id", patioId).maybeSingle();
  if (!patio) return { ok: false, msg: "Pátio não encontrado." };

  const { error } = await sb.from("tarifas").insert({
    tenant_id: tenantId,
    patio_id: patioId,
    nome,
    tipo_veiculo: tipoVeiculo,
    modalidade: "contrato",
    contrato: json,
  });
  if (error) {
    console.error("[painel/tarifas] criarContrato:", error);
    return { ok: false, msg: semDb44(error) ? MSG_SEM_DB44 : "Não foi possível criar o contrato." };
  }

  await registrarAuditoria({
    modulo: "tarifas",
    acao: "criou",
    patioId,
    descricao: `Criou o contrato "${nome}" (${tipoVeiculo})`,
    dados: { contrato: json },
  });

  revalidatePath("/painel/tarifas");
  return { ok: true, msg: "Contrato criado: só simulação, ainda não cobra no app." };
}

export async function atualizarContrato(
  _prev: ResultadoContrato,
  formData: FormData,
): Promise<ResultadoContrato> {
  const sb = await createClient();
  const id = String(formData.get("id") ?? "");
  const campos = lerCampos(formData);
  if (!campos.ok) return campos.resultado;
  const { nome, tipoVeiculo, json } = campos;

  const { data: antes, error: erroLeitura } = await sb
    .from("tarifas")
    .select("patio_id, nome, tipo_veiculo, modalidade, contrato")
    .eq("id", id)
    .eq("ativo", true)
    .maybeSingle();
  if (erroLeitura) {
    console.error("[painel/tarifas] atualizarContrato (leitura):", erroLeitura);
    return { ok: false, msg: semDb44(erroLeitura) ? MSG_SEM_DB44 : "Não foi possível salvar o contrato." };
  }
  if (!antes) return { ok: false, msg: "Contrato não encontrado." };
  // Só contrato: este formulário não tem as colunas de fração de uma avulsa.
  if (antes.modalidade !== "contrato") return { ok: false, msg: "Esta tarifa não é um contrato." };

  const { data: gravadas, error } = await sb
    .from("tarifas")
    .update({ nome, tipo_veiculo: tipoVeiculo, contrato: json })
    .eq("id", id)
    .eq("ativo", true)
    .eq("modalidade", "contrato")
    .select("id");
  if (error || !gravadas?.length) {
    if (error) console.error("[painel/tarifas] atualizarContrato:", error);
    return { ok: false, msg: semDb44(error) ? MSG_SEM_DB44 : "Não foi possível salvar o contrato." };
  }

  const mudou =
    antes.nome !== nome ||
    antes.tipo_veiculo !== tipoVeiculo ||
    JSON.stringify(antes.contrato) !== JSON.stringify(json);
  await registrarAuditoria({
    modulo: "tarifas",
    acao: "alterou",
    patioId: (antes.patio_id as string | undefined) ?? null,
    descricao: mudou
      ? `Alterou o contrato "${nome}" (${tipoVeiculo})`
      : `Salvou o contrato "${nome}" (${tipoVeiculo}) sem mudança`,
    dados: {
      antes: { nome: antes.nome, tipo_veiculo: antes.tipo_veiculo, contrato: antes.contrato },
      depois: { nome, tipo_veiculo: tipoVeiculo, contrato: json },
    },
  });

  revalidatePath("/painel/tarifas");
  return { ok: true, msg: "Contrato salvo: só simulação, ainda não cobra no app." };
}

export async function desativarContrato(id: string): Promise<ResultadoContrato> {
  const sb = await createClient();
  const { data: antes } = await sb
    .from("tarifas")
    .select("nome, tipo_veiculo, patio_id, modalidade")
    .eq("id", id)
    .maybeSingle();
  if (!antes) return { ok: false, msg: "Contrato não encontrado." };
  if (antes.modalidade !== "contrato") return { ok: false, msg: "Esta tarifa não é um contrato." };

  const { data: gravadas, error } = await sb
    .from("tarifas")
    .update({ ativo: false })
    .eq("id", id)
    .eq("modalidade", "contrato")
    .select("id");
  if (error || !gravadas?.length) {
    if (error) console.error("[painel/tarifas] desativarContrato:", error);
    return { ok: false, msg: "Não foi possível desativar o contrato." };
  }

  await registrarAuditoria({
    modulo: "tarifas",
    acao: "removeu",
    patioId: (antes.patio_id as string | undefined) ?? null,
    descricao: `Desativou o contrato "${antes.nome}" (${antes.tipo_veiculo})`,
    dados: { id },
  });

  revalidatePath("/painel/tarifas");
  return { ok: true, msg: "Contrato desativado." };
}
