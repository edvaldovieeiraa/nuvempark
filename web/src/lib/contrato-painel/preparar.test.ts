import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lerContrato } from '../contrato';
import { contratoParaJson, MAX_JSON, prepararContrato } from './preparar';

const golden = JSON.parse(
  readFileSync(new URL('../../../../golden/tarifa-contrato.json', import.meta.url), 'utf8'),
) as { contratos: Record<string, Record<string, unknown>> };

const C1 = golden.contratos.C1!;
const copia = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('contratoParaJson', () => {
  it.each(Object.keys(golden.contratos))('%s: ida e volta igual ao golden', (nome) => {
    const json = golden.contratos[nome]!;
    expect(contratoParaJson(lerContrato(json))).toEqual(json);
  });
});

describe('prepararContrato', () => {
  it('contrato válido → ok, com o JSON normalizado', () => {
    const r = prepararContrato(JSON.stringify(C1));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.json).toEqual(C1);
      expect(r.contrato.regras[0]!.nome).toBe('Padrão');
    }
  });

  it('descarta chaves desconhecidas (não grava lixo do formulário)', () => {
    const r = prepararContrato(JSON.stringify({ ...C1, extra: '<script>' }));
    expect(r.ok && 'extra' in r.json).toBe(false);
  });

  it.each([
    ['vazio', ''],
    ['texto', 'não é json'],
    ['nulo', null],
    ['número', 42],
  ])('JSON quebrado (%s) → json_invalido', (_, entrada) => {
    expect(prepararContrato(entrada)).toEqual({
      ok: false,
      erros: [{ caminho: 'contrato', codigo: 'json_invalido' }],
    });
  });

  it('grande demais → contrato_grande', () => {
    const grande = JSON.stringify({ ...C1, lixo: 'x'.repeat(MAX_JSON) });
    expect(prepararContrato(grande)).toEqual({
      ok: false,
      erros: [{ caminho: 'contrato', codigo: 'contrato_grande' }],
    });
  });

  it('forma errada → malformado com o caminho', () => {
    const c = copia(C1) as { regras: Array<{ faixas: Array<{ ate_minutos: unknown }> }> };
    c.regras[0]!.faixas[1]!.ate_minutos = '60';
    expect(prepararContrato(JSON.stringify(c))).toEqual({
      ok: false,
      erros: [{ caminho: 'regras[0].faixas[1].ate_minutos', codigo: 'malformado' }],
    });
    expect(prepararContrato(JSON.stringify([1, 2]))).toEqual({
      ok: false,
      erros: [{ caminho: 'contrato', codigo: 'malformado' }],
    });
  });

  it('regra de negócio recusada pelo validar → erros do validar', () => {
    const c = copia(C1) as { regras: Array<{ faixas: Array<{ ate_minutos: number }> }> };
    c.regras[0]!.faixas[2]!.ate_minutos = 30;
    expect(prepararContrato(JSON.stringify(c))).toEqual({
      ok: false,
      erros: [{ caminho: 'regras[0].faixas[2].ate_minutos', codigo: 'faixa_fora_de_ordem' }],
    });
  });

  it('valor acima de R$ 99.999,99 → valor_maximo (faixa, fração e diária)', () => {
    const c = copia(golden.contratos.C2!) as {
      diaria_centavos: number;
      regras: Array<{ faixas: Array<{ valor_centavos: number }>; fracao: { valor_centavos: number } }>;
    };
    c.diaria_centavos = 10_000_000;
    c.regras[0]!.faixas[2]!.valor_centavos = 10_000_000;
    c.regras[0]!.fracao.valor_centavos = 10_000_000;
    const r = prepararContrato(JSON.stringify(c));
    expect(r).toEqual({
      ok: false,
      erros: [
        { caminho: 'regras[0].faixas[2].valor_centavos', codigo: 'valor_maximo' },
        { caminho: 'regras[0].fracao.valor_centavos', codigo: 'valor_maximo' },
        { caminho: 'diaria_centavos', codigo: 'valor_maximo' },
      ],
    });
  });
});
