/**
 * Motor de tarifa por contrato (v2) — spec `.planning/specs/tarifa-contrato.md`.
 *
 * Função pura, sem I/O e sem relógio: recebe instantes e o fuso IANA do pátio.
 * CÓPIA LITERAL de `api/src/lib/contrato/` (só os imports perdem o `.js`).
 * Outras cópias: a da API e
 * `app/lib/features/tarifa/domain/contrato/` (Dart). As três leem o mesmo
 * golden (`golden/tarifa-contrato.json`).
 */
export * from './modelo';
export { validar, type ErroContrato } from './validar';
export { calcular, ContratoInvalido } from './calcular';
