import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TarifaEngine } from './tarifa-engine.js';
import { regrasDoJson } from './tarifa-trechos.js';
import { calcularTarifa } from '../../../web/src/lib/tarifa-engine';

/**
 * Contrato com o app e o painel: os MESMOS casos de `testdata/tarifa-casos.json`
 * rodam no motor Dart, no da API e no do painel. Valores esperados foram
 * calculados à mão a partir do spec — se um caso falhar, o bug está no motor,
 * nunca no arquivo. Rodar também com `TZ=UTC` e `TZ=America/Sao_Paulo`: o
 * resultado não pode depender do fuso do processo.
 */

const raiz = (p: string) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));

interface TrechoEsperado {
  inicio: string;
  fim: string;
  regra: string | null;
  minutos: number;
  centavos: number;
}
interface Caso {
  nome: string;
  tarifa: string;
  entrada: string;
  saida: string;
  esperado: { centavos: number; motivo: string; minutos: number; trechos: TrechoEsperado[] };
}
type Tarifa = Record<string, number> & { regras: string[] };

const dados = JSON.parse(readFileSync(raiz('testdata/tarifa-casos.json'), 'utf8')) as {
  regras: Record<string, unknown>;
  tarifas: Record<string, Tarifa>;
  casos: Caso[];
};

function regrasJson(t: Tarifa): unknown[] {
  return t.regras.map((chave) => dados.regras[chave]);
}

interface Resultado {
  valor: number;
  motivo: string;
  duracaoMinutos: number;
  trechos: { inicio: Date; fim: Date; regraNome: string | null; minutos: number; centavos: number }[];
}

const motores: Record<string, (c: Caso) => Resultado> = {
  api: (c) => {
    const t = dados.tarifas[c.tarifa]!;
    return TarifaEngine.calcular({
      entrada: new Date(c.entrada),
      saida: new Date(c.saida),
      tarifa: {
        fracaoInicialMinutos: t.fracao_inicial_minutos!,
        fracaoInicialValor: t.fracao_inicial_valor!,
        fracaoAdicionalMinutos: t.fracao_adicional_minutos!,
        fracaoAdicionalValor: t.fracao_adicional_valor!,
        tetoDiaria: t.teto_diaria!,
        toleranciaMinutos: t.tolerancia_minutos!,
        pernoiteValor: t.pernoite_valor!,
        pernoiteHoraInicio: t.pernoite_hora_inicio!,
        pernoiteHoraFim: t.pernoite_hora_fim!,
        regras: regrasDoJson(regrasJson(t)),
      },
    });
  },
  painel: (c) => {
    const t = dados.tarifas[c.tarifa]!;
    return calcularTarifa(new Date(c.entrada), new Date(c.saida), {
      tolerancia_minutos: t.tolerancia_minutos!,
      fracao_inicial_minutos: t.fracao_inicial_minutos!,
      fracao_inicial_valor: t.fracao_inicial_valor!,
      fracao_adicional_minutos: t.fracao_adicional_minutos!,
      fracao_adicional_valor: t.fracao_adicional_valor!,
      teto_diaria: t.teto_diaria!,
      pernoite_valor: t.pernoite_valor!,
      pernoite_hora_inicio: t.pernoite_hora_inicio!,
      pernoite_hora_fim: t.pernoite_hora_fim!,
      // O painel recebe o JSON como vem do banco (texto ou lista).
      regras_horario: JSON.stringify(regrasJson(t)),
    });
  },
};

describe('o núcleo é o mesmo arquivo na API e no painel', () => {
  it('api/src/lib/tarifa-trechos.ts == web/src/lib/tarifa-trechos.ts', () => {
    const api = readFileSync(raiz('api/src/lib/tarifa-trechos.ts'), 'utf8');
    const web = readFileSync(raiz('web/src/lib/tarifa-trechos.ts'), 'utf8');
    expect(web).toBe(api);
  });
});

for (const [nomeMotor, calcular] of Object.entries(motores)) {
  describe(`paridade (${nomeMotor}, TZ=${process.env.TZ ?? 'local'})`, () => {
    for (const c of dados.casos) {
      it(c.nome, () => {
        const r = calcular(c);
        const e = c.esperado;
        expect(Math.round(r.valor * 100), 'total').toBe(e.centavos);
        expect(r.motivo, 'motivo').toBe(e.motivo);
        expect(r.duracaoMinutos, 'minutos da estadia').toBe(e.minutos);
        expect(r.trechos.length, 'quantidade de trechos').toBe(e.trechos.length);
        e.trechos.forEach((x, i) => {
          const t = r.trechos[i]!;
          expect(t.inicio.getTime(), `trecho ${i} início`).toBe(new Date(x.inicio).getTime());
          expect(t.fim.getTime(), `trecho ${i} fim`).toBe(new Date(x.fim).getTime());
          expect(t.regraNome, `trecho ${i} regra`).toBe(x.regra);
          expect(t.minutos, `trecho ${i} minutos`).toBe(x.minutos);
          expect(t.centavos, `trecho ${i} centavos`).toBe(x.centavos);
        });
      });
    }
  });
}

describe('regrasDoJson (igual ao parse do app)', () => {
  const valida = {
    id: 'r1',
    nome: 'Noturno',
    dias: [1, 2, 3, 4, 5, 6, 7],
    hora_inicio: '18:00',
    hora_fim: '06:00',
    cobrar_do_inicio: true,
    degraus: [{ ate_minutos: 720, valor: 20 }],
    adicional_minutos: 60,
    adicional_valor: 0,
  };

  it('regra com tipo inesperado é ignorada sem derrubar as outras', () => {
    const regras = regrasDoJson([
      { ...valida, id: 'ruim', dias: 'todos', adicional_minutos: '30' },
      valida,
    ]);
    expect(regras.map((r) => r.id)).toEqual(['r1']);
  });

  it('regra de versão futura com formato novo continua marcando a tabela', () => {
    const regras = regrasDoJson([{ id: 'futura', nome: 'Nova', requer: 2, formato: 'outro' }]);
    expect(regras).toHaveLength(1);
    expect(regras[0]!.requer).toBe(2);
  });

  it('só 24:00 é aceito com hora 24', () => {
    expect(regrasDoJson([{ ...valida, hora_fim: '24:00' }])[0]!.fimMinutos).toBe(0);
    expect(regrasDoJson([{ ...valida, hora_fim: '24:30' }])).toEqual([]);
  });

  it('nulo, vazio, texto inválido e não-lista viram lista vazia', () => {
    expect(regrasDoJson(null)).toEqual([]);
    expect(regrasDoJson('')).toEqual([]);
    expect(regrasDoJson('{oops')).toEqual([]);
    expect(regrasDoJson({ a: 1 })).toEqual([]);
    expect(regrasDoJson('[]')).toEqual([]);
  });
});
