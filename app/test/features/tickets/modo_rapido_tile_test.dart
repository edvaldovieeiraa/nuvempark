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

const _rapido = 'Modo rápido de entrada';
const _imprime = 'Imprimir cupom no modo rápido';

/// Aparelho cujo secure storage passa a recusar gravações.
class _StorageQuebravel extends MemSecureStorage {
  bool quebrado = false;
  @override
  Future<void> write(String key, String value) async {
    if (quebrado) throw StateError('keystore');
    return super.write(key, value);
  }
}

/// Monta as duas chaves como no Menu e, ao lado, um leitor das preferências
/// no lugar de quem as usa (Home e câmera do modo rápido): a mudança feita no
/// Menu precisa chegar lá sem reabrir nada.
Future<TokenStorage> _montar(
  WidgetTester tester,
  PatioModel patio, {
  bool ligado = false,
  bool imprime = true,
  MemSecureStorage? secure,
  bool assentar = true,
}) async {
  final storage = TokenStorage(secure ?? MemSecureStorage());
  await storage.saveModoRapido(ligado);
  await storage.saveModoRapidoImprime(imprime);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [tokenStorageProvider.overrideWithValue(storage)],
      child: MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              ModoRapidoTile(patio: patio),
              ImprimeRapidoTile(patio: patio),
              Consumer(
                builder: (_, ref, _) => Text(
                  'home: ${ref.watch(modoRapidoLigadoProvider).value ?? '-'}',
                ),
              ),
              Consumer(
                builder: (_, ref, _) => Text(
                  'cupom: ${ref.watch(modoRapidoImprimeProvider).value ?? '-'}',
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
  if (assentar) await tester.pumpAndSettle();
  return storage;
}

/// A linha (InkWell) que tem [titulo].
Finder _linha(String titulo) =>
    find.ancestor(of: find.text(titulo), matching: find.byType(InkWell));

Switch _chave(WidgetTester tester, String titulo) => tester.widget<Switch>(
  find.descendant(of: _linha(titulo), matching: find.byType(Switch)),
);

void main() {
  group('modo rápido', () {
    testWidgets('desligado: um toque liga e guarda no aparelho', (
      tester,
    ) async {
      final storage = await _montar(tester, _patio());
      expect(_chave(tester, _rapido).value, isFalse);

      await tester.tap(find.text(_rapido));
      await tester.pumpAndSettle();

      expect(await storage.readModoRapido(), isTrue);
      expect(_chave(tester, _rapido).value, isTrue);
      expect(
        find.text('home: true'),
        findsOneWidget,
        reason: 'o resto do app enxerga a mudança sem reabrir',
      );
    });

    testWidgets('ligado: o toque na chave desliga', (tester) async {
      final storage = await _montar(tester, _patio(), ligado: true);
      expect(_chave(tester, _rapido).value, isTrue);

      await tester.tap(
        find.descendant(of: _linha(_rapido), matching: find.byType(Switch)),
      );
      await tester.pumpAndSettle();

      expect(await storage.readModoRapido(), isFalse);
      expect(_chave(tester, _rapido).value, isFalse);
      expect(find.text('home: false'), findsOneWidget);
    });

    testWidgets('pátio sem tabela avulsa: chave travada e o motivo à vista', (
      tester,
    ) async {
      final patio = _patio(tarifas: []);
      final storage = await _montar(tester, patio);

      expect(find.text(patio.motivoModoRapidoIndisponivel!), findsOneWidget);
      expect(_chave(tester, _rapido).onChanged, isNull);
      expect(tester.widget<InkWell>(_linha(_rapido)).onTap, isNull);

      await tester.tap(find.text(_rapido));
      await tester.pumpAndSettle();
      expect(
        await storage.readModoRapido(),
        isFalse,
        reason: 'travada, o toque não liga nada',
      );
    });

    testWidgets('travada com a preferência ligada: mostra desligada', (
      tester,
    ) async {
      await _montar(tester, _patio(tarifas: []), ligado: true);
      expect(
        _chave(tester, _rapido).value,
        isFalse,
        reason: 'não promete o que não abre',
      );
    });

    testWidgets('aparelho recusa gravar: avisa e a chave fica como estava', (
      tester,
    ) async {
      final secure = _StorageQuebravel();
      final storage = await _montar(tester, _patio(), secure: secure);
      secure.quebrado = true;

      await tester.tap(find.text(_rapido));
      await tester.pumpAndSettle();

      expect(find.text('Não consegui salvar o modo rápido.'), findsOneWidget);
      expect(_chave(tester, _rapido).value, isFalse);
      expect(await storage.readModoRapido(), isFalse);
    });
  });

  group('imprimir cupom no modo rápido', () {
    testWidgets('com o modo ligado: um toque desliga e chega à câmera', (
      tester,
    ) async {
      final storage = await _montar(tester, _patio(), ligado: true);
      expect(_chave(tester, _imprime).value, isTrue);

      await tester.tap(find.text(_imprime));
      await tester.pumpAndSettle();

      expect(await storage.readModoRapidoImprime(), isFalse);
      expect(_chave(tester, _imprime).value, isFalse);
      expect(find.text('cupom: false'), findsOneWidget);
    });

    testWidgets('e liga de volta', (tester) async {
      final storage = await _montar(
        tester,
        _patio(),
        ligado: true,
        imprime: false,
      );

      await tester.tap(
        find.descendant(of: _linha(_imprime), matching: find.byType(Switch)),
      );
      await tester.pumpAndSettle();

      expect(await storage.readModoRapidoImprime(), isTrue);
      expect(find.text('cupom: true'), findsOneWidget);
    });

    testWidgets(
      'modo rápido desligado: travada, mas mostra a escolha guardada',
      (tester) async {
        final storage = await _montar(tester, _patio());

        expect(_chave(tester, _imprime).onChanged, isNull);
        expect(tester.widget<InkWell>(_linha(_imprime)).onTap, isNull);
        expect(
          _chave(tester, _imprime).value,
          isTrue,
          reason: 'a escolha guardada, não "desligada" por estar travada',
        );

        await tester.tap(find.text(_imprime));
        await tester.pumpAndSettle();
        expect(await storage.readModoRapidoImprime(), isTrue);
      },
    );

    testWidgets('ligar o modo rápido destrava a impressão', (tester) async {
      await _montar(tester, _patio());
      expect(_chave(tester, _imprime).onChanged, isNull);

      await tester.tap(find.text(_rapido));
      await tester.pumpAndSettle();

      expect(_chave(tester, _imprime).onChanged, isNotNull);
    });

    testWidgets('pátio sem tabela avulsa: impressão também travada', (
      tester,
    ) async {
      await _montar(tester, _patio(tarifas: []), ligado: true);
      expect(_chave(tester, _imprime).onChanged, isNull);
    });

    testWidgets('aparelho recusa gravar: avisa e fica como estava', (
      tester,
    ) async {
      final secure = _StorageQuebravel();
      final storage = await _montar(
        tester,
        _patio(),
        ligado: true,
        secure: secure,
      );
      secure.quebrado = true;

      await tester.tap(find.text(_imprime));
      await tester.pumpAndSettle();

      expect(
        find.text('Não consegui salvar a impressão do cupom.'),
        findsOneWidget,
      );
      expect(_chave(tester, _imprime).value, isTrue);
      expect(await storage.readModoRapidoImprime(), isTrue);
    });
  });

  testWidgets('lendo as escolhas guardadas: as duas chaves travadas', (
    tester,
  ) async {
    // Antes da leitura, o valor na tela é um chute; um toque gravaria o
    // contrário do que o operador vê depois.
    final storage = await _montar(
      tester,
      _patio(),
      ligado: true,
      imprime: false,
      assentar: false,
    );
    expect(_chave(tester, _rapido).onChanged, isNull);
    expect(_chave(tester, _imprime).onChanged, isNull);

    await tester.tap(find.text(_imprime));
    await tester.pumpAndSettle();
    expect(await storage.readModoRapidoImprime(), isFalse);
    expect(_chave(tester, _rapido).onChanged, isNotNull);
    expect(_chave(tester, _imprime).onChanged, isNotNull);
    expect(_chave(tester, _imprime).value, isFalse);
  });
}
