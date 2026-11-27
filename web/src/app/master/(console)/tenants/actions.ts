"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import { garantirFaturaTrial } from "@/lib/faturas-trial";
import { listarGestoresDoTenant } from "@/lib/gestores";
import { asaasAmbiente, asaasConfigurado, excluirCobranca, obterCobranca } from "@/lib/asaas";
import { BUCKET_ENTRADAS } from "@/lib/fotos";
import {
  cobrancasParaCancelar,
  decisaoCobrancaAsaas,
  motivoBloqueioExclusao,
} from "@/lib/excluir-rede";

export type Resultado =
  | { ok: true; msg: string; codigo?: string }
  | { ok: false; msg: string }
  | null;

/**
 * Cria uma rede completa: tenant (com código 4-díg gerado no banco) +
 * primeiro gestor (usuário Supabase Auth com app_metadata.tenant_id) +
 * assinatura. Tudo com service_role — exclusivo do console master.
 */
export async function criarTenant(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();

  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const senha = String(formData.get("senha") || "");
  const valor = Number(String(formData.get("valor_por_patio") || "0").replace(",", "."));

  if (!nome) return { ok: false, msg: "Informe o nome da rede." };
  if (!email.includes("@"))
    return { ok: false, msg: "Informe um e-mail válido para o gestor." };
  if (senha.length < 6)
    return { ok: false, msg: "A senha do gestor precisa de ao menos 6 caracteres." };

  // 1) Código único de 4 dígitos (função do banco).
  const { data: codigoData, error: erroCodigo } = await sb.rpc(
    "fn_gerar_codigo_tenant",
  );
  if (erroCodigo || !codigoData)
    return { ok: false, msg: "Não foi possível gerar o código da rede." };
  const codigo = String(codigoData);

  // 2) Tenant.
  const { data: tenant, error: erroTenant } = await sb
    .from("tenants")
    .insert({ nome, codigo })
    .select("id")
    .single();
  if (erroTenant || !tenant)
    return { ok: false, msg: "Não foi possível criar a rede." };

  // 3) Gestor (Supabase Auth). tenant_id vai em app_metadata → RLS do painel.
  const { data: usuario, error: erroUser } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    app_metadata: { tenant_id: tenant.id },
  });
  if (erroUser) {
    // rollback do tenant para não deixar órfão
    await sb.from("tenants").delete().eq("id", tenant.id);
    return {
      ok: false,
      msg: erroUser.message.includes("already")
        ? `Já existe um usuário com o e-mail ${email}.`
        : "Não foi possível criar o gestor.",
    };
  }

  // 4) Assinatura.
  //
  // O erro daqui É checado, ao contrário do que acontecia antes. Sem assinatura
  // a rede vira um fantasma: /master/assinaturas lista a partir DESTA tabela,
  // então ela some do painel, fica fora do MRR e nunca é faturada — enquanto o
  // app do operador funciona normalmente. A action retornava "ok" com o código
  // de acesso e nada denunciava a falha.
  const { error: erroAssinatura } = await sb.from("assinaturas").insert({
    tenant_id: tenant.id,
    valor_por_patio: valor,
    estado: "ativa",
  });
  if (erroAssinatura) {
    // Desfaz na ordem inversa: o usuário do Auth primeiro (não cai por FK),
    // depois o tenant (que leva junto o que tiver `on delete cascade`).
    if (usuario?.user?.id) {
      await sb.auth.admin.deleteUser(usuario.user.id);
    }
    await sb.from("tenants").delete().eq("id", tenant.id);
    console.error("[master/tenants] criarTenant assinatura:", erroAssinatura);
    return {
      ok: false,
      msg: "Não foi possível criar a assinatura da rede. Nada foi salvo — tente de novo.",
    };
  }

  revalidatePath("/master/tenants");
  return {
    ok: true,
    msg: `Rede "${nome}" criada. Código de acesso: ${codigo}.`,
    codigo,
  };
}

