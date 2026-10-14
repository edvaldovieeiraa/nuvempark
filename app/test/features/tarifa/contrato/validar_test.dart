import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tarifa/domain/contrato/modelo.dart';
import 'package:nuvempark_app/features/tarifa/domain/contrato/validar.dart';

/// Mesmos casos de `api/src/lib/contrato/validar.test.ts`.
Regra _regra({
  String nome = 'Padrão',
  int? inicio,
  int? fim,
  List<int>? dias,
}) =>
    Regra(
      nome: nome,
      inicio: inicio,
      fim: fim,
      dias: dias,
      faixas: [const Faixa(ateMinutos: 60, valorCentavos: 1000)],
      fracao: const Fracao(minutos: 60, valorCentavos: 500),
    );

/// Padrão + Noturno (como o C4 do golden): válido.
Contrato _base() => Contrato(regras: [
      _regra(),
      _regra(nome: 'Noturno', inicio: 20 * 60, fim: 6 * 60, dias: [1, 2, 3, 4, 5, 6, 7]),
    ]);

List<String> _erros(void Function(Contrato c) muda) {
  final c = _base();
  muda(c);
  return validar(c).map((e) => '${e.caminho}:${e.codigo}').toList();
}

void main() {
  test('a base é válida', () => expect(validar(_base()), isEmpty));

  group('regras', () {
    test('sem nenhuma regra', () {
      expect(_erros((c) => c.regras = []), ['regras:sem_regras']);
    });
    test('a primeira precisa se chamar Padrão', () {
      expect(_erros((c) => c.regras[0].nome = 'Geral'), ['regras[0].nome:padrao_nome']);
    });
    test('Padrão não tem horário nem dias', () {
      expect(_erros((c) => c.regras[0].inicio = 60), ['regras[0]:padrao_com_horario']);
      expect(_erros((c) => c.regras[0].dias = [1]), ['regras[0]:padrao_com_horario']);
    });
    test('Padrão não usa minutos pagos', () {
      expect(_erros((c) => c.regras[0].usarMinutosPagos = true),
          ['regras[0].usar_minutos_pagos:padrao_usar_minutos_pagos']);
    });
    test('nenhuma outra regra se chama Padrão', () {
      expect(_erros((c) => c.regras[1].nome = 'Padrão'), ['regras[1].nome:nome_padrao_repetido']);
    });
    test('nome vazio e nome repetido', () {
      expect(_erros((c) => c.regras[1].nome = '  '), ['regras[1].nome:nome_vazio']);
      expect(
        _erros((c) => c.regras.add(_regra(nome: 'Noturno', inicio: 8 * 60, fim: 9 * 60, dias: [1]))),
        ['regras[2].nome:nome_repetido'],
      );
    });
    test('regra além da Padrão precisa de início, fim e dias', () {
      expect(_erros((c) => c.regras[1].fim = null), ['regras[1]:janela_incompleta']);
      expect(_erros((c) => c.regras[1].dias = []), ['regras[1].dias:sem_dias']);
      expect(_erros((c) => c.regras[1].dias = null), ['regras[1].dias:sem_dias']);
    });
    test('início igual ao fim é janela vazia', () {
      expect(_erros((c) => c.regras[1].fim = 20 * 60), ['regras[1]:janela_vazia']);
    });
    test('dia fora de 1–7 ou repetido', () {
      expect(_erros((c) => c.regras[1].dias = [0, 1]), ['regras[1].dias:dia_invalido']);
      expect(_erros((c) => c.regras[1].dias = [1, 1]), ['regras[1].dias:dia_invalido']);
    });
  });

  group('sobreposição', () {
    test('duas regras no mesmo horário e dia', () {
      expect(
        _erros((c) => c.regras.add(_regra(nome: 'Madrugada', inicio: 2 * 60, fim: 4 * 60, dias: [2]))),
        ['regras[2]:sobreposicao'],
      );
    });
    test('a virada da meia-noite conta: Noturno de segunda invade a madrugada de terça', () {
      expect(
        _erros((c) {
          c.regras[1].dias = [1];
          c.regras.add(_regra(nome: 'Terça cedo', inicio: 5 * 60, fim: 7 * 60, dias: [2]));
        }),
        ['regras[2]:sobreposicao'],
      );
    });
    test('domingo à noite invade segunda de manhã', () {
      expect(
        _erros((c) {
          c.regras[1].dias = [7];
          c.regras.add(_regra(nome: 'Segunda cedo', inicio: 5 * 60, fim: 7 * 60, dias: [1]));
        }),
        ['regras[2]:sobreposicao'],
      );
    });
    test('janelas encostadas não se sobrepõem', () {
      expect(
        _erros((c) => c.regras.add(_regra(nome: 'Manhã', inicio: 6 * 60, fim: 9 * 60, dias: [1]))),
        isEmpty,
      );
    });
  });

  group('faixas e fração', () {
    test('regra sem faixa', () {
      expect(_erros((c) => c.regras[0].faixas = []), ['regras[0].faixas:sem_faixas']);
    });
    test('faixa com menos de 1 minuto', () {
      expect(_erros((c) => c.regras[0].faixas = [const Faixa(ateMinutos: 0, valorCentavos: 1000)]),
          ['regras[0].faixas[0].ate_minutos:faixa_minimo']);
    });
    test('faixas fora de ordem', () {
      expect(_erros((c) => c.regras[0].faixas.add(const Faixa(ateMinutos: 60, valorCentavos: 2000))),
          ['regras[0].faixas[1].ate_minutos:faixa_fora_de_ordem']);
    });
    test('valor negativo e valor menor que o da faixa anterior', () {
      expect(_erros((c) => c.regras[0].faixas = [const Faixa(ateMinutos: 60, valorCentavos: -1)]),
          ['regras[0].faixas[0].valor_centavos:valor_negativo']);
      expect(_erros((c) => c.regras[0].faixas.add(const Faixa(ateMinutos: 120, valorCentavos: 900))),
          ['regras[0].faixas[1].valor_centavos:valor_menor_que_anterior']);
    });
    test('faixa acima de 23:59 sem "mais de 24 h"; até 999 h com', () {
      expect(_erros((c) => c.regras[0].faixas = [const Faixa(ateMinutos: 1440, valorCentavos: 1000)]),
          ['regras[0].faixas[0].ate_minutos:acima_do_limite']);
      expect(
        _erros((c) {
          c.maisDe24h = true;
          c.regras = [c.regras[0]];
          c.regras[0].faixas = [const Faixa(ateMinutos: 999 * 60, valorCentavos: 1000)];
        }),
        isEmpty,
      );
      expect(
        _erros((c) {
          c.maisDe24h = true;
          c.regras = [c.regras[0]];
          c.regras[0].faixas = [const Faixa(ateMinutos: 999 * 60 + 1, valorCentavos: 1000)];
        }),
        ['regras[0].faixas[0].ate_minutos:acima_do_limite'],
      );
    });
    test('fração com menos de 1 minuto, acima do limite ou valor negativo', () {
      expect(_erros((c) => c.regras[0].fracao = const Fracao(minutos: 0, valorCentavos: 500)),
          ['regras[0].fracao.minutos:fracao_minimo']);
      expect(_erros((c) => c.regras[0].fracao = const Fracao(minutos: 1440, valorCentavos: 500)),
          ['regras[0].fracao.minutos:acima_do_limite']);
      expect(_erros((c) => c.regras[0].fracao = const Fracao(minutos: 60, valorCentavos: -5)),
          ['regras[0].fracao.valor_centavos:valor_negativo']);
    });
    test('sem fração nem recomeço não sabe cobrar depois da última faixa', () {
      expect(_erros((c) => c.regras[0].fracao = null), ['regras[0].fracao:sem_fracao_nem_recomeco']);
    });
    test('recomeço não convive com fração', () {
      expect(_erros((c) => c.regras[0].recomecarTabela = true), ['regras[0].fracao:recomeco_com_fracao']);
    });
  });

  group('opções do contrato', () {
    test('"mais de 24 h" não convive com diária nem com várias regras', () {
      expect(
        _erros((c) {
          c.maisDe24h = true;
          c.regras = [c.regras[0]];
          c.diariaCentavos = 4000;
        }),
        ['diaria_centavos:mais_de_24h_com_diaria'],
      );
      expect(_erros((c) => c.maisDe24h = true), ['regras:mais_de_24h_com_regras']);
    });
    test('"cobrar menor valor" só com 2+ regras', () {
      expect(
        _erros((c) {
          c.regras = [c.regras[0]];
          c.cobrarMenorValor = true;
        }),
        ['cobrar_menor_valor:menor_valor_sem_regras'],
      );
    });
    test('diária precisa ser maior que zero', () {
      expect(
        _erros((c) {
          c.regras = [c.regras[0]];
          c.diariaCentavos = 0;
        }),
        ['diaria_centavos:diaria_invalida'],
      );
    });
  });

  // Combinações que os 45 casos do CloudPark não provam (spec, tabela a–f).
  group('não provado no CloudPark', () {
    test('(a) recomeçar a tabela numa regra por horário', () {
      expect(
        _erros((c) {
          c.regras[1].recomecarTabela = true;
          c.regras[1].fracao = null;
        }),
        ['regras[1].recomecar_tabela:nao_provado_recomeco_em_regra'],
      );
    });
    test('(b/c) diária com regras por horário', () {
      expect(_erros((c) => c.diariaCentavos = 4000), ['diaria_centavos:nao_provado_diaria_com_regras']);
    });
    test('(f) minutos pagos com mais de uma regra por horário', () {
      expect(
        _erros((c) {
          c.regras[1].usarMinutosPagos = true;
          c.regras.add(_regra(nome: 'Manhã', inicio: 7 * 60, fim: 9 * 60, dias: [1]));
        }),
        ['regras[1].usar_minutos_pagos:nao_provado_minutos_pagos_com_regras'],
      );
    });
    test('minutos pagos com uma regra só é o caso provado (C5)', () {
      expect(_erros((c) => c.regras[1].usarMinutosPagos = true), isEmpty);
    });
  });
}
