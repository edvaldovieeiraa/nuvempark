import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarEmail } from "@/lib/email";

/**
 * Serviço de e-mail de licenciamento de dispositivos — COMPARTILHADO entre o
 * console master (Bloco 3) e o painel do gestor (Bloco 4).
 *
 * Princípios (não negociáveis):
 *  - FIRE-AND-FORGET: falha de e-mail NUNCA derruba a ação. Toda a função é
 *    envolvida em try/catch e loga; o chamador dispara com `void`.
 *  - ANTI-DUPLICAÇÃO: se um `acessoId` é passado, checa email_enviado_em antes
 *    de enviar e o carimba depois. Reprocessar não dispara de novo.
 *  - DEGRADAÇÃO SILENCIOSA: sem RESEND_API_KEY, enviarEmail() retorna
 *    { ok:false, motivo:'desligado' } e nada quebra.
 *
 * Fronteira service_role: o master passa o cliente admin (resolve o e-mail do
 * gestor via Supabase Auth). O gestor (Bloco 4) passa `emailGestor` explícito
 * (o próprio e-mail dele) + o cliente tenant-scoped — que NÃO pode consultar o
 * Auth, mas grava email_enviado_em na própria linha via RLS.
 */

const REMETENTE_NOME = "NuvemPark";

function moeda(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

/** Casca HTML mínima e neutra (o mesmo visual dos demais e-mails do produto). */
function layout(titulo: string, corpo: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e">
    <h2 style="color:#16a34a;margin:0 0 12px">${titulo}</h2>
    ${corpo}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
    <p style="font-size:12px;color:#9ca3af;margin:0">${REMETENTE_NOME} — gestão de pátios.</p>
  </div>`;
}

export interface AlvoTenant {
  id: string;
  nome: string;
}
export interface AlvoPatio {
  nome: string;
}
export interface AlvoDispositivo {
  codigo_pareamento: string | null;
  apelido: string | null;
}

export interface ParamsExtraAtivado {
  tenant: AlvoTenant;
  patio: AlvoPatio;
  dispositivo: AlvoDispositivo;
  /** Valor mensal do extra (0 = cortesia → e-mail sem menção a cobrança). */
  valor: number;
  /** Rótulo da competência a partir da qual vale (ex.: "agosto de 2026"). */
  competencia: string;
  /** Linha de dispositivo_acessos p/ anti-duplicação (opcional). */
  acessoId?: string | null;
  /** Override do e-mail do gestor (Bloco 4 passa o próprio; master resolve). */
  emailGestor?: string | null;
  /** E-mail do master p/ o aviso comercial (default: env MASTER_EMAIL). */
  emailMaster?: string | null;
}

export interface ParamsPendente {
  tenant: AlvoTenant;
  patio: AlvoPatio;
  dispositivo: AlvoDispositivo;
  acessoId?: string | null;
  emailGestor?: string | null;
}

/**
 * Resolve o e-mail do gestor do tenant: Supabase Auth (app_metadata.tenant_id)
 * com `assinaturas.email_cobranca` como FALLBACK. Precisa de cliente admin para
 * o Auth — se o cliente não for admin, a listagem falha (silenciosa) e cai no
 * fallback.
 */
export async function resolverEmailGestor(
  sb: SupabaseClient,
  tenantId: string,
): Promise<string | null> {
  try {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data) break;
      const achado = data.users.find(
        (u) => (u.app_metadata as { tenant_id?: string } | null)?.tenant_id === tenantId,
      );
      if (achado?.email) return achado.email;
      if (data.users.length < 200) break;
    }
  } catch {
    // Cliente sem privilégio de Auth (tenant-scoped) → segue pro fallback.
  }
  const { data } = await sb
    .from("assinaturas")
    .select("email_cobranca")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data as { email_cobranca?: string | null } | null)?.email_cobranca ?? null;
}

/** Anti-dup: true se o acesso já teve e-mail enviado. */
async function jaEnviado(sb: SupabaseClient, acessoId: string): Promise<boolean> {
  const { data } = await sb
    .from("dispositivo_acessos")
    .select("email_enviado_em")
    .eq("id", acessoId)
    .maybeSingle();
  return !!(data as { email_enviado_em?: string | null } | null)?.email_enviado_em;
}

async function marcarEnviado(sb: SupabaseClient, acessoId: string): Promise<void> {
  await sb
    .from("dispositivo_acessos")
    .update({ email_enviado_em: new Date().toISOString() })
    .eq("id", acessoId);
}

/**
 * Dispositivo extra ativado (licenciado ou cortesia). Dois destinatários com
 * templates diferentes:
 *   - gestor: prova documental do aviso prévio da cobrança (ou só aviso, se 0).
 *   - master: aviso comercial enxuto.
 */
export async function enviarEmailExtraAtivado(
  sb: SupabaseClient,
  p: ParamsExtraAtivado,
): Promise<void> {
  try {
    if (p.acessoId && (await jaEnviado(sb, p.acessoId))) return;

    const emailGestor = p.emailGestor ?? (await resolverEmailGestor(sb, p.tenant.id));
    const cobra = p.valor > 0;
    const codigo = p.dispositivo.codigo_pareamento ?? "—";
    const apelido = p.dispositivo.apelido ? ` (“${p.dispositivo.apelido}”)` : "";
    const agora = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date());

    let enviouGestor = false;
    if (emailGestor) {
      const corpoGestor = cobra
        ? `<p>Você liberou um dispositivo adicional no <b>${p.patio.nome}</b>${apelido}
             (código de pareamento <b>${codigo}</b>).</p>
           <p>A partir de <b>${p.competencia}</b> sua fatura passa a incluir
             <b>${moeda(p.valor)}/mês</b> por este dispositivo. As faturas já
             emitidas não mudam.</p>`
        : `<p>Um dispositivo adicional foi liberado como <b>cortesia</b> no
             <b>${p.patio.nome}</b>${apelido} (código <b>${codigo}</b>).
             Sem custo — nenhuma cobrança será adicionada à sua fatura.</p>`;
      const r = await enviarEmail({
        para: emailGestor,
        assunto: cobra
          ? `Dispositivo adicional ativado — ${p.patio.nome}`
          : `Dispositivo de cortesia liberado — ${p.patio.nome}`,
        html: layout(cobra ? "Dispositivo adicional ativado" : "Cortesia liberada", corpoGestor),
      });
      enviouGestor = r.ok;
    }

    // Aviso comercial ao master (só quando há cobrança faz sentido; cortesia
    // não gera receita, mas ainda avisamos que um slot foi concedido).
    const emailMaster = p.emailMaster ?? process.env.MASTER_EMAIL ?? null;
    if (emailMaster) {
      const corpoMaster = `<p><b>${p.tenant.nome}</b> · ${p.patio.nome}</p>
        <p>${cobra ? `Licenciado: <b>${moeda(p.valor)}/mês</b>` : "Cortesia (R$ 0)"}
           · código ${codigo} · ${agora}</p>`;
      await enviarEmail({
        para: emailMaster,
        assunto: `[Extra] ${p.tenant.nome} — ${cobra ? moeda(p.valor) : "cortesia"}`,
        html: layout("Dispositivo extra", corpoMaster),
      });
    }

    if (p.acessoId && enviouGestor) await marcarEnviado(sb, p.acessoId);
  } catch (e) {
    console.error("[emails/dispositivos] enviarEmailExtraAtivado falhou:", e);
  }
}

/**
 * Dispositivo pendente — SOMENTE ao gestor. Destrava a operação fora do horário
 * quando ninguém está com o painel aberto.
 */
export async function enviarEmailDispositivoPendente(
  sb: SupabaseClient,
  p: ParamsPendente,
): Promise<void> {
  try {
    if (p.acessoId && (await jaEnviado(sb, p.acessoId))) return;

    const emailGestor = p.emailGestor ?? (await resolverEmailGestor(sb, p.tenant.id));
    if (!emailGestor) return;

    const codigo = p.dispositivo.codigo_pareamento ?? "—";
    const corpo = `<p>Um aparelho tentou entrar no <b>${p.patio.nome}</b> e ficou
        <b>aguardando sua aprovação</b>.</p>
      <p>Código de pareamento do aparelho: <b>${codigo}</b>.</p>
      <p>Abra o painel para autorizá-lo, ou libere um dispositivo adicional se
        precisar de mais de um no mesmo pátio.</p>`;
    const r = await enviarEmail({
      para: emailGestor,
      assunto: `Novo dispositivo aguardando aprovação — ${p.patio.nome}`,
      html: layout("Dispositivo aguardando aprovação", corpo),
    });

    if (p.acessoId && r.ok) await marcarEnviado(sb, p.acessoId);
  } catch (e) {
    console.error("[emails/dispositivos] enviarEmailDispositivoPendente falhou:", e);
  }
}