export async function mudarEstadoAssinatura(
  tenantId: string,
  novoEstado: "ativa" | "atrasada" | "suspensa",
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("assinaturas")
    .update({ estado: novoEstado })
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, msg: "Não foi possível mudar o estado." };

  revalidatePath("/master/tenants");
  const rotulo = { ativa: "reativada", atrasada: "marcada como atrasada", suspensa: "suspensa" };
  return { ok: true, msg: `Assinatura ${rotulo[novoEstado]}.` };
}

/** Converte um trial (ou qualquer estado) em assinatura ativa. */
export async function ativarAssinatura(tenantId: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };
  const sb = createAdminClient();
  const { error } = await sb
    .from("assinaturas")
    .update({ estado: "ativa", trial_expira_em: null })
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, msg: "Não foi possível ativar." };
  revalidatePath("/master/tenants");
  revalidatePath("/master/financeiro");
  return { ok: true, msg: "Assinatura ativada." };
}

/** Estende o trial por mais N dias (default 15). */
export async function estenderTrial(
  tenantId: string,
  dias: number = 15,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };
  const sb = createAdminClient();
  const nova = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  const { error } = await sb
    .from("assinaturas")
    .update({ estado: "trial", trial_expira_em: nova.toISOString() })
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, msg: "Não foi possível estender." };
  await garantirFaturaTrial(sb, tenantId);
  revalidatePath("/master/tenants");
  revalidatePath("/master/assinaturas");
  return { ok: true, msg: `Trial estendido por ${dias} dias.` };
}

export async function alternarTenantAtivo(
  tenantId: string,
  ativoAtual: boolean,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("tenants")
    .update({ ativo: !ativoAtual })
    .eq("id", tenantId);
  if (error) return { ok: false, msg: "Não foi possível alterar a rede." };

  revalidatePath("/master/tenants");
  return {
    ok: true,
    msg: ativoAtual ? "Rede desativada." : "Rede reativada.",
  };
}

// ----------------------------------------------------------------------------
// Exclusão definitiva da rede
// ----------------------------------------------------------------------------

export type ResumoExclusao =
  | {
      ok: true;
      nome: string;
      codigo: string;
      ativo: boolean;
      contaRevisao: boolean;
      patios: number;
      tickets: number;
      faturasPagas: number;
      cobrancasAbertas: string[];
      asaasLigado: boolean;
      logins: string[];
    }
  | { ok: false; msg: string };

/**
 * O que some junto com a rede — o modal de confirmação mostra isto antes do
 * botão final. Só leitura.
 */
export async function resumoExclusaoTenant(tenantId: string): Promise<ResumoExclusao> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { data: rede } = await sb
    .from("tenants")
    .select("nome, codigo, ativo, conta_revisao")
    .eq("id", tenantId)
    .maybeSingle();
  if (!rede) return { ok: false, msg: "Rede não encontrada." };

  const [patios, tickets, faturas, parceiros, gestores] = await Promise.all([
    sb.from("patios").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    sb.from("tickets").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    sb.from("faturas").select("estado, gateway_cobranca_id").eq("tenant_id", tenantId),
    sb.from("usuarios_parceiro").select("email").eq("tenant_id", tenantId),
    listarGestoresDoTenant(sb, tenantId),
  ]);

  const listaFaturas = faturas.data ?? [];
  return {
    ok: true,
    nome: rede.nome,
    codigo: rede.codigo,
    ativo: rede.ativo,
    contaRevisao: !!rede.conta_revisao,
    patios: patios.count ?? 0,
    tickets: tickets.count ?? 0,
    faturasPagas: listaFaturas.filter((f) => f.estado === "paga").length,
    cobrancasAbertas: cobrancasParaCancelar(listaFaturas),
    asaasLigado: asaasConfigurado(),
    logins: [
      ...gestores.map((g) => g.email).filter((e): e is string => !!e),
      ...(parceiros.data ?? []).map((p) => `${p.email} (parceiro)`),
    ],
  };
}

