import { adapterDoTenant } from './index.js';
import {
  atualizarOrigem,
  criarPagamento,
  lerCobrancaPendente,
  salvarDadosCobranca,
  type TicketPublico,
} from './repo.js';
import {
  EXPIRACAO_COBRANCA_MINUTOS,
  mascararPlaca,
  type EstadoTicket,
} from './ticket-publico.js';

/**
 * Geração da cobrança Pix de um ticket — MESMA lógica para a página pública (o
 * cliente que escaneou o QR) e para o app (o operador gerando o Pix dinâmico na
 * saída). As duas TÊM de produzir cobranças idênticas: mesmo valor, mesma
 * dedup, mesma descrição. Se divergirem, o cliente paga um valor e o operador
 * vê outro. Por isso o caminho é um só, aqui.
 *
 * O caller já resolveu o ticket e derivou o estado (e, no app, já checou o
 * acesso do operador ao pátio). Esta função só decide a cobrança.
 */

export interface CobrancaResposta {
  pagamento_id: string;
  valor: number;
  pix_copia_cola: string;
  pix_qrcode_base64: string | null;
  expira_em: string;
}

export type ResultadoCobranca =
  | { ok: true; cobranca: CobrancaResposta }
  | { ok: false; code: 409; error: string };

export async function gerarOuReaproveitarPix(
  ticket: TicketPublico,
  estado: EstadoTicket,
  /**
   * Quem está gerando: 'app' = Pix dinâmico do operador na saída (vai pro caixa
   * e sai da listagem de Pix online); 'publico' = cliente pela página do QR.
   */
  origem: 'publico' | 'app' = 'publico',
): Promise<ResultadoCobranca> {
  // Pago e dentro da carência: não há o que cobrar.
  if (estado.statusPagamento === 'pago') {
    return { ok: false, code: 409, error: 'Estadia já paga' };
  }

  // Cobrança pendente e ainda válida: devolve ESSA. Recarregar a página, tocar
  // duas vezes no botão ou o operador gerar de novo não pode criar dois Pix.
  const pendente = await lerCobrancaPendente(ticket.id);
  if (pendente?.pix_copia_cola && pendente.expira_em) {
    // O operador gerando o Pix dinâmico ASSUME uma cobrança pré-existente (ex.:
    // o cliente abriu a página pública antes e não pagou): ela passa a ser
    // 'app' — vai pro caixa e some da listagem de Pix online.
    if (origem === 'app') {
      await atualizarOrigem(pendente.id, 'app');
    }
    return {
      ok: true,
      cobranca: {
        pagamento_id: pendente.id,
        valor: pendente.valor,
        pix_copia_cola: pendente.pix_copia_cola,
        pix_qrcode_base64: pendente.pix_qrcode_base64,
        expira_em: pendente.expira_em,
      },
    };
  }

  // Quanto cobrar: a estadia toda, ou só a diferença de quem já pagou e ficou.
  const valor =
    estado.statusPagamento === 'pago_diferenca_pendente'
      ? (estado.diferenca ?? 0)
      : (estado.valorAtual ?? 0);

  if (valor <= 0) {
    // Tolerância, ou tarifa não encontrada. Não geramos Pix de R$ 0.
    return { ok: false, code: 409, error: 'Nada a pagar' };
  }

  const expiraEm = new Date(Date.now() + EXPIRACAO_COBRANCA_MINUTOS * 60_000);

  // A linha local nasce ANTES do PSP: o id dela é o externalReference que volta
  // no webhook. Se o PSP falhar depois, sobra uma cobrança pendente sem Pix —
  // que expira sozinha e não confunde ninguém (lerCobrancaPendente exige
  // pix_copia_cola preenchido para reaproveitar).
  const pagamentoId = await criarPagamento({
    ticketId: ticket.id,
    patioId: ticket.patio_id,
    tenantId: ticket.tenant_id,
    valor,
    expiraEm,
    origem,
  });

  const adapter = await adapterDoTenant(ticket.tenant_id);
  const cobranca = await adapter.gerarCobrancaPix({
    valor,
    descricao: `Estadia ${mascararPlaca(ticket.placa)} — ${ticket.patio_nome}`,
    referenciaExterna: pagamentoId,
    expiracaoMinutos: EXPIRACAO_COBRANCA_MINUTOS,
  });

  await salvarDadosCobranca({
    pagamentoId,
    gatewayCobrancaId: cobranca.gatewayCobrancaId,
    pixCopiaCola: cobranca.pixCopiaCola,
    pixQrcodeBase64: cobranca.pixQrcodeBase64,
    expiraEm: cobranca.expiraEm,
  });

  return {
    ok: true,
    cobranca: {
      pagamento_id: pagamentoId,
      valor,
      pix_copia_cola: cobranca.pixCopiaCola,
      pix_qrcode_base64: cobranca.pixQrcodeBase64,
      expira_em: cobranca.expiraEm.toISOString(),
    },
  };
}
