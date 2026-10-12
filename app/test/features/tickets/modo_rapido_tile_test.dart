import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/core/di/providers.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';
import 'package:nuvempark_app/features/patio/domain/patio_model.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';
import 'package:nuvempark_app/features/tickets/presentation/modo_rapido_tile.dart';

import '../../support/fakes.dart';

final _avulsa = TarifaConfig(
  id: 'tar-1',
  operacaoId: 'p1',
  nome: 'Padrão',
  tipoVeiculo: 'carro',
  ordem: 0,
  visivelOperador: true,
  fracaoInicialMinutos: 60,
  fracaoInicialValor: 10,
  fracaoAdicionalMinutos: 60,
  fracaoAdicionalValor: 5,
  tetoDiaria: 60,
  toleranciaMinutos: 10,
  pernoiteValor: 0,
  pernoiteHoraInicio: 22,
  pernoiteHoraFim: 6,
  vigenciaInicio: DateTime(2020),
);

PatioModel _patio({List<TarifaConfig>? tarifas}) => PatioModel(
      id: 'p1',
      nome: 'Pátio',
      codigo: 'P1',
      qtdVagas: 10,
      tiposVeiculo: const ['carro'],
      formasPagamento: const [],
      motivosIsencao: const [],
      motivosCancelamento: const [],
      ticketCabecalho: const [],
      ticketRodape: const [],
      tarifas: tarifas ?? [_avulsa],
      sincronizadoEm: DateTime(2026),
      modoRapidoEntrada: true,
    );

Future<TokenStorage> _montar(WidgetTester tester, PatioModel patio,
    {bool ligado = false}) async {
  final storage = TokenStorage(MemSecureStorage());
  await storage.saveModoRapido(ligado);
  await tester.pumpWidget(ProviderScope(
    overrides: [tokenStorageProvider.overrideWithValue(storage)],
    child: MaterialApp(home: Scaffold(body: ModoRapidoTile(patio: patio))),
  ));
  await tester.pumpAndSettle();
  return storage;
}

bool _valor(WidgetTester tester) =>
    tester.widget<Switch>(find.byType(Switch)).value;

void main() {
  testWidgets('desligado: um toque liga e guarda no aparelho', (tester) async {
    final storage = await _montar(tester, _patio());
    expect(find.text('Modo rápido de entrada'), findsOneWidget);
    expect(_valor(tester), isFalse);

    await tester.tap(find.text('Modo rápido de entrada'));
    await tester.pumpAndSettle();

    expect(await storage.readModoRapido(), isTrue);
    expect(_valor(tester), isTrue);
  });

  testWidgets('ligado: o toque na chave desliga', (tester) async {
    final storage = await _montar(tester, _patio(), ligado: true);
    expect(_valor(tester), isTrue);

    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();

    expect(await storage.readModoRapido(), isFalse);
    expect(_valor(tester), isFalse);
  });

  testWidgets('pátio sem tabela avulsa: chave travada e o motivo à vista',
      (tester) async {
    final patio = _patio(tarifas: []);
    final storage = await _montar(tester, patio, ligado: true);

    expect(find.text(patio.motivoModoRapidoIndisponivel!), findsOneWidget);
    expect(_valor(tester), isFalse, reason: 'não promete o que não abre');
    expect(tester.widget<Switch>(find.byType(Switch)).onChanged, isNull);

    await tester.tap(find.text('Modo rápido de entrada'));
    await tester.pumpAndSettle();
    expect(await storage.readModoRapido(), isTrue,
        reason: 'travada não mexe na preferência guardada');
  });
}
