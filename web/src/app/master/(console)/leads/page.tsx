import { createAdminClient } from "@/lib/supabase/admin";
import { localizacaoPorTelefone } from "@/lib/ddd";
import { LeadsClient, type LeadRow } from "@/components/master/leads-client";

export const dynamic = "force-dynamic";

/**
 * Leads do formulário de contato do site (db/39).
 *
 * A tabela não tem policy de SELECT — só o service_role enxerga, e ele só
 * existe atrás da senha master. Ler daqui é o único caminho.
 */

type Row = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  assunto: string;
  origem: string;
  ip: string | null;
  status: string;
  observacao: string | null;
  atendido_em: string | null;
  criado_em: string;
};

export default async function LeadsPage() {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from("leads_site")
    .select(
      "id, nome, telefone, email, assunto, origem, ip, status, observacao, atendido_em, criado_em",
    )
    .order("criado_em", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("[master/leads] select:", error.message);
  }

  const leads: LeadRow[] = ((data as Row[] | null) ?? []).map((l) => {
    const local = localizacaoPorTelefone(l.telefone);
    return {
      id: l.id,
      nome: l.nome,
      telefone: l.telefone,
      email: l.email,
      assunto: l.assunto,
      origem: l.origem,
      ip: l.ip,
      status: l.status,
      observacao: l.observacao,
      atendidoEm: l.atendido_em,
      criadoEm: l.criado_em,
      praca: local ? `${local.praca} · ${local.uf}` : null,
    };
  });

  return <LeadsClient leads={leads} indisponivel={!!error} />;
}
