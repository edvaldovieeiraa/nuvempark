import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/patio/data/bootstrap_repository.dart';
import 'package:nuvempark_app/features/tarifa/domain/regra_horario.dart';

import '../../support/fakes.dart';

const _regra = {
  'id': 'r1',
  'nome': 'Noturno',
  'dias': [1, 2, 3, 4, 5, 6, 7],
  'hora_inicio': '18:00',
  'hora_fim': '06:00',
  'cobrar_do_inicio': true,
  'degraus': [
    {'ate_minutos': 720, 'valor': 20.0},
  ],
  'adicional_minutos': 60,
  'adicional_valor': 0,
};

void main() {
  test('declara que entende regras de horário v1 (sem perder o hóspede)', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    Map<String, dynamic>? query;
    final dio = fakeDio((o) {
      query = o.queryParameters;
      return jsonResponse(bootstrapPayload(tarifas: [tarifaJson('padrao')]));
    });

    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    final tokens = (query!['modalidades'] as String).split(',');
    expect(tokens, containsAll(['hospede', 'regras_horario_v1']));
    await db.close();
  });

  test('grava as regras e elas voltam como RegraHorario', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final dio = fakeDio((_) => jsonResponse(bootstrapPayload(tarifas: [
          tarifaJson('carro', extra: {
            'regras_horario': [
              {..._regra, 'degraus': [{'ate_minutos': 720, 'valor': 20.0}]},
            ],
          }),
        ])));

    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    final t = (await db.operacaoDao.getTarifasByOperacaoId('p1')).single;
    final regras = RegraHorario.listaDoJson(t.regrasHorario);
    expect(regras, hasLength(1));
    expect(regras.single.nome, 'Noturno');
    expect(regras.single.inicioMinutos, 18 * 60);
    expect(regras.single.fimMinutos, 6 * 60);
    expect(regras.single.degraus.single.centavos, 2000);
    await db.close();
  });

  test('API antiga (sem regras_horario) ou valor nulo → tabela sem regras', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final dio = fakeDio((_) => jsonResponse(bootstrapPayload(tarifas: [
          tarifaJson('a'),
          tarifaJson('b', extra: {'regras_horario': null}),
        ])));

    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    for (final t in await db.operacaoDao.getTarifasByOperacaoId('p1')) {
      expect(t.regrasHorario, '[]');
      expect(RegraHorario.listaDoJson(t.regrasHorario), isEmpty);
    }
    await db.close();
  });

  test('regra de app mais novo (requer 2) é reconhecida', () {
    final regras = RegraHorario.listaDoJson([
      {..._regra, 'degraus': [{'ate_minutos': 720, 'valor': 20.0}], 'requer': 2},
    ]);
    expect(regras.single.requer, 2);
  });
}
