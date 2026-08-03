import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/printing/data/printer_service.dart';

/// Canal do `print_bluetooth_thermal`.
const _canal = MethodChannel('groons.web.app/print');

void main() {
  group('PrinterService.disconnect', () {
    // Regressão do crash de iOS ao tocar em "Reconectar".
    //
    // O `disconnect` nativo do plugin, no iOS, não responde ao canal: quem
    // chama `result(true)` é o delegate `didDisconnectPeripheral`, e ele só
    // dispara se havia conexão ativa. Sem isso o Future ficava pendente para
    // sempre e o botão girava sem fim.
    //
    // A guarda principal (não chamar o nativo quando não há conexão) é
    // `Platform.isIOS` e não roda na máquina do teste; o que dá para travar
    // aqui — e é o que garante que a interface nunca mais congela — é o
    // timeout, que vale em qualquer plataforma.
    testWidgets('não fica pendente quando a plataforma nunca responde',
        (tester) async {
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      messenger.setMockMethodCallHandler(
        _canal,
        (_) => Completer<Object?>().future, // nunca completa
      );
      addTearDown(() => messenger.setMockMethodCallHandler(_canal, null));

      bool? resultado;
      unawaited(PrinterService().disconnect().then((v) => resultado = v));

      await tester.pump(const Duration(seconds: 4));
      expect(resultado, isNull, reason: 'ainda dentro do prazo de espera');

      await tester.pump(const Duration(seconds: 2));
      expect(resultado, isFalse, reason: 'desistiu em vez de travar');
    });

    testWidgets('devolve a resposta da plataforma quando ela responde',
        (tester) async {
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      messenger.setMockMethodCallHandler(_canal, (_) async => true);
      addTearDown(() => messenger.setMockMethodCallHandler(_canal, null));

      await expectLater(PrinterService().disconnect(), completion(isTrue));
    });
  });
}
