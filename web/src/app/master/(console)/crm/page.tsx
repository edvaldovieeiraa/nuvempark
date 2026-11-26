import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import { carregarCrm, carregarLead } from "@/lib/crm/consulta";
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
  const visao = um(sp.visao) === "lista" ? "lista" : "kanban";

  const sb = createAdminClient();
  const agora = new Date();
  const [janela, inteiro] = await Promise.all([
    carregarCrm(sb, { agora }),
    estagio ? carregarCrm(sb, { estagio, agora }) : Promise.resolve(null),
  ]);

  const porId = new Map<string, LeadCrm>();
  for (const l of janela.leads) porId.set(l.id, l);
  for (const l of inteiro?.leads ?? []) porId.set(l.id, l);
  if (idLead && !porId.has(idLead) && !janela.erro) {
    const avulso = await carregarLead(sb, idLead);
    if (avulso) porId.set(avulso.id, avulso);
  }

  return (
    <CrmClient
      leads={[...porId.values()]}
      agora={agora.toISOString()}
      erro={janela.erro || !!inteiro?.erro}
      estagioCompleto={estagio}
      visaoInicial={visao}
    />
  );
}
