import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:nuvempark_app/features/tarifa/domain/fare_result.dart';
import 'package:nuvempark_app/features/tickets/presentation/widgets/como_chegamos_card.dart';

DateTime _t(String hhmm) => DateTime.parse('2026-11-24T$hhmm:00-03:00');

final _doisTrechos = FareResult(
  valor: 23,
  duracaoMinutos: 100,
  motivo: FareMotivo.normal,
  trechos: [
    TrechoCobranca(inicio: _t('07:30'), fim: _t('08:00'), minutos: 30, centavos: 800),
    TrechoCobranca(
        inicio: _t('08:00'),
        fim: _t('09:10'),
        minutos: 70,
        centavos: 1500,
        regraId: 'r-com',
        regraNome: 'Comercial'),
  ],
);

Widget _app(Widget w) => MaterialApp(home: Scaffold(body: w));

void main() {
  setUpAll(() => initializeDateFormatting('pt_BR'));

  testWidgets('um trecho por linha, horário de Brasília e valor', (tester) async {
    await tester.pumpWidget(_app(ComoChegamosCard(fare: _doisTrechos)));

    expect(find.text('Como chegamos nesse valor'), findsOneWidget);
    expect(find.text('07:30–08:00 · Preço base'), findsOneWidget);
    expect(find.text('08:00–09:10 · Comercial'), findsOneWidget);
    expect(find.text('1h10'), findsOneWidget);
    expect(find.textContaining('15,00'), findsOneWidget);
  });

  testWidgets('teto, voucher e pagamento pelo QR viram linhas de ajuste', (tester) async {
    final teto = FareResult(
      valor: 60,
      duracaoMinutos: 840,
      motivo: FareMotivo.tetoDiaria,
      trechos: _doisTrechos.trechos,
    );
    await tester.pumpWidget(_app(
        ComoChegamosCard(fare: teto, descontoVoucher: 10, jaPagoOnline: 20)));

    expect(find.text('Limitado ao teto da diária'), findsOneWidget);
    expect(find.text('Voucher'), findsOneWidget);
    expect(find.text('Já pago pelo QR'), findsOneWidget);
  });

  test('só aparece com regras: tabela sem regras fica como hoje', () {
    final semRegras = FareResult(
      valor: 8,
      duracaoMinutos: 30,
      motivo: FareMotivo.normal,
      trechos: [
        TrechoCobranca(inicio: _t('10:00'), fim: _t('10:30'), minutos: 30, centavos: 800),
      ],
    );
    expect(semRegras.temDetalheDeRegras, isFalse);
    expect(_doisTrechos.temDetalheDeRegras, isTrue);
  });

  test('cor da regra sai do id (igual ao painel)', () {
    expect(indiceCorRegra('r-com'), indiceCorRegra('r-com'));
    expect(indiceCorRegra('a'), 97 % 6);
  });
}
