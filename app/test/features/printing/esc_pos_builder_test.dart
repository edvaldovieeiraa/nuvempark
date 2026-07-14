import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/printing/data/esc_pos_builder.dart';
import 'package:nuvempark_app/features/printing/data/print_templates.dart';

void main() {
  group('EscPosBuilder.normalize', () {
    test('travessão vira hífen (o bug que derrubava o fechamento)', () {
      // Regressão real: "Mensalidade — E" (em dash, U+2014) fazia o
      // latin1.encode LANÇAR, e o cupom inteiro não saía — sem erro na tela.
      expect(EscPosBuilder.normalize('Mensalidade — E'), 'Mensalidade - E');
    });

    test('acentos viram ASCII', () {
      expect(EscPosBuilder.normalize('Ação Óbvia Ç'), 'Acao Obvia C');
    });

    test('aspas curvas e reticências', () {
      expect(EscPosBuilder.normalize('“aspas” ‘e’ …'), '"aspas" \'e\' ...');
    });

    test('qualquer coisa fora do ASCII imprimível vira "?" (nunca lança)', () {
      final r = EscPosBuilder.normalize('Pago 🚗 ok');
      expect(r.startsWith('Pago '), isTrue);
      expect(r.endsWith(' ok'), isTrue);
      expect(r.codeUnits.every((c) => c >= 0x20 && c <= 0x7E), isTrue,
          reason: 'tudo dentro do ASCII imprimível — latin1.encode não lança');
    });

    test('quebra de linha é preservada', () {
      expect(EscPosBuilder.normalize('a\nb'), 'a\nb');
    });
  });

  test('fechamentoCaixa com texto sujo não lança e gera bytes', () {
    final bytes = PrintTemplates.fechamentoCaixa(
      operadorNome: 'João — Ação',
      operacaoNome: 'Pátio “Centro”',
      abertura: DateTime(2026, 7, 14, 8),
      fechamento: DateTime(2026, 7, 14, 18),
      fundoCaixa: 100,
      totalEntradas: 250,
      totalSangrias: 50,
      totalCalculado: 300,
      totalContado: 300,
      divergencia: 0,
      movimentos: const [
        MovimentoCupom(
          hora: '15:01',
          descricao: 'Mensalidade — E', // o caractere que quebrava tudo
          valor: '+R\$ 150,00',
        ),
        MovimentoCupom(
          hora: '16:20',
          descricao: 'Ticket 🚗 ABC1D23',
          valor: '+R\$ 12,00',
        ),
      ],
    );

    expect(bytes, isNotEmpty);
    expect(bytes.every((b) => b >= 0 && b <= 255), isTrue);
  });
}
