import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/estadias/presentation/estadia_formatos.dart';

void main() {
  final agora = DateTime(2026, 10, 9, 10, 30); // sex

  test('dentro de ±6 dias: dia da semana; fora: dd/mm', () {
    expect(fmtValidade(DateTime(2026, 10, 11, 14, 30), agora), 'dom 11/10 às 14:30');
    expect(fmtValidadeCurta(DateTime(2026, 10, 11, 14, 30), agora), 'dom 14:30');
    expect(fmtValidadeCurta(DateTime(2026, 10, 7, 18, 0), agora), 'qua 18:00');
    expect(fmtValidadeCurta(DateTime(2026, 10, 30, 12, 0), agora), '30/10 12:00');
    expect(fmtValidadeCurta(DateTime(2026, 9, 28, 12, 0), agora), '28/09 12:00');
  });

  test('tempo restante e vencido', () {
    expect(fmtDuracaoLonga(const Duration(days: 2, hours: 4, minutes: 10)), '2 dias e 4 h');
    expect(fmtDuracaoLonga(const Duration(hours: 19, minutes: 5)), '19 h');
    expect(fmtDuracaoLonga(const Duration(minutes: 40)), '40 min');
    expect(fmtDuracaoLonga(const Duration(days: 1)), '1 dia');
  });

  test('moeda', () {
    expect(fmtReais(90), 'R\$ 90,00');
  });
}
