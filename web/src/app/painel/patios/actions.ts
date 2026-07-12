"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria, diffCampos } from "@/lib/auditoria";

export type Resultado = { ok: boolean; msg: string } | null;

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

export async function criarPatio(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await tenantDoGestor();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const nome = String(formData.get("nome") || "").trim();
  const codigo = String(formData.get("codigo") || "").trim() || null;
  const qtdVagas = Number(formData.get("qtd_vagas") || 0);
  if (!nome) return { ok: false, msg: "Informe o nome do pátio." };

  const { data: patio, error } = await sb
    .from("patios")
    .insert({ tenant_id: tenantId, nome, codigo, qtd_vagas: qtdVagas })
    .select("id")
    .single();
  if (error || !patio)
    return { ok: false, msg: "Não foi possível criar o pátio." };

  // Config default do pátio (cupom, tipos de veículo, formas de pagamento)
  await sb.from("patio_config").insert({
    patio_id: patio.id,
    tenant_id: tenantId,
    patio_ativo: true,
    ticket_cabecalho: [nome],
  });

  await registrarAuditoria({
    modulo: "patios",
    acao: "criou",
    patioId: null, // pátio é cadastro da rede (tenant)
    descricao: `Criou o pátio "${nome}" com ${qtdVagas} vaga(s)`,
    dados: { nome, codigo, qtd_vagas: qtdVagas },
  });

  revalidatePath("/painel/patios");
  return { ok: true, msg: `Pátio "${nome}" criado.` };
}

export async function atualizarPatio(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const id = String(formData.get("id"));
  const nome = String(formData.get("nome") || "").trim();
  if (!nome) return { ok: false, msg: "Informe o nome do pátio." };

  const depois = {
    nome,
    codigo: String(formData.get("codigo") || "").trim() || null,
    qtd_vagas: Number(formData.get("qtd_vagas") || 0),
  };

  const { data: antes } = await sb
    .from("patios")
    .select("nome, codigo, qtd_vagas")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb.from("patios").update(depois).eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível salvar." };

  const dif = antes
    ? diffCampos(antes, depois, {
        nome: "nome",
        codigo: "código",
        qtd_vagas: "vagas",
      })
    : { mudou: false, resumo: "", antes: {}, depois: {} };
  await registrarAuditoria({
    modulo: "patios",
    acao: "alterou",
    patioId: null,
    descricao: dif.mudou
      ? `Alterou o pátio "${nome}": ${dif.resumo}`
      : `Salvou o pátio "${nome}" sem mudanças`,
    dados: { antes: dif.antes, depois: dif.depois },
  });

  revalidatePath("/painel/patios");
  return { ok: true, msg: "Pátio atualizado." };
}

export async function alternarAtivoPatio(
  id: string,
  ativoAtual: boolean,
): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const { data: antes } = await sb
    .from("patios")
    .select("nome")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb
    .from("patios")
    .update({ ativo: !ativoAtual })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível alterar o status." };

  await registrarAuditoria({
    modulo: "patios",
    acao: "alterou",
    patioId: null,
    descricao: `${ativoAtual ? "Desativou" : "Reativou"} o pátio "${antes?.nome ?? "?"}"`,
    dados: { id, ativo: !ativoAtual },
  });

  revalidatePath("/painel/patios");
  return {
    ok: true,
    msg: ativoAtual ? "Pátio desativado." : "Pátio reativado.",
  };
}

export async function salvarCupom(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await tenantDoGestor();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const patioId = String(formData.get("patio_id"));
  const linhas = (v: unknown) =>
    String(v || "")
      .split(/\r?\n/)
      .map((l) => l.trim().slice(0, 48))
      .filter(Boolean)
      .slice(0, 4);

  const cabecalho = linhas(formData.get("cabecalho"));
  const rodape = linhas(formData.get("rodape"));

  const { data: antes } = await sb
    .from("patio_config")
    .select("ticket_cabecalho, ticket_rodape")
    .eq("patio_id", patioId)
    .maybeSingle();

  const { error } = await sb.from("patio_config").upsert(
    {
      patio_id: patioId,
      tenant_id: tenantId,
      ticket_cabecalho: cabecalho,
      ticket_rodape: rodape,
    },
    { onConflict: "patio_id" },
  );
  if (error) return { ok: false, msg: "Não foi possível salvar o cupom." };

  const antesCab = (antes?.ticket_cabecalho as string[] | null) ?? [];
  const antesRod = (antes?.ticket_rodape as string[] | null) ?? [];
  const mudouCab = antesCab.join("|") !== cabecalho.join("|");
  const mudouRod = antesRod.join("|") !== rodape.join("|");
  const partes: string[] = [];
  if (mudouCab) partes.push("cabeçalho");
  if (mudouRod) partes.push("rodapé");

  await registrarAuditoria({
    modulo: "config",
    acao: "alterou",
    patioId,
    descricao: partes.length
      ? `Alterou o ${partes.join(" e ")} do cupom do ticket`
      : "Salvou o cupom do ticket sem mudanças",
    dados: {
      antes: { cabecalho: antesCab, rodape: antesRod },
      depois: { cabecalho, rodape },
    },
  });

  revalidatePath("/painel/patios");
  return { ok: true, msg: "Cupom do pátio atualizado." };
}
