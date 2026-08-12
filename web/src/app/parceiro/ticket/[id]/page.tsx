import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiberarTicket } from "@/components/vouchers/liberar-ticket";
import type { TicketAchado } from "@/app/parceiro/actions";

export const dynamic = "force-dynamic";

export default async function TicketParceiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: achados }, { data: regras }] = await Promise.all([
    supabase.rpc("obter_ticket_parceiro", { p_ticket_id: decodeURIComponent(id) }),
    // RLS de db/33: só as regras CONCEDIDAS a este parceiro e ativas. Não
    // precisa (nem deve) filtrar aqui — filtrar de novo daria a impressão de
    // que a segurança está na consulta, e não na policy.
    supabase
      .from("voucher_regras")
      .select("id, nome, abater_minutos, desconto_percentual, desconto_valor")
      .order("nome"),
  ]);

  const tickets = (achados ?? []) as TicketAchado[];
  if (tickets.length === 0) notFound();

  return (
    <LiberarTicket ticket={tickets[0]} regras={regras ?? []} />
  );
}
