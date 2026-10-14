/**
 * Motor de tarifa por contrato (v2) — spec `.planning/specs/tarifa-contrato.md`.
 *
 * Função pura, sem I/O e sem relógio: recebe instantes e o fuso IANA do pátio.
 * Cópias: `web/src/lib/contrato/` (literal) e
 * `app/lib/features/tarifa/domain/contrato/` (Dart). As três leem o mesmo
 * golden (`golden/tarifa-contrato.json`).
 */
export * from './modelo.js';
export { validar, type ErroContrato } from './validar.js';
export { calcular, ContratoInvalido } from './calcular.js';
