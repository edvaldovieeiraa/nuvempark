import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/printing/data/fila_impressao.dart';

void main() {
  test('um cupom por vez, na ordem em que entraram', () async {
    final fila = FilaImpressao();
    final ordem = <String>[];
    final primeiro = Completer<bool>();

    final a = fila.enfileirar(() {
      ordem.add('a começou');
      return primeiro.future;
    });
    final b = fila.enfileirar(() async {
      ordem.add('b começou');
      return true;
    });

    await Future<void>.delayed(Duration.zero);
    expect(ordem, ['a começou'], reason: 'b espera a impressora soltar');
    expect(fila.pendentes, 2);

    primeiro.complete(true);
    expect(await a, isTrue);
    expect(await b, isTrue);
    expect(ordem, ['a começou', 'b começou']);
    expect(fila.pendentes, 0);
  });

  test('falha de um cupom não impede o seguinte', () async {
    final fila = FilaImpressao();
    final a = fila.enfileirar(() async => throw StateError('impressora caiu'));
    final b = fila.enfileirar(() async => false);
    final c = fila.enfileirar(() async => true);
    expect(await a, isFalse, reason: 'erro vira "não imprimiu", sem lançar');
    expect(await b, isFalse);
    expect(await c, isTrue);
  });

  test('erro síncrono do trabalho também é contido', () async {
    final fila = FilaImpressao();
    final a = fila.enfileirar(() => throw StateError('montagem'));
    final b = fila.enfileirar(() async => true);
    expect(await a, isFalse);
    expect(await b, isTrue);
  });
}
