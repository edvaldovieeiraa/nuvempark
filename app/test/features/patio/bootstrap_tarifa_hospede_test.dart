import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/patio/data/bootstrap_repository.dart';

import '../../support/fakes.dart';

void main() {
  test('pede as tarifas de hóspede e grava as colunas de diária', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    Map<String, dynamic>? query;
    final dio = fakeDio((o) {
      query = o.queryParameters;
      return jsonResponse(bootstrapPayload(tarifas: [
        tarifaJson('padrao'),
        tarifaJson('hosp', extra: {
          'modalidade': 'hospede',
          'diaria_valor': '30.00', // numeric do Postgres pode vir como string
          'diaria_horas': 24,
          'tarifa_atraso_id': 'padrao',
        }),
      ]));
    });

    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    expect(query!['modalidades'], 'hospede');
    final tarifas = {
      for (final t in await db.operacaoDao.getTarifasByOperacaoId('p1')) t.id: t
    };
    expect(tarifas['padrao']!.modalidade, 'avulso');
    expect(tarifas['padrao']!.diariaValor, isNull);
    expect(tarifas['hosp']!.modalidade, 'hospede');
    expect(tarifas['hosp']!.diariaValor, 30);
    expect(tarifas['hosp']!.diariaHoras, 24);
    expect(tarifas['hosp']!.tarifaAtrasoId, 'padrao');
    await db.close();
  });

  test('API antiga (sem as colunas novas): tudo vira avulso, sem erro', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final dio = fakeDio((_) => jsonResponse(bootstrapPayload(tarifas: [tarifaJson('padrao')])));

    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    final t = (await db.operacaoDao.getTarifasByOperacaoId('p1')).single;
    expect(t.modalidade, 'avulso');
    await db.close();
  });
}
