import { describe, expect, it } from 'vitest';

import type { TarifaLinha, TicketPublico } from './repo.js';
import {
  CARENCIA_MINUTOS,
  derivarEstado,
  mascararPlaca,
  ticketVisivel,
} from './ticket-publico.js';

// Mesma tarifa dos testes do motor: 15min/R$5 + 15min/R$3, teto 60, tolerância 10.
const tarifa: TarifaLinha = {
  fracao_inicial_minutos: 15,
  fracao_inicial_valor: 5,
  fracao_adicional_minutos: 15,
  fracao_adicional_valor: 3,
  teto_diaria: 60,
  tolerancia_minutos: 10,
  pernoite_valor: 0,
  pernoite_hora_inicio: 22,
  pernoite_hora_fim: 6,
};

const ENTRADA = new Date(2026, 6, 14, 10, 0);

function ticket(over: Partial<TicketPublico> = {}): TicketPublico {
  return {
    id: 't1',
    placa: 'ABC1D23',
    tipo_veiculo: 'carro',
    entrada: ENTRADA.toISOString(),
    status: 'aberto',
    patio_id: 'p1',
    tenant_id: 'tn1',
    tabela_preco_id: 'tar1',
    pago_online_em: null,
    valor_pago_online: null,
    patio_nome: 'Pátio Centro',
    patio_ativo: true,
    ...over,
  };
}

describe('mascararPlaca', () => {
  it('esconde o miolo — ter o link não prova ser o dono do carro', () => {
    expect(mascararPlaca('ABC1D23')).toBe('ABC**23');
  });
});

describe('derivarEstado', () => {
  it('não pago: cobra a estadia até agora', () => {
    // 30 min → 5 + 1×3 = 8
    const agora = new Date(ENTRADA.getTime() + 30 * 60_000);
    const e = derivarEstado({ ticket: ticket(), tarifa, agora });

    expect(e.statusPagamento).toBe('nao_pago');
    expect(e.valorAtual).toBe(8);
    expect(e.pago).toBeNull();
  });

  it('pago DENTRO da carência: valor atual some (senão o cliente veria a conta subindo enquanto anda até o carro)', () => {
    const pagoEm = new Date(ENTRADA.getTime() + 30 * 60_000);
    const agora = new Date(pagoEm.getTime() + (CARENCIA_MINUTOS - 1) * 60_000);

    const e = derivarEstado({
      ticket: ticket({
        pago_online_em: pagoEm.toISOString(),
        valor_pago_online: 8,
      }),
      tarifa,
      agora,
    });

    expect(e.statusPagamento).toBe('pago');
    expect(e.valorAtual).toBeNull();
    expect(e.pago?.valor).toBe(8);
    expect(e.diferenca).toBeNull();
  });

  it('carência é inclusiva no limite exato', () => {
    const pagoEm = new Date(ENTRADA.getTime() + 30 * 60_000);
    const agora = new Date(pagoEm.getTime() + CARENCIA_MINUTOS * 60_000);

    const e = derivarEstado({
      ticket: ticket({
        pago_online_em: pagoEm.toISOString(),
        valor_pago_online: 8,
      }),
      tarifa,
      agora,
    });
    expect(e.statusPagamento).toBe('pago');
  });

  it('carência estourada e estadia mais cara: cobra só a DIFERENÇA', () => {
    // Pagou 8 (30 min). Agora está com 90 min → 5 + ceil(75/15)×3 = 20.
    const pagoEm = new Date(ENTRADA.getTime() + 30 * 60_000);
    const agora = new Date(ENTRADA.getTime() + 90 * 60_000);

    const e = derivarEstado({
      ticket: ticket({
        pago_online_em: pagoEm.toISOString(),
        valor_pago_online: 8,
      }),
      tarifa,
      agora,
    });

    expect(e.statusPagamento).toBe('pago_diferenca_pendente');
    expect(e.valorAtual).toBe(20);
    expect(e.diferenca).toBe(12); // 20 − 8, nunca o total de novo
  });

  it('carência estourada mas nada mudou (teto): segue pago, sem diferença', () => {
    // Pagou o teto (60). Ficou mais tempo: continua 60 → diferença 0.
    const pagoEm = new Date(ENTRADA.getTime() + 10 * 60 * 60_000);
    const agora = new Date(ENTRADA.getTime() + 14 * 60 * 60_000);

    const e = derivarEstado({
      ticket: ticket({
        pago_online_em: pagoEm.toISOString(),
        valor_pago_online: 60,
      }),
      tarifa,
      agora,
    });

    expect(e.statusPagamento).toBe('pago');
    expect(e.diferenca).toBeNull();
  });

  it('sem tarifa cadastrada: não inventa valor', () => {
    const e = derivarEstado({
      ticket: ticket(),
      tarifa: null,
      agora: new Date(ENTRADA.getTime() + 60 * 60_000),
    });
    expect(e.valorAtual).toBeNull();
  });
});

describe('ticketVisivel', () => {
  it('aberto → visível', () => {
    expect(ticketVisivel(ticket())).toBe(true);
  });

  it('fechado e sem pagamento online → invisível (já saiu, nada a cobrar)', () => {
    expect(ticketVisivel(ticket({ status: 'fechado' }))).toBe(false);
  });

  it('fechado MAS pago online → visível: ele pagou, tem direito ao comprovante', () => {
    expect(
      ticketVisivel(
        ticket({ status: 'fechado', pago_online_em: new Date().toISOString() }),
      ),
    ).toBe(true);
  });

  it('pátio inativo → invisível', () => {
    expect(ticketVisivel(ticket({ patio_ativo: false }))).toBe(false);
  });
});
