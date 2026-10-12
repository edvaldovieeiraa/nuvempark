import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tickets/domain/leitura_rapida.dart';
import 'package:nuvempark_app/features/tickets/presentation/widgets/entrada_rapida_widgets.dart';

Widget _app(Widget filho) =>
    MaterialApp(home: Scaffold(body: Stack(children: [filho])));

void main() {
  testWidgets('contagem mostra a placa grande e "Corrigir" chama de volta',
      (tester) async {
    var corrigiu = 0;
    await tester.pumpWidget(_app(PainelContagemRapida(
      placa: 'ABC1D23',
      duracao: const Duration(seconds: 2),
      onCorrigir: () => corrigiu++,
    )));
    expect(find.text('ABC1D23'), findsOneWidget);
    await tester.tap(find.text('Corrigir'));
    expect(corrigiu, 1);
    await tester.pump(const Duration(seconds: 3)); // fim da animação
  });

  testWidgets('faixa da última entrada: confirmação e motivo em destaque',
      (tester) async {
    await tester.pumpWidget(_app(const FaixaUltimaEntrada(placa: 'ABC1D23')));
    expect(find.text('ABC1D23 registrada'), findsOneWidget);

    await tester.pumpWidget(_app(const FaixaUltimaEntrada(
        placa: 'VEN1A11', aviso: 'Plano vencido — cobrar avulso')));
    expect(find.text('VEN1A11 registrada'), findsOneWidget);
    expect(find.text('Plano vencido — cobrar avulso'), findsOneWidget);
  });

  testWidgets('contador da sessão, com as corrigidas só quando houver',
      (tester) async {
    await tester.pumpWidget(
        _app(const ContadorRapido(registradas: 1, corrigidas: 0)));
    expect(find.text('1 entrada'), findsOneWidget);

    await tester.pumpWidget(
        _app(const ContadorRapido(registradas: 12, corrigidas: 1)));
    expect(find.text('12 entradas · 1 corrigida'), findsOneWidget);
  });

  group('folha de pausa', () {
    Future<AcaoPausa?> abrir(WidgetTester tester, MotivoPausa motivo,
        {required String tocar}) async {
      AcaoPausa? escolha;
      await tester.pumpWidget(MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () async => escolha =
                await mostrarPausaRapida(context, placa: 'ABC1D23', motivo: motivo),
            child: const Text('abrir'),
          ),
        ),
      ));
      await tester.tap(find.text('abrir'));
      await tester.pumpAndSettle();
      expect(find.textContaining('ABC1D23'), findsWidgets);
      await tester.tap(find.text(tocar));
      await tester.pumpAndSettle();
      return escolha;
    }

    testWidgets('já no pátio: ir para a saída ou pular', (tester) async {
      expect(await abrir(tester, MotivoPausa.jaNoPatio, tocar: 'Ir para a saída'),
          AcaoPausa.irParaSaida);
      expect(find.text('Renovar estadia'), findsNothing);
      expect(await abrir(tester, MotivoPausa.jaNoPatio, tocar: 'Pular'),
          AcaoPausa.pular);
    });

    testWidgets('hóspede vencido: renovar ou pular', (tester) async {
      expect(
          await abrir(tester, MotivoPausa.hospedeVencido,
              tocar: 'Renovar estadia'),
          AcaoPausa.renovar);
      expect(await abrir(tester, MotivoPausa.hospedeVencido, tocar: 'Pular'),
          AcaoPausa.pular);
    });
  });
}
