import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tarifa/domain/contrato/contrato_engine.dart';

/// Mesmas bordas de `api/src/lib/contrato/calcular.test.ts`. Horários de
/// Brasília (−03:00, sem horário de verão em 2026).
void main() {
  final golden = jsonDecode(File('../golden/tarifa-contrato.json').readAsStringSync())
      as Map<String, dynamic>;
  Contrato contrato(String nome) => lerContrato((golden['contratos'] as Map)[nome]);
  const sp = 'America/Sao_Paulo';
  DateTime brt(String s) => DateTime.parse('$s-03:00');

  ResultadoContrato calc(String nome, String entrada, String saida) =>
      calcular(entrada: brt(entrada), saida: brt(saida), contrato: contrato(nome), fuso: sp);

  test('entrada igual à saída cai na primeira faixa', () {
    final r = calc('C1', '2026-10-19T10:00', '2026-10-19T10:00');
    expect([r.totalCentavos, r.minutosRestantes], [0, 15]);
  });

  test('entrada igual à saída dentro do Noturno: paga a faixa até o fim da janela', () {
    final r = calc('C4', '2026-10-19T21:00', '2026-10-19T21:00');
    expect([r.totalCentavos, r.minutosRestantes], [2500, 9 * 60]);
  });

  test('saída antes da entrada é erro', () {
    expect(() => calc('C1', '2026-10-19T10:00', '2026-10-19T09:59'), throwsArgumentError);
  });

  test('contrato inválido não é cobrado', () {
    final c = contrato('C1')..regras[0].fracao = null;
    expect(
      () => calcular(
        entrada: brt('2026-10-19T10:00'),
        saida: brt('2026-10-19T11:00'),
        contrato: c,
        fuso: sp,
      ),
      throwsA(isA<ContratoInvalido>()),
    );
  });

  test('segundos são truncados como no motor v1: 59 min 59 s = 59 min', () {
    final r = calcular(
      entrada: DateTime.utc(2026, 10, 19, 13, 0, 30),
      saida: DateTime.utc(2026, 10, 19, 14, 0, 29),
      contrato: contrato('C1'),
      fuso: sp,
    );
    expect([r.totalCentavos, r.minutosRestantes], [1000, 1]);
  });

  test('a Padrão paga até o começo da próxima janela, não além', () {
    final r = calc('C4', '2026-10-19T19:40', '2026-10-19T19:50');
    expect([r.totalCentavos, r.minutosRestantes], [1000, 10]);
  });

  test('minutos pagos do Noturno e depois a Padrão até a noite seguinte', () {
    final r = calc('C5', '2026-10-19T20:00', '2026-10-20T19:30');
    expect(
      [for (final f in r.fatias.cast<FatiaRegra>()) [f.regra, f.valorCentavos]],
      [
        ['Noturno', 2500],
        ['Padrão', 6500],
      ],
    );
    expect(r.minutosRestantes, 30);
  });

  test('diária: estadia curta e barata fica na tabela', () {
    final r = calc('C2', '2026-10-19T10:00', '2026-10-19T10:00');
    expect(r.fatias.single, isA<FatiaRegra>());
    expect(r.totalCentavos, 0);
  });

  test('diária: 48 h exatas são 2 diárias numa fatia só', () {
    final r = calc('C2', '2026-10-19T10:00', '2026-10-21T10:00');
    final f = r.fatias.single as FatiaDiarias;
    expect([f.quantidade, f.valorCentavos, r.minutosRestantes], [2, 8000, 0]);
  });

  test('memória: inicio e fim de cada fatia (S24)', () {
    final r = calc('C4', '2026-10-19T19:00', '2026-10-19T21:00');
    expect(
      [for (final f in r.fatias) [f.inicio, f.fim]],
      [
        [DateTime.utc(2026, 10, 19, 22), DateTime.utc(2026, 10, 19, 23)],
        [DateTime.utc(2026, 10, 19, 23), DateTime.utc(2026, 10, 20, 9)],
      ],
    );
    expect(r.pagoAte, DateTime.utc(2026, 10, 20, 9));
  });

  // Dart não tem `Invalid Date`: o caso "data inválida" do TypeScript não existe aqui.
  test('estadia acima de 10 anos é erro (entrada zerada por bug não trava o app)', () {
    expect(
      () => calcular(
        entrada: DateTime.utc(1970),
        saida: brt('2026-10-19T10:00'),
        contrato: contrato('C4'),
        fuso: sp,
      ),
      throwsArgumentError,
    );
  });

  test('um ano no Noturno calcula rápido e soma um noturno por noite', () {
    final relogio = Stopwatch()..start();
    final r = calc('C4', '2026-01-05T20:00', '2027-01-04T20:00');
    expect(relogio.elapsedMilliseconds, lessThan(2000));
    expect(r.fatias.whereType<FatiaRegra>().where((f) => f.regra == 'Noturno'), hasLength(364));
  });
}
