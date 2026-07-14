import { TarifaEngine } from '../lib/tarifa-engine.js';
import type { TarifaLinha, TicketPublico } from './repo.js';

/**
 * Regras da página pública do ticket. Sem I/O — recebe o que o repo leu e
 * decide. Fica separado da rota para ser testável sem subir HTTP nem banco.
 */

/** Janela em que o valor pago vale, mesmo o carro continuando no pátio. */
export const CARENCIA_MINUTOS = 20;

/** Validade da cobrança Pix que geramos (regra nossa — ver asaas.ts). */
export const EXPIRACAO_COBRANCA_MINUTOS = 30;

export type StatusPagamentoPublico =
  | 'nao_pago'
  | 'pago'
  | 'pago_diferenca_pendente';

export interface EstadoTicket {
  statusPagamento: StatusPagamentoPublico;
  /** Tarifa calculada AGORA. Null quando pago e ainda dentro da carência. */
  valorAtual: number | null;
  pago: { valor: number; pagoEm: string; carenciaAte: string } | null;
  /** > 0 quando a carência estourou e a estadia já custa mais do que foi pago. */
  diferenca: number | null;
}

/**
 * Placa nunca sai inteira daqui: quem tem o link não é necessariamente o dono do
 * carro. `ABC1D23` → `ABC**23`.
 */
export function mascararPlaca(placa: string): string {
  if (placa.length < 5) return '*'.repeat(placa.length);
  return `${placa.slice(0, 3)}**${placa.slice(-2)}`;
}

/**
 * Deriva o estado do ticket num instante.
 *
 * A CARÊNCIA existe porque o relógio não para: o cliente paga R$ 12, anda até o
 * carro e sai. Sem ela, a estadia teria crescido no caminho e ele deveria a
 * diferença de dois minutos — absurdo. Passados os 20 minutos, aí sim a conta é
 * refeita: quem pagou e ficou mais uma hora deve a diferença.
 */
export function derivarEstado(params: {
  ticket: TicketPublico;
  tarifa: TarifaLinha | null;
  agora: Date;
}): EstadoTicket {
  const { ticket, tarifa, agora } = params;

  const valorAtual = calcularValor({ ticket, tarifa, agora });

  if (!ticket.pago_online_em) {
    return {
      statusPagamento: 'nao_pago',
      valorAtual,
      pago: null,
      diferenca: null,
    };
  }

  const pagoEm = new Date(ticket.pago_online_em);
  const carenciaAte = new Date(pagoEm.getTime() + CARENCIA_MINUTOS * 60_000);
  const valorPago = ticket.valor_pago_online ?? 0;

  const pago = {
    valor: valorPago,
    pagoEm: pagoEm.toISOString(),
    carenciaAte: carenciaAte.toISOString(),
  };

  // Dentro da carência: o valor pago vale, ponto. Nem mostramos o valor atual —
  // veria o número subindo enquanto anda até o carro, e acharia que está devendo.
  if (agora.getTime() <= carenciaAte.getTime()) {
    return {
      statusPagamento: 'pago',
      valorAtual: null,
      pago,
      diferenca: null,
    };
  }

  // Fora da carência: a conta é refeita.
  const diferenca = valorAtual === null ? 0 : arredondar(valorAtual - valorPago);
  if (diferenca > 0) {
    return {
      statusPagamento: 'pago_diferenca_pendente',
      valorAtual,
      pago,
      diferenca,
    };
  }

  return { statusPagamento: 'pago', valorAtual, pago, diferenca: null };
}

/** Tarifa agora, usando `agora` como saída hipotética. Sem tarifa → null. */
export function calcularValor(params: {
  ticket: TicketPublico;
  tarifa: TarifaLinha | null;
  agora: Date;
}): number | null {
  const { ticket, tarifa, agora } = params;
  if (!tarifa) return null;

  const r = TarifaEngine.calcular({
    entrada: new Date(ticket.entrada),
    saida: agora,
    tarifa: {
      fracaoInicialMinutos: tarifa.fracao_inicial_minutos,
      fracaoInicialValor: tarifa.fracao_inicial_valor,
      fracaoAdicionalMinutos: tarifa.fracao_adicional_minutos,
      fracaoAdicionalValor: tarifa.fracao_adicional_valor,
      tetoDiaria: tarifa.teto_diaria,
      toleranciaMinutos: tarifa.tolerancia_minutos,
      pernoiteValor: tarifa.pernoite_valor,
      pernoiteHoraInicio: tarifa.pernoite_hora_inicio,
      pernoiteHoraFim: tarifa.pernoite_hora_fim,
    },
  });
  return arredondar(r.valor);
}

/** Centavos. O Pix não cobra fração de centavo. */
function arredondar(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * O ticket pode ser visto publicamente?
 *
 * Fechado E sem pagamento online → não (já saiu, nada a cobrar). Fechado COM
 * pagamento continua visível: o cliente pagou e tem direito ao comprovante.
 */
export function ticketVisivel(t: TicketPublico): boolean {
  if (!t.patio_ativo) return false;
  if (t.status === 'aberto') return true;
  return t.pago_online_em !== null;
}
