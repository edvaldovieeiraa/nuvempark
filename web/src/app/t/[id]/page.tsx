import { notFound } from "next/navigation";

import { TicketPublicoClient, type TicketPublicoDados } from "@/components/ticket-publico/ticket-cliente";
import { apiPublica } from "@/lib/api-publica";

/**
 * Página pública do ticket — o destino do QR impresso no cupom.
 *
 * FORA do /painel: sem sessão, sem Supabase no cliente, sem RLS. Todo o dado vem
 * dos endpoints públicos da nuvempark-api, que aplicam os gates (ticket visível,
 * assinatura do tenant) e mascaram a placa. Esta página não sabe nada do banco.
 */

export const dynamic = "force-dynamic"; // o valor da estadia muda a cada minuto

export const metadata = {
  title: "Sua estadia — NuvemPark",
  robots: { index: false, follow: false }, // ticket não vai para buscador
};

export default async function TicketPublicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const dados = await apiPublica<TicketPublicoDados>(`/ticket/${id}`);
  // 404 genérico da api → 404 genérico aqui. Não distinguimos os motivos.
  if (!dados) notFound();

  return <TicketPublicoClient id={id} inicial={dados} />;
}
