/**
 * Editor e simulador de contrato do painel (Feature 2a). Lógica pura — os
 * componentes só desenham e chamam estas funções. Nada daqui entra em
 * `lib/contrato`, que é cópia literal do motor da API.
 */

/** Fuso das janelas e do simulador até existir `patios.fuso` (spec, requisito 12). */
export const FUSO_PAINEL = 'America/Sao_Paulo';

export * from './formato';
export * from './mensagens';
export * from './exclusoes';
export * from './editor';
export * from './descrever';
export * from './converter';
export * from './preparar';