/** Todas as linhas de uma consulta, de 1000 em 1000 (teto silencioso do Supabase). */
async function idsPaginados(
  sb: ReturnType<typeof createAdminClient>,
  tabela: "patios" | "avarias",
  tenantId: string,
): Promise<string[]> {
  const ids: string[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb
      .from(tabela)
      .select("id")
      .eq("tenant_id", tenantId)
      .order("id")
      .range(de, de + 999);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    ids.push(...(data ?? []).map((r) => r.id as string));
    if (!data || data.length < 1000) return ids;
  }
}

/**
 * Apaga tudo dentro de uma pasta do bucket de fotos. Devolve quantos arquivos
 * saíram, ou -1 se o Storage recusou (a pasta fica, a exclusão da rede não volta).
 */
async function esvaziarPasta(
  sb: ReturnType<typeof createAdminClient>,
  pasta: string,
): Promise<number> {
  let total = 0;
  // Relista do início a cada volta: o que foi removido some da listagem.
  for (let volta = 0; volta < 100; volta++) {
    const { data, error } = await sb.storage.from(BUCKET_ENTRADAS).list(pasta, { limit: 1000 });
    if (error) return -1;
    const arquivos = (data ?? []).filter((o) => o.id).map((o) => `${pasta}/${o.name}`);
    if (arquivos.length === 0) return total;
    const { error: erroRemover } = await sb.storage.from(BUCKET_ENTRADAS).remove(arquivos);
    if (erroRemover) return -1;
    total += arquivos.length;
  }
  return total;
}

/**
 * Exclui a rede para sempre: logins (gestores e parceiros), pátios, tickets,
 * caixa, faturas, assinatura, aparelhos e as fotos do Storage.
 *
 * Ordem, e por quê:
 *   1. Guardas (sessão, conta de revisão, rede desativada, código digitado).
 *   2. Cobranças da mensalidade no Asaas: TODAS consultadas antes de qualquer
 *      exclusão. Se alguma foi paga lá e o webhook não chegou, para tudo.
 *   3. Pastas de fotos anotadas (depois do delete os ids somem).
 *   4. fn_master_excluir_tenant (db/54): logins + rede numa transação.
 *   5. Fotos, por último e sem desfazer nada se falhar: arquivo órfão num
 *      bucket privado não é visto por ninguém; login órfão seria.
 */
