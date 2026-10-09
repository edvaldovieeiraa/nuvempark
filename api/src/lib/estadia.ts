import { num, str, toIso } from './coerce.js';

/**
 * Coerção dos payloads de estadia que chegam pelo /sync.
 *
 * Diferente do ticket, aqui falta de campo é RECUSA (o chamador responde 422,
 * que o app trata como definitivo): um payload incompleto não melhora com
 * reenvio, e gravar uma estadia sem vencimento faria o carro entrar de graça
 * para sempre. Ids de tenant/pátio vêm sempre do token, nunca do payload.
 */

export interface ContextoSync {
  patioId: string;
  tenantId: string;
  /** Operador dono do token — usado quando o payload não diz quem foi. */
  operadorSub: string;
  /** Carimbo do servidor desta requisição (ISO). */
  agora: string;
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };

const falha = (erro: string): { ok: false; erro: string } => ({ ok: false, erro });

const inteiroPositivo = (v: unknown): number | undefined => {
  const n = num(v);
  return n !== undefined && Number.isInteger(n) && n > 0 ? n : undefined;
};

export interface LinhaEstadia {
  id: string;
  patio_id: string;
  tenant_id: string;
  placa: string;
  tipo_veiculo: string;
  tarifa_id: string;
  diaria_valor: number;
  diaria_horas: number;
  inicio: string;
  valida_ate: string;
  diarias: number;
  valor_total: number;
  operador_id: string;
  sincronizado_em: string;
}

export function linhaEstadia(
  id: string,
  p: Record<string, unknown>,
  ctx: ContextoSync,
): Resultado<LinhaEstadia> {
  const placa = str(p.placa)?.trim().toUpperCase();
  const tipoVeiculo = str(p.tipo_veiculo);
  const tarifaId = str(p.tarifa_id);
  const diariaValor = num(p.diaria_valor);
  const diariaHoras = inteiroPositivo(p.diaria_horas);
  const inicio = toIso(p.inicio);
  const validaAte = toIso(p.valida_ate);
  const diarias = inteiroPositivo(p.diarias);
  const valorTotal = num(p.valor_total);

  if (!placa || !tipoVeiculo || !tarifaId) return falha('estadia sem placa, tipo ou tarifa');
  if (diariaValor === undefined || diariaValor <= 0 || !diariaHoras) {
    return falha('estadia sem valor ou duração da diária');
  }
  if (!inicio || !validaAte || Date.parse(validaAte) <= Date.parse(inicio)) {
    return falha('estadia com início/validade inválidos');
  }
  if (!diarias || valorTotal === undefined || valorTotal < 0) {
    return falha('estadia sem diárias ou total');
  }

  return {
    ok: true,
    valor: {
      id,
      patio_id: ctx.patioId,
      tenant_id: ctx.tenantId,
      placa,
      tipo_veiculo: tipoVeiculo,
      tarifa_id: tarifaId,
      diaria_valor: diariaValor,
      diaria_horas: diariaHoras,
      inicio,
      valida_ate: validaAte,
      diarias,
      valor_total: valorTotal,
      operador_id: str(p.operador_id) ?? ctx.operadorSub,
      sincronizado_em: ctx.agora,
    },
  };
}

/** Argumentos de `fn_estadia_registrar_pagamento` (db/41). */
export interface ArgsPagamentoEstadia {
  p_id: string;
  p_tenant_id: string;
  p_patio_id: string;
  p_estadia_id: string;
  p_tipo: 'contratacao' | 'renovacao';
  p_diarias: number;
  p_valor: number;
  p_forma_pagamento: string;
  p_base: string | null;
  p_operador_id: string;
  p_caixa_sessao_id: string | null;
  p_caixa_movimento_id: string | null;
  p_pago_em: string;
}

export function argsPagamentoEstadia(
  id: string,
  p: Record<string, unknown>,
  ctx: ContextoSync,
): Resultado<ArgsPagamentoEstadia> {
  const estadiaId = str(p.estadia_id);
  const tipo = str(p.tipo);
  const diarias = inteiroPositivo(p.diarias);
  const valor = num(p.valor);
  const forma = str(p.forma_pagamento);

  if (!estadiaId) return falha('pagamento sem estadia');
  if (tipo !== 'contratacao' && tipo !== 'renovacao') return falha(`tipo inválido: ${tipo}`);
  if (!diarias) return falha('pagamento sem diárias');
  if (valor === undefined || valor < 0) return falha('pagamento sem valor');
  if (!forma) return falha('pagamento sem forma');

  return {
    ok: true,
    valor: {
      p_id: id,
      p_tenant_id: ctx.tenantId,
      p_patio_id: ctx.patioId,
      p_estadia_id: estadiaId,
      p_tipo: tipo,
      p_diarias: diarias,
      p_valor: valor,
      p_forma_pagamento: forma,
      p_base: toIso(p.base) ?? null,
      p_operador_id: str(p.operador_id) ?? ctx.operadorSub,
      p_caixa_sessao_id: str(p.caixa_sessao_id) ?? null,
      p_caixa_movimento_id: str(p.caixa_movimento_id) ?? null,
      p_pago_em: toIso(p.pago_em) ?? ctx.agora,
    },
  };
}

export interface PagamentoResumo {
  id: string;
  tipo: string;
  diarias: number;
  valor: number;
  forma_pagamento: string;
  pago_em: string;
}

/**
 * Junta estadias e pagamentos no formato que vai para o app em
 * `GET /tickets/abertos`. A ordem é fixa (estadia por id, pagamento por data)
 * porque o corpo inteiro vira o ETag: uma ordem que oscila entre consultas
 * faria o 304 nunca acontecer.
 */
export function montarEstadias<E extends { id: string }>(
  estadias: E[],
  pagamentos: Array<PagamentoResumo & { estadia_id: string }>,
): Array<E & { pagamentos: PagamentoResumo[] }> {
  const porEstadia = new Map<string, PagamentoResumo[]>();
  for (const { estadia_id, ...p } of pagamentos) {
    const lista = porEstadia.get(estadia_id) ?? [];
    lista.push(p);
    porEstadia.set(estadia_id, lista);
  }

  const unicas = new Map<string, E>();
  for (const e of estadias) unicas.set(e.id, e);

  return [...unicas.values()]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((e) => ({
      ...e,
      // `id` desempata pagamentos do mesmo instante (duas renovações em
      // aparelhos diferentes): sem ele a ordem oscila e o ETag nunca repete.
      pagamentos: (porEstadia.get(e.id) ?? []).sort((a, b) =>
        a.pago_em !== b.pago_em
          ? a.pago_em < b.pago_em ? -1 : 1
          : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
      ),
    }));
}
