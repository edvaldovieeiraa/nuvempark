import 'dart:io';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';

/// Aparelho em campo com o banco v6 atualiza o app: a v7 acrescenta as regras
/// de horário em `tarifas`. As tarifas que já estavam no aparelho continuam lá
/// (o app cobra offline com elas até o próximo bootstrap) e nascem sem regras.
void main() {
  test('v6 → v7: tarifas existentes preservadas, sem regras de horário', () async {
    final ddl = File('test/fixtures/schema_v6.sql').readAsStringSync();
    final executor = NativeDatabase.memory(setup: (raw) {
      for (final stmt in ddl.split(';\n')) {
        if (stmt.trim().isNotEmpty) raw.execute(stmt);
      }
      raw.execute(
          'INSERT INTO tarifas (id, operacao_id, nome, tipo_veiculo, '
          'fracao_inicial_minutos, fracao_inicial_valor, fracao_adicional_minutos, '
          'fracao_adicional_valor, teto_diaria, tolerancia_minutos, pernoite_valor, '
          'pernoite_hora_inicio, pernoite_hora_fim, vigencia_inicio_epoch) '
          "VALUES ('t1', 'p1', 'Carro', 'carro', 15, 5.0, 15, 3.0, 60.0, 10, 0.0, 22, 6, 1)");
      raw.execute('PRAGMA user_version = 6');
    });
    final db = AppDatabase.forTesting(executor);

    final tarifas = await db.select(db.tarifas).get();
    expect(tarifas, hasLength(1));
    expect(tarifas.single.nome, 'Carro');
    expect(tarifas.single.regrasHorario, '[]');

    final versao = await db.customSelect('PRAGMA user_version').getSingle();
    expect(versao.read<int>('user_version'), 7);
    await db.close();
  });
}
