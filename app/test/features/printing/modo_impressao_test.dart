import 'dart:convert';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/patio/data/bootstrap_repository.dart';
import 'package:nuvempark_app/features/patio/domain/patio_model.dart';
import 'package:nuvempark_app/features/printing/domain/modo_impressao.dart';

import '../../support/fakes.dart';

/// Bootstrap de verdade → cache no Drift → modelo, como o app faz.
Future<PatioModel> _viaBootstrap(Map<String, dynamic> config) async {
  final db = AppDatabase.forTesting(NativeDatabase.memory());
  addTearDown(db.close);
  final payload = bootstrapPayload()..['config'] = config;
  await BootstrapRepository(
    dio: fakeDio((_) => jsonResponse(payload)),
    db: db,
  ).sincronizar('p1');
  final cache = (await db.operacaoDao.getCacheByOperacaoId('p1'))!;
  return PatioModel.fromCache(
    id: cache.operacaoId,
    nome: cache.nome,
    codigo: cache.codigo,
    qtdVagas: cache.qtdVagas,
    config: jsonDecode(cache.configJson) as Map<String, dynamic>,
    tarifas: const [],
    sincronizadoEm: DateTime.fromMillisecondsSinceEpoch(cache.sincronizadoEm),
  );
}

void main() {
  group('ModoImpressao.parse', () {
    test('lê os três valores do painel', () {
      expect(ModoImpressao.parse('automatica'), ModoImpressao.automatica);
      expect(ModoImpressao.parse('perguntar'), ModoImpressao.perguntar);
      expect(ModoImpressao.parse('desativada'), ModoImpressao.desativada);
    });

    test('ausente ou desconhecido imprime, como sempre foi', () {
      expect(ModoImpressao.parse(null), ModoImpressao.automatica);
      expect(ModoImpressao.parse('qualquer'), ModoImpressao.automatica);
      expect(ModoImpressao.parse(true), ModoImpressao.automatica);
    });
  });

  group('modos de impressão dos recibos no pátio', () {
    test('os três chegam do bootstrap até o modelo', () async {
      final p = await _viaBootstrap({
        'recibo_saida_modo': 'desativada',
        'recibo_estadia_modo': 'perguntar',
        'recibo_caixa_modo': 'desativada',
      });
      expect(p.reciboSaidaModo, ModoImpressao.desativada);
      expect(p.reciboEstadiaModo, ModoImpressao.perguntar);
      expect(p.reciboCaixaModo, ModoImpressao.desativada);
    });

    test('API antiga (sem os campos): tudo automático', () async {
      final p = await _viaBootstrap({});
      expect(p.reciboSaidaModo, ModoImpressao.automatica);
      expect(p.reciboEstadiaModo, ModoImpressao.automatica);
      expect(p.reciboCaixaModo, ModoImpressao.automatica);
    });
  });
}
