import 'dart:convert';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/patio/data/bootstrap_repository.dart';
import 'package:nuvempark_app/features/patio/domain/patio_model.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';

import '../../support/fakes.dart';

TarifaConfig _tarifa(
  String id, {
  String tipo = 'carro',
  int ordem = 0,
  String modalidade = 'avulso',
  bool visivel = true,
}) => TarifaConfig(
  id: id,
  operacaoId: 'p1',
  nome: id,
  tipoVeiculo: tipo,
  ordem: ordem,
  visivelOperador: visivel,
  fracaoInicialMinutos: 60,
  fracaoInicialValor: 10,
  fracaoAdicionalMinutos: 60,
  fracaoAdicionalValor: 5,
  tetoDiaria: 60,
  toleranciaMinutos: 10,
  pernoiteValor: 0,
  pernoiteHoraInicio: 22,
  pernoiteHoraFim: 6,
  vigenciaInicio: DateTime(2020),
  modalidade: modalidade,
  diariaValor: modalidade == 'hospede' ? 30 : null,
  diariaHoras: modalidade == 'hospede' ? 24 : null,
);

PatioModel _patio({
  List<String> tipos = const ['carro', 'moto'],
  List<TarifaConfig> tarifas = const [],
  Map<String, dynamic> config = const {},
}) => PatioModel.fromCache(
  id: 'p1',
  nome: 'Pátio',
  codigo: 'P1',
  qtdVagas: 10,
  config: {'tipos_veiculo': tipos, ...config},
  tarifas: tarifas,
  sincronizadoEm: DateTime(2026),
);

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
  group('flags do modo rápido', () {
    test('a liberação chega do bootstrap até o modelo', () async {
      final p = await _viaBootstrap({'modo_rapido_entrada': true});
      expect(p.modoRapidoEntrada, isTrue);
    });

    test('API antiga (sem o campo): desligado', () async {
      final p = await _viaBootstrap({});
      expect(p.modoRapidoEntrada, isFalse);
    });

    test(
      'a impressão do painel não entra mais no cache: é de cada celular',
      () async {
        final db = AppDatabase.forTesting(NativeDatabase.memory());
        addTearDown(db.close);
        final payload = bootstrapPayload()
          ..['config'] = {
            'modo_rapido_entrada': true,
            'modo_rapido_imprime': false,
          };
        await BootstrapRepository(
          dio: fakeDio((_) => jsonResponse(payload)),
          db: db,
        ).sincronizar('p1');
        final cache = (await db.operacaoDao.getCacheByOperacaoId('p1'))!;
        final config = jsonDecode(cache.configJson) as Map<String, dynamic>;
        expect(config.containsKey('modo_rapido_imprime'), isFalse);
      },
    );

    test('a fábrica mantém o que já lia do cache', () {
      final p = _patio(
        config: {
          'formas_pagamento': ['dinheiro'],
          'foto_recibo_modo': 'operador',
          'modo_quiosque': false,
        },
      );
      expect(p.tiposVeiculo, ['carro', 'moto']);
      expect(p.formasPagamento, ['dinheiro']);
      expect(p.fotoReciboModo, 'operador');
      expect(p.modoQuiosque, isFalse);
      expect(
        p.motivosIsencao,
        isEmpty,
        reason: 'chave ausente vira lista vazia',
      );
    });
  });

  group('tipo e tabela padrão (a regra que a entrada já usa)', () {
    test('tipo padrão é o primeiro da ordem do painel', () {
      expect(_patio(tipos: ['moto', 'carro']).tipoPadrao, 'moto');
      expect(_patio(tipos: []).tipoPadrao, isNull);
    });

    test(
      'tabela padrão é a primeira AVULSA visível do tipo, nunca a de hóspede',
      () {
        final p = _patio(
          tarifas: [
            _tarifa('hosp', modalidade: 'hospede', ordem: 0),
            _tarifa('b', ordem: 2),
            _tarifa('a', ordem: 1),
            _tarifa('oculta', ordem: 0, visivel: false),
            _tarifa('moto', tipo: 'moto', ordem: 0),
          ],
        );
        expect(p.tabelaAvulsaPadrao('carro')?.id, 'a');
      },
    );

    test('tabela "ambos" atende o tipo', () {
      final p = _patio(tarifas: [_tarifa('geral', tipo: PatioModel.tipoAmbos)]);
      expect(p.tabelaAvulsaPadrao('carro')?.id, 'geral');
    });

    test('sem tabela avulsa para o tipo: null', () {
      final p = _patio(tarifas: [_tarifa('hosp', modalidade: 'hospede')]);
      expect(p.tabelaAvulsaPadrao('carro'), isNull);
    });
  });
}
