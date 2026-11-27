import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import { carregarCrm, carregarExcluidos, carregarLead } from "@/lib/crm/consulta";
import type { LeadCrm } from "@/lib/crm/tipos";
import { CrmClient } from "@/components/master/crm/crm-client";

export const dynamic = "force-dynamic";

/**
 * CRM do console master (db/47, db/48). Só o service_role lê `crm_leads_v`,
 * e ele só existe atrás da senha master. A página confere a sessão ela mesma:
 * o layout não roda de novo em toda navegação do lado do cliente.
 *
 * - sem `?estagio`: a janela (Novo, Em contato, Trial e os Ganho/Perdido dos
 *   últimos 30 dias);
 * - com `?estagio=ganho|perdido` ("Ver todos na lista"): a janela E o estágio
 *   inteiro. A janela continua vindo para a faixa e o kanban contarem os 30
 *   dias que dizem contar;
 * - com `?lead=<id>` fora disso (duplicado antigo, recarregar): esse lead também.
 *   Se ele estiver excluído (db/54), vai à parte (`leadAvulso`): abre o painel
 *   em modo leitura, mas não entra no quadro nem nas contagens;
 * - com `?visao=excluidos`: também os excluídos, para a visão deles.
 */

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

function um(v: string | string[] | undefined): string | null {
  return typeof v === "string" ? v : (v?.[0] ?? null);
}

export default async function CrmPage({ searchParams }: { searchParams: Busca }) {
  if (!(await sessaoMasterAtiva())) redirect("/master/login");
  const sp = await searchParams;
  const e = um(sp.estagio);
  const estagio = e === "ganho" || e === "perdido" ? e : null;
  const idLead = um(sp.lead);
  const v = um(sp.visao);
  const visao = v === "lista" ? "lista" : v === "excluidos" ? "excluidos" : "kanban";

  const sb = createAdminClient();
  const agora = new Date();
  const [janela, inteiro, exc] = await Promise.all([
    carregarCrm(sb, { agora }),
    estagio ? carregarCrm(sb, { estagio, agora }) : Promise.resolve(null),
    visao === "excluidos" ? carregarExcluidos(sb) : Promise.resolve(null),
  ]);

  const porId = new Map<string, LeadCrm>();
  for (const l of janela.leads) porId.set(l.id, l);
  for (const l of inteiro?.leads ?? []) porId.set(l.id, l);
  let leadAvulso: LeadCrm | null = null;
  const nosExcluidos = exc?.leads.some((l) => l.id === idLead) ?? false;
  if (idLead && !porId.has(idLead) && !nosExcluidos && !janela.erro) {
    const avulso = await carregarLead(sb, idLead);
    if (avulso && !avulso.excluidoEm && visao !== "excluidos") porId.set(avulso.id, avulso);
    else leadAvulso = avulso;
  }

  return (
    <CrmClient
      leads={[...porId.values()]}
      agora={agora.toISOString()}
      erro={janela.erro || !!inteiro?.erro || !!exc?.erro}
      estagioCompleto={estagio}
      visaoInicial={visao}
      excluidos={exc?.leads ?? null}
      leadAvulso={leadAvulso}
    />
  );
}
