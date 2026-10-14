import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calcular, lerContrato, validar } from './index';

/**
 * Bateria golden única (`golden/tarifa-contrato.json`), lida também pelo
 * painel e pelo app. Os valores vieram do simulador do CloudPark — ver
 * `golden/README.md`. Nunca ajuste um valor esperado para o teste passar.
 */
interface CasoGolden {
  id: string;
  contrato: string;
  objetivo: string;
  entrada: string;
  saida: string;
  total_centavos: number;
  minutos_restantes: number;
  fatias: Array<{ regra?: string; diarias?: number; valor_centavos: number }>;
  memoria_cloudpark: string;
}

const golden = JSON.parse(
  readFileSync(new URL('../../../../golden/tarifa-contrato.json', import.meta.url), 'utf8'),
) as { fuso: string; contratos: Record<string, unknown>; casos: CasoGolden[] };

describe('contrato — golden do CloudPark', () => {
  it('lê os 45 casos e os 8 contratos', () => {
    expect(golden.casos).toHaveLength(45);
    expect(Object.keys(golden.contratos)).toHaveLength(8);
  });

  for (const [nome, json] of Object.entries(golden.contratos)) {
    it(`${nome} é válido`, () => {
      expect(validar(lerContrato(json))).toEqual([]);
    });
  }

  for (const caso of golden.casos) {
    it(`${caso.id} ${caso.contrato} — ${caso.objetivo}`, () => {
      const r = calcular({
        entrada: new Date(caso.entrada),
        saida: new Date(caso.saida),
        contrato: lerContrato(golden.contratos[caso.contrato]),
        fuso: golden.fuso,
      });
      const fatias = r.fatias.map((f) =>
        f.tipo === 'diarias'
          ? { diarias: f.quantidade, valor_centavos: f.valorCentavos }
          : { regra: f.regra, valor_centavos: f.valorCentavos },
      );
      expect(
        { total: r.totalCentavos, restantes: r.minutosRestantes, fatias },
        caso.memoria_cloudpark,
      ).toEqual({
        total: caso.total_centavos,
        restantes: caso.minutos_restantes,
        fatias: caso.fatias,
      });
    });
  }
});
