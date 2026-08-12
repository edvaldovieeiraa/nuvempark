"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TicketAchado = {
  ticket_id: string;
  placa: string;
  entrada: string;
  ja_liberado: boolean;
};

export type ResultadoBusca =
  | { ok: true; tickets: TicketAchado[] }
  | { ok: false; msg: string }
  | null;

/**
 * Busca pelo que o cliente falou.
 *
 * A consulta NÃO toca `tickets` diretamente: o parceiro não tem permissão de
 * leitura naquela tabela (ver db/33). Quem responde é
 * `buscar_tickets_parceiro`, uma função de escopo fixo que devolve só placa,
 * entrada e situação — valor, cliente e histórico não estão nem no tipo de
 * retorno dela. O sigilo é estrutural, não é disciplina de quem escreve a
 * consulta aqui.
 */
export async function buscarTickets(
  _prev: ResultadoBusca,
  formData: FormData,
): Promise<ResultadoBusca> {
  const placa = String(formData.get("placa") ?? "").trim();
  if (placa.length < 3) {
    return { ok: false, msg: "Digite ao menos 3 caracteres da placa." };
  }

  const sb = await createClient();
  const { data, error } = await sb.rpc("buscar_tickets_parceiro", {
    p_placa: placa,
  });

  if (error) return { ok: false, msg: "Não foi possível buscar agora." };
  return { ok: true, tickets: (data ?? []) as TicketAchado[] };
}

/** Extrai o id do ticket do conteúdo lido no QR. */
export async function resolverCodigo(
  _prev: ResultadoBusca,
  formData: FormData,
): Promise<ResultadoBusca> {
  const bruto = String(formData.get("codigo") ?? "").trim();
  if (!bruto) return { ok: false, msg: "Nada lido." };

  // O cupom traz `https://nuvempark.com/t/<id>` (ver Env.qrDoTicket no app),
  // mas cai para o id cru quando o APK foi gerado sem TICKET_PUBLIC_BASE_URL.
  // Aceitar as duas formas evita que um cupom antigo simplesmente não funcione.
  const id = bruto.includes("/")
    ? (bruto.split("?")[0].split("/").filter(Boolean).pop() ?? "")
    : bruto;

  if (!id) return { ok: false, msg: "Código não reconhecido." };

  const sb = await createClient();
  const { data, error } = await sb.rpc("obter_ticket_parceiro", {
    p_ticket_id: id,
  });

  if (error) return { ok: false, msg: "Não foi possível consultar agora." };
  const tickets = (data ?? []) as TicketAchado[];
  if (tickets.length === 0) {
    // A função devolve vazio para ticket de outro pátio, já fechado ou
    // inexistente — e é bom que a mensagem não distinga os três: dizer "esse
    // ticket é de outro pátio" já é contar algo sobre um ticket alheio.
    return { ok: false, msg: "Ticket não encontrado ou já encerrado." };
  }
  return { ok: true, tickets };
}

export type ResultadoLiberar = { ok: boolean; msg: string } | null;

/** Mensagem por SQLSTATE — os códigos vêm de db/34. */
const POR_CODIGO: Record<string, string> = {
  NPV01: "Sua cota de liberações acabou. Fale com a administração.",
  NPV02: "Esta regra não está disponível para o seu acesso.",
  NPV03: "Ticket não encontrado ou já encerrado.",
  NPV04: "Este ticket já foi liberado.",
  NPV05: "Seu acesso está inativo. Fale com a administração.",
};

export async function liberar(
  _prev: ResultadoLiberar,
  formData: FormData,
): Promise<ResultadoLiberar> {
  const ticketId = String(formData.get("ticket_id") ?? "");
  const regraId = String(formData.get("regra_id") ?? "");
  if (!ticketId || !regraId) return { ok: false, msg: "Escolha uma regra." };

  const sb = await createClient();
  const { error } = await sb.rpc("liberar_ticket", {
    p_ticket_id: ticketId,
    p_regra_id: regraId,
  });

  if (error) {
    // Traduz pelo CÓDIGO e não pela mensagem: a mensagem do banco está em
    // inglês técnico e pode mudar; o SQLSTATE é contrato.
    const msg = POR_CODIGO[error.code ?? ""];
    return { ok: false, msg: msg ?? "Não foi possível liberar este ticket." };
  }

  revalidatePath("/parceiro");
  revalidatePath("/parceiro/historico");
  return { ok: true, msg: "Ticket liberado." };
}
