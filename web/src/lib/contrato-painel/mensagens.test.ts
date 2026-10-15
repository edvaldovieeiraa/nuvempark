import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mensagem, naoSuportado, MENSAGENS } from './mensagens';

/** Todos os códigos que o `validar` do motor pode devolver, lidos do código-fonte. */
function codigosDoValidar(): string[] {
  const fonte = readFileSync(new URL('../contrato/validar.ts', import.meta.url), 'utf8');
  const codigos = new Set<string>();
  for (const m of fonte.matchAll(/erro\([^;]*?,\s*'([a-z0-9_]+)'\)/g)) codigos.add(m[1]!);
  return [...codigos].sort();
}

describe('mensagens', () => {
  const codigos = codigosDoValidar();

  it('acha os códigos do validar (sanidade do leitor)', () => {
    expect(codigos.length).toBeGreaterThanOrEqual(28);
    expect(codigos).toContain('sobreposicao');
    expect(codigos).toContain('nao_provado_diaria_com_regras');
  });

  it.each(codigos)('%s tem mensagem em pt-BR', (codigo) => {
    expect(MENSAGENS[codigo]).toBeTruthy();
    expect(mensagem(codigo)).not.toMatch(/^\s*$/);
  });

  it('códigos do painel e do servidor também têm mensagem', () => {
    for (const c of [
      'valor_vazio',
      'formato_valor',
      'valor_maximo',
      'hora_vazia',
      'formato_hora',
      'hora_do_dia',
      'json_invalido',
      'malformado',
      'contrato_grande',
      'acima_do_limite_mais_24h',
    ]) {
      expect(MENSAGENS[c], c).toBeTruthy();
    }
  });

  it('preenche os parâmetros', () => {
    expect(mensagem('faixa_fora_de_ordem', { anterior: '1:00' })).toBe(
      'As faixas precisam crescer: esta tem que passar de 1:00.',
    );
    expect(mensagem('valor_menor_que_anterior', { anterior: 'R$ 10,00' })).toContain('(R$ 10,00)');
  });

  it('sem parâmetro não deixa chave crua na tela', () => {
    expect(mensagem('faixa_fora_de_ordem')).not.toMatch(/[{}]/);
    expect(mensagem('sobreposicao')).not.toMatch(/[{}]/);
  });

  it('código desconhecido vira mensagem genérica, sem exceção', () => {
    expect(mensagem('codigo_que_nao_existe')).toMatch(/inválid/);
  });

  it('nao_provado_* é "ainda não suportado"', () => {
    expect(naoSuportado('nao_provado_recomeco_em_regra')).toBe(true);
    expect(naoSuportado('sem_dias')).toBe(false);
    expect(mensagem('nao_provado_recomeco_em_regra')).toContain('Cobrar fração');
  });
});
