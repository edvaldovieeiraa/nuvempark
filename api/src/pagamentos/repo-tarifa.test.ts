import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `lerTarifaDoTicket` com um Supabase falso em memória: aplica os filtros
 * `eq`/`neq`/`in` e a ordem, e pode simular banco sem a coluna `modalidade`.
 */
type Linha = Record<string, unknown>;
const banco: { tarifas: Linha[]; semColunaModalidade: boolean; timeout: boolean } = {
  tarifas: [],
  semColunaModalidade: false,
  timeout: false,
};

function consulta() {
  const filtros: Array<(l: Linha) => boolean> = [];
  let usaModalidade = false;
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (filtros.push((l) => l[c] === v), (usaModalidade ||= c === 'modalidade'), q),
    neq: (c: string, v: unknown) => (filtros.push((l) => l[c] !== v), (usaModalidade ||= c === 'modalidade'), q),
    in: (c: string, v: unknown[]) => (filtros.push((l) => v.includes(l[c])), q),
    lte: () => q,
    or: () => q,
    order: () => q,
    limit: () => q,
    maybeSingle: async () => {
      if (usaModalidade && banco.timeout) return { data: null, error: { code: '57014', message: 'timeout' } };
      if (usaModalidade && banco.semColunaModalidade) {
        return { data: null, error: { code: '42703', message: 'column does not exist' } };
      }
      const achadas = banco.tarifas
        .filter((l) => filtros.every((f) => f(l)))
        .sort((a, b) => Number(a.ordem) - Number(b.ordem));
      return { data: achadas[0] ?? null, error: null };
    },
  };
  return q;
}

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => consulta() }) }));
vi.mock('../env.js', () => ({ env: { SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'k' } }));

const { lerTarifaDoTicket } = await import('./repo.js');

const tarifa = (id: string, modalidade: string, ordem: number, fracao: number): Linha => ({
  id,
  patio_id: 'p1',
  tipo_veiculo: 'carro',
  ativo: true,
  modalidade,
  ordem,
  fracao_inicial_minutos: 15,
  fracao_inicial_valor: fracao,
  fracao_adicional_minutos: 15,
  fracao_adicional_valor: 3,
  teto_diaria: 60,
  tolerancia_minutos: 10,
  pernoite_valor: 0,
  pernoite_hora_inicio: 22,
  pernoite_hora_fim: 6,
});

const ticket = (tabela: string | null) => ({
  id: 't1',
  placa: 'ABC1D23',
  tipo_veiculo: 'carro',
  entrada: '2026-10-19T13:00:00Z',
  status: 'aberto',
  patio_id: 'p1',
  tenant_id: 'tn',
  tabela_preco_id: tabela,
  estadia_id: null,
  pago_online_em: null,
  valor_pago_online: null,
  patio_nome: 'Pátio',
  patio_ativo: true,
});

describe('lerTarifaDoTicket — modalidade contrato', () => {
  beforeEach(() => {
    banco.semColunaModalidade = false;
    banco.timeout = false;
    banco.tarifas = [tarifa('c1', 'contrato', 0, 99), tarifa('a1', 'avulso', 1, 5)];
  });

  it('ticket com tabela contrato cai na reserva avulsa', async () => {
    expect((await lerTarifaDoTicket(ticket('c1')))?.fracao_inicial_valor).toBe(5);
  });

  it('reserva nunca escolhe contrato, mesmo com a menor ordem', async () => {
    expect((await lerTarifaDoTicket(ticket(null)))?.fracao_inicial_valor).toBe(5);
  });

  it('ticket com tabela avulsa usa a própria tabela', async () => {
    banco.tarifas.push(tarifa('a2', 'avulso', 2, 7));
    expect((await lerTarifaDoTicket(ticket('a2')))?.fracao_inicial_valor).toBe(7);
  });

  it('banco sem a coluna modalidade (sem db/42) continua funcionando', async () => {
    banco.semColunaModalidade = true;
    banco.tarifas = [tarifa('a1', 'avulso', 0, 5)];
    expect((await lerTarifaDoTicket(ticket('a1')))?.fracao_inicial_valor).toBe(5);
    expect((await lerTarifaDoTicket(ticket(null)))?.fracao_inicial_valor).toBe(5);
  });

  it('erro passageiro não tira o filtro: falha em vez de cobrar pela tabela errada', async () => {
    banco.timeout = true;
    await expect(lerTarifaDoTicket(ticket('c1'))).rejects.toMatchObject({ code: '57014' });
  });
});
