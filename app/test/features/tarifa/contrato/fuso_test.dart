import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tarifa/domain/contrato/fuso.dart';

/// Mesmos casos de `api/src/lib/contrato/fuso.test.ts`.
void main() {
  const sp = 'America/Sao_Paulo';
  const ny = 'America/New_York';

  test('instante UTC → hora de Brasília, com o dia da semana de Brasília', () {
    // 01:00 UTC de terça = 22:00 de segunda em Brasília.
    expect(
      partesLocais(DateTime.utc(2026, 10, 20, 1), sp),
      const PartesLocais(ano: 2026, mes: 10, dia: 19, diaSemana: 1, minutoDoDia: 22 * 60),
    );
  });

  test('domingo é 7 (ISO)', () {
    expect(partesLocais(DateTime.utc(2026, 10, 25, 15), sp).diaSemana, 7);
  });

  test('hora de Brasília → instante UTC', () {
    expect(instanteLocal(2026, 10, 19, 20 * 60, sp), DateTime.utc(2026, 10, 19, 23));
  });

  test('não usa offset fixo: Nova York muda de −5 para −4 em 08/03/2026', () {
    expect(instanteLocal(2026, 3, 7, 3 * 60, ny), DateTime.utc(2026, 3, 7, 8));
    expect(instanteLocal(2026, 3, 8, 3 * 60, ny), DateTime.utc(2026, 3, 8, 7));
    expect(partesLocais(DateTime.utc(2026, 3, 8, 6, 59), ny).minutoDoDia, 1 * 60 + 59);
    expect(partesLocais(DateTime.utc(2026, 3, 8, 7), ny).minutoDoDia, 3 * 60);
  });

  test('hora inexistente e hora repetida dão o mesmo que o TypeScript', () {
    expect(instanteLocal(2026, 3, 8, 150, ny), DateTime.utc(2026, 3, 8, 6, 30));
    expect(instanteLocal(2026, 11, 1, 90, ny), DateTime.utc(2026, 11, 1, 5, 30));
  });

  test('somarDias atravessa mês e ano', () {
    expect(somarDias(2026, 12, 31, 1), (ano: 2027, mes: 1, dia: 1));
    expect(somarDias(2026, 3, 1, -1), (ano: 2026, mes: 2, dia: 28));
  });
}
