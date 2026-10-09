import 'dart:io';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';

/// Aparelho em campo com o banco v4 atualiza o app: a migração para a v5
/// (estadia de hóspede) não pode perder nada do que já estava lá.
void main() {
  test('v4 → v5: tickets e tarifas preservados, tabelas e colunas novas criadas',
      () async {
    final ddl = File('test/fixtures/schema_v4.sql').readAsStringSync();
    final executor = NativeDatabase.memory(setup: (raw) {
      for (final stmt in ddl.split(';\n')) {
        if (stmt.trim().isNotEmpty) raw.execute(stmt);
      }
      raw.execute(
          "INSERT INTO tickets (id, operacao_id, placa, tipo_veiculo, entrada_epoch, operador_id, criado_em, atualizado_em) "
          "VALUES ('t1', 'p1', 'ABC1D23', 'carro', 1, 'op1', 1, 1)");
      raw.execute(
          "INSERT INTO tarifas (id, operacao_id, tipo_veiculo, fracao_inicial_minutos, fracao_inicial_valor, fracao_adicional_minutos, fracao_adicional_valor, teto_diaria, tolerancia_minutos, pernoite_valor, pernoite_hora_inicio, pernoite_hora_fim, vigencia_inicio_epoch) "
          "VALUES ('tar1', 'p1', 'carro', 60, 10, 60, 5, 60, 10, 0, 22, 6, 0)");
      raw.execute('PRAGMA user_version = 4');
    });
    final db = AppDatabase.forTesting(executor);

    final ticket = await db.ticketsDao.getById('t1');
    expect(ticket, isNotNull, reason: 'ticket do v4 sobrevive');
    expect(ticket!.estadiaId, isNull);

    final tarifas = await db.operacaoDao.getTarifasByOperacaoId('p1');
    expect(tarifas.single.modalidade, 'avulso',
        reason: 'tarifa antiga vira avulso pelo default');

    // Tabelas novas existem e aceitam escrita.
    await db.estadiasDao.inserirEstadia(EstadiasCompanion.insert(
      id: 'e1',
      operacaoId: 'p1',
      placa: 'ABC1D23',
      tipoVeiculo: 'carro',
      tarifaId: 'tarH',
      diariaValor: 30,
      diariaHoras: 24,
      inicioEpoch: 0,
      validaAteEpoch: 86400000,
      diarias: 1,
      valorTotal: 30,
      criadoEm: 0,
      atualizadoEm: 0,
    ));
    expect(await db.estadiasDao.getEstadia('e1'), isNotNull);

    final versao = await db.customSelect('PRAGMA user_version').getSingle();
    expect(versao.read<int>('user_version'), 5);
    await db.close();
  });
}