export async function excluirTenant(
  tenantId: string,
  codigoDigitado: string,
  /**
   * `false` quando quem chama é a ficha da rede: o revalidatePath re-renderiza
   * a rota atual na resposta da action, e a ficha de uma rede que acabou de
   * sumir cai no notFound() antes de o cliente navegar para a lista. As telas
   * do master são force-dynamic, então a lista já chega fresca na navegação.
   */
  revalidar: boolean = true,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { data: rede } = await sb
    .from("tenants")
    .select("nome, codigo, ativo, conta_revisao")
    .eq("id", tenantId)
    .maybeSingle();
  if (!rede) return { ok: false, msg: "Rede não encontrada." };

  const bloqueio = motivoBloqueioExclusao(
    { ativo: rede.ativo, contaRevisao: !!rede.conta_revisao, codigo: rede.codigo },
    codigoDigitado,
  );
  if (bloqueio) return { ok: false, msg: bloqueio };

  // 2) Asaas
  const { data: faturas, error: erroFaturas } = await sb
    .from("faturas")
    .select("estado, gateway_cobranca_id")
    .eq("tenant_id", tenantId);
  if (erroFaturas) return { ok: false, msg: "Não foi possível ler as faturas da rede." };

  const cobrancas = cobrancasParaCancelar(faturas ?? []);
  const avisos: string[] = [];
  const excluidasNoAsaas: string[] = [];
  if (cobrancas.length > 0 && !asaasConfigurado()) {
    avisos.push(
      `Asaas desligado neste servidor: cancele à mão ${cobrancas.length === 1 ? "a cobrança" : "as cobranças"} ${cobrancas.join(", ")}.`,
    );
  } else if (cobrancas.length > 0) {
    const aExcluir: string[] = [];
    for (const id of cobrancas) {
      let estado;
      try {
        estado = await obterCobranca(id);
      } catch (e) {
        console.error("[master/tenants] excluirTenant obterCobranca:", id, e);
        return { ok: false, msg: `Não consegui consultar a cobrança ${id} no Asaas. Nada foi apagado.` };
      }
      const decisao = decisaoCobrancaAsaas(estado);
      if (decisao === "bloquear")
        return {
          ok: false,
          msg: `A cobrança ${id} está "${estado?.status ?? "?"}" no Asaas. Resolva lá antes de excluir a rede. Nada foi apagado.`,
        };
      if (decisao === "excluir") aExcluir.push(id);
      // 404 é normal para cobrança já apagada, mas também é o que se vê quando
      // o servidor aponta para o ambiente errado do Asaas (ver asaasAmbiente):
      // o master precisa saber que nada foi cancelado.
      if (estado === null)
        avisos.push(`A cobrança ${id} não existe no Asaas (${asaasAmbiente()}); confira se ela não está em outro ambiente.`);
    }
    for (const id of aExcluir) {
      try {
        await excluirCobranca(id);
        excluidasNoAsaas.push(id);
      } catch (e) {
        console.error("[master/tenants] excluirTenant excluirCobranca:", id, e);
        return {
          ok: false,
          msg:
            `O Asaas recusou excluir a cobrança ${id}. A rede não foi apagada.` +
            (excluidasNoAsaas.length ? ` Já excluídas no Asaas: ${excluidasNoAsaas.join(", ")}.` : ""),
        };
      }
    }
  }

  // 3) Pastas de fotos
  let pastas: string[];
  try {
    const [patios, avarias] = await Promise.all([
      idsPaginados(sb, "patios", tenantId),
      idsPaginados(sb, "avarias", tenantId),
    ]);
    pastas = [...patios, ...avarias.map((id) => `avarias/${id}`)];
  } catch (e) {
    console.error("[master/tenants] excluirTenant pastas:", e);
    return {
      ok: false,
      msg:
        "Não foi possível listar os pátios da rede. A rede não foi apagada." +
        (excluidasNoAsaas.length ? ` Já excluídas no Asaas: ${excluidasNoAsaas.join(", ")}.` : ""),
    };
  }

  // 4) Logins + rede
  const { data: apagados, error: erroExcluir } = await sb.rpc("fn_master_excluir_tenant", {
    p_tenant_id: tenantId,
    p_codigo: codigoDigitado,
  });
  if (erroExcluir) {
    console.error("[master/tenants] excluirTenant rpc:", erroExcluir);
    return {
      ok: false,
      msg:
        `Não foi possível excluir a rede: ${erroExcluir.message}` +
        (excluidasNoAsaas.length
          ? ` As cobranças ${excluidasNoAsaas.join(", ")} já foram excluídas no Asaas; tentar de novo não as repete.`
          : ""),
    };
  }

  // 5) Fotos
  let fotos = 0;
  let pastasComFalha = 0;
  for (const pasta of pastas) {
    const n = await esvaziarPasta(sb, pasta);
    if (n < 0) pastasComFalha++;
    else fotos += n;
  }
  if (pastasComFalha > 0)
    avisos.push(`${pastasComFalha} pasta(s) de fotos não saíram do Storage (${BUCKET_ENTRADAS}).`);

  const { gestores = 0, parceiros = 0 } = (apagados ?? {}) as {
    gestores?: number;
    parceiros?: number;
  };
  console.info("[master/tenants] rede excluída", {
    tenantId,
    codigo: rede.codigo,
    nome: rede.nome,
    gestores,
    parceiros,
    fotos,
    cobrancas,
  });

  if (revalidar) {
    revalidatePath("/master/tenants");
    revalidatePath("/master/assinaturas");
    revalidatePath("/master/financeiro");
    revalidatePath("/master/crm");
  }

  const logins = gestores + parceiros;
  return {
    ok: true,
    msg:
      `Rede "${rede.nome}" excluída, com ${logins} ${logins === 1 ? "login" : "logins"} e ${fotos} ${fotos === 1 ? "foto" : "fotos"}.` +
      (avisos.length ? ` Atenção: ${avisos.join(" ")}` : ""),
  };
}
