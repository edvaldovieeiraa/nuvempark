import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/core/di/providers.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';
import 'package:nuvempark_app/features/patio/domain/patio_model.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';
import 'package:nuvempark_app/features/tickets/presentation/modo_rapido_tile.dart';
import 'package:nuvempark_app/features/tickets/presentation/providers/ticket_provider.dart';

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

/// Aparelho cujo secure storage passa a recusar gravações.
class _StorageQuebravel extends MemSecureStorage {
  bool quebrado = false;
  @override
  Future<void> write(String key, String value) async {
    if (quebrado) throw StateError('keystore');
    return super.write(key, value);
  }
}

/// Monta o tile e, ao lado, um leitor da preferência no lugar da Home — o
/// botão "Entrada" de lá precisa ver a mudança feita no Menu.
Future<TokenStorage> _montar(WidgetTester tester, PatioModel patio,
    {bool ligado = false, MemSecureStorage? secure}) async {
  final storage = TokenStorage(secure ?? MemSecureStorage());
  await storage.saveModoRapido(ligado);
  await tester.pumpWidget(ProviderScope(
    overrides: [tokenStorageProvider.overrideWithValue(storage)],
    child: MaterialApp(
      home: Scaffold(
        body: Column(children: [
          ModoRapidoTile(patio: patio),
          Consumer(
            builder: (_, ref, _) => Text(
                'home: ${ref.watch(modoRapidoLigadoProvider).value ?? '-'}'),
          ),
        ]),
      ),
    ),
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
    expect(find.text('home: true'), findsOneWidget,
        reason: 'o resto do app enxerga a mudança sem reabrir');
  });

  testWidgets('ligado: o toque na chave desliga', (tester) async {
    final storage = await _montar(tester, _patio(), ligado: true);
    expect(_valor(tester), isTrue);

    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();

    expect(await storage.readModoRapido(), isFalse);
    expect(_valor(tester), isFalse);
    expect(find.text('home: false'), findsOneWidget);
  });

  testWidgets('pátio sem tabela avulsa: chave travada e o motivo à vista',
      (tester) async {
    final patio = _patio(tarifas: []);
    final storage = await _montar(tester, patio);

    expect(find.text(patio.motivoModoRapidoIndisponivel!), findsOneWidget);
    expect(tester.widget<Switch>(find.byType(Switch)).onChanged, isNull);
    expect(tester.widget<InkWell>(find.byType(InkWell).first).onTap, isNull);

    await tester.tap(find.text('Modo rápido de entrada'));
    await tester.pumpAndSettle();
    expect(await storage.readModoRapido(), isFalse,
        reason: 'travada, o toque não liga nada');
  });

  testWidgets('travada com a preferência ligada: mostra desligada',
      (tester) async {
    await _montar(tester, _patio(tarifas: []), ligado: true);
    expect(_valor(tester), isFalse, reason: 'não promete o que não abre');
  });

  testWidgets('aparelho recusa gravar: avisa e a chave fica como estava',
      (tester) async {
    final secure = _StorageQuebravel();
    final storage = await _montar(tester, _patio(), secure: secure);
    secure.quebrado = true;

    await tester.tap(find.text('Modo rápido de entrada'));
    await tester.pumpAndSettle();

    expect(find.text('Não consegui salvar o modo rápido.'), findsOneWidget);
    expect(_valor(tester), isFalse);
    expect(await storage.readModoRapido(), isFalse);
  });
}
