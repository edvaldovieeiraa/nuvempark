"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

export type Resultado = { ok: boolean; msg: string } | null;

type Campos = {
  nome: string;
  documento: string | null;
  modo_custo: "cortesia" | "faturado";
  limite_quantidade: number | null;
  limite_periodo: "mes" | "total" | null;
};

function lerCampos(formData: FormData): Campos {
  const nome = String(formData.get("nome") ?? "").trim();
  const documento = String(formData.get("documento") ?? "").trim();
  const modo = String(formData.get("modo_custo") ?? "cortesia");
  const semLimite = String(formData.get("sem_limite") ?? "") === "on";

  const qtd = Number(String(formData.get("limite_quantidade") ?? "0"));
  const periodo = String(formData.get("limite_periodo") ?? "mes");

  return {
    nome,
    documento: documento || null,
    modo_custo: modo === "faturado" ? "faturado" : "cortesia",
    // Os dois campos andam juntos: `parceiros_limite_coerente` em db/31 recusa
    // quantidade sem período e período sem quantidade. Zerar os dois de uma vez
    // é o que "sem limite" significa.
    limite_quantidade: semLimite || !Number.isFinite(qtd) || qtd <= 0 ? null : Math.trunc(qtd),
    limite_periodo:
      semLimite || !Number.isFinite(qtd) || qtd <= 0
        ? null
        : periodo === "total"
          ? "total"
          : "mes",
  };
}

function validar(c: Campos): string | null {
  if (!c.nome) return "Dê um nome ao parceiro.";
  if (c.limite_quantidade !== null && c.limite_quantidade <= 0) {
    return "O limite precisa ser maior que zero — ou marque 'sem limite'.";
  }
  return null;
}

/** Ids das regras marcadas no formulário. */
function lerRegras(formData: FormData): string[] {
  return formData
    .getAll("regras")
    .map((v) => String(v))
    .filter(Boolean);
}

async function contexto() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  return { sb, tenantId };
}

/**
 * Reescreve os vínculos parceiro↔regra.
 *
 * Apaga tudo e reinsere em vez de calcular a diferença: o conjunto tem alguns
 * poucos itens, e um diff aqui traria a chance de deixar vínculo órfão em troca
 * de nada. `parceiro_regras` não tem histórico a preservar — quem guarda qual
 * regra foi usada é `liberacoes.regra_id`, que não depende deste vínculo.
 */
async function sincronizarRegras(
  sb: Awaited<ReturnType<typeof createClient>>,
  parceiroId: string,
  tenantId: string,
  regras: string[],
): Promise<boolean> {
  const { error: erroApagar } = await sb
    .from("parceiro_regras")
    .delete()
    .eq("parceiro_id", parceiroId);
  if (erroApagar) return false;

  if (regras.length === 0) return true;

  const { error } = await sb.from("parceiro_regras").insert(
    regras.map((regraId) => ({
      parceiro_id: parceiroId,
      regra_id: regraId,
      tenant_id: tenantId,
    })),
  );
  return !error;
}

export async function criarParceiro(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await contexto();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const patioId = String(formData.get("patio_id") ?? "");
  if (!patioId) return { ok: false, msg: "Pátio não informado." };

  const campos = lerCampos(formData);
  const erro = validar(campos);
  if (erro) return { ok: false, msg: erro };

  const { data, error } = await sb
    .from("parceiros")
    .insert({ ...campos, patio_id: patioId, tenant_id: tenantId })
    .select("id")
    .single();

  if (error || !data) return { ok: false, msg: "Não foi possível criar o parceiro." };

  const regras = lerRegras(formData);
  const okRegras = await sincronizarRegras(sb, data.id, tenantId, regras);

  await registrarAuditoria({
    modulo: "vouchers",
    acao: "criar_parceiro",
    descricao: `Parceiro "${campos.nome}" criado (${campos.modo_custo}).`,
    dados: { ...campos, regras },
    patioId,
  });

  revalidatePath("/painel/vouchers/parceiros");

  // Parceiro sem regra nenhuma não libera nada — o default é seguro, mas o
  // gestor precisa saber que criou um acesso que ainda não faz nada.
  if (!okRegras) {
    return {
      ok: true,
      msg: `Parceiro criado, mas as regras não foram vinculadas. Edite e tente de novo.`,
    };
  }
  if (regras.length === 0) {
    return {
      ok: true,
      msg: `Parceiro "${campos.nome}" criado. Ele ainda NÃO pode liberar nada — falta conceder ao menos uma regra.`,
    };
  }
  return { ok: true, msg: `Parceiro "${campos.nome}" criado.` };
}

export async function salvarParceiro(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await contexto();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, msg: "Parceiro não informado." };

  const campos = lerCampos(formData);
  const erro = validar(campos);
  if (erro) return { ok: false, msg: erro };

  const { error } = await sb.from("parceiros").update(campos).eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível salvar o parceiro." };

  const regras = lerRegras(formData);
  await sincronizarRegras(sb, id, tenantId, regras);

  await registrarAuditoria({
    modulo: "vouchers",
    acao: "editar_parceiro",
    descricao: `Parceiro "${campos.nome}" alterado.`,
    dados: { id, ...campos, regras },
    patioId: String(formData.get("patio_id") ?? "") || null,
  });

  revalidatePath("/painel/vouchers/parceiros");
  return {
    ok: true,
    msg:
      regras.length === 0
        ? "Parceiro salvo. Sem regras concedidas, ele não pode liberar nada."
        : "Parceiro salvo.",
  };
}

/**
 * Desativa em vez de apagar — o histórico de liberações e as competências
 * fechadas apontam para ele. E é o desligamento imediato do acesso: as funções
 * de db/33 e db/34 exigem `parceiros.ativo`, então o login do lojista para de
 * funcionar na mesma hora.
 */
export async function alternarParceiro(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await contexto();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const id = String(formData.get("id") ?? "");
  const ativo = String(formData.get("ativo") ?? "") === "true";
  if (!id) return { ok: false, msg: "Parceiro não informado." };

  const { error } = await sb.from("parceiros").update({ ativo: !ativo }).eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível alterar o parceiro." };

  await registrarAuditoria({
    modulo: "vouchers",
    acao: ativo ? "desativar_parceiro" : "reativar_parceiro",
    descricao: `Parceiro ${ativo ? "desativado" : "reativado"}.`,
    dados: { id },
    patioId: String(formData.get("patio_id") ?? "") || null,
  });

  revalidatePath("/painel/vouchers/parceiros");
  return {
    ok: true,
    msg: ativo
      ? "Parceiro desativado — o acesso dele parou de funcionar agora."
      : "Parceiro reativado.",
  };
}
