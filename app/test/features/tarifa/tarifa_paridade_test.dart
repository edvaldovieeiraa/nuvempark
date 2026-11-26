import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';
import 'package:nuvempark_app/features/tarifa/domain/fare_result.dart';
import 'package:nuvempark_app/features/tarifa/domain/regra_horario.dart';
import 'package:nuvempark_app/features/tarifa/domain/tarifa_engine.dart';

/// Contrato com a API e o painel: os MESMOS casos de `testdata/tarifa-casos.json`
/// rodam nos três motores. Valores esperados foram calculados à mão a partir
/// do spec — se um caso falhar, o bug está no motor, nunca no arquivo.
void main() {
  final arquivo = File('../testdata/tarifa-casos.json');
  final dados = jsonDecode(arquivo.readAsStringSync()) as Map<String, dynamic>;
  final regras = dados['regras'] as Map<String, dynamic>;
  final tarifas = dados['tarifas'] as Map<String, dynamic>;

  TarifaConfig montar(Map<String, dynamic> t) {
    num n(String k) => t[k] as num;
    final lista = [
      for (final chave in (t['regras'] as List)) regras[chave],
    ];
    return TarifaConfig(
      id: 't',
      operacaoId: 'p',
      nome: 'Teste',
      tipoVeiculo: 'carro',
      ordem: 0,
      visivelOperador: true,
      fracaoInicialMinutos: n('fracao_inicial_minutos').toInt(),
      fracaoInicialValor: n('fracao_inicial_valor').toDouble(),
      fracaoAdicionalMinutos: n('fracao_adicional_minutos').toInt(),
      fracaoAdicionalValor: n('fracao_adicional_valor').toDouble(),
      tetoDiaria: n('teto_diaria').toDouble(),
      toleranciaMinutos: n('tolerancia_minutos').toInt(),
      pernoiteValor: n('pernoite_valor').toDouble(),
      pernoiteHoraInicio: n('pernoite_hora_inicio').toInt(),
      pernoiteHoraFim: n('pernoite_hora_fim').toInt(),
      vigenciaInicio: DateTime(2020),
      regras: RegraHorario.listaDoJson(lista),
    );
  }

  for (final caso in (dados['casos'] as List).cast<Map<String, dynamic>>()) {
    test(caso['nome'] as String, () {
      final r = TarifaEngine.calcular(
        entrada: DateTime.parse(caso['entrada'] as String),
        saida: DateTime.parse(caso['saida'] as String),
        tarifa: montar(tarifas[caso['tarifa']] as Map<String, dynamic>),
      );
      final e = caso['esperado'] as Map<String, dynamic>;

      expect((r.valor * 100).round(), e['centavos'], reason: 'total');
      expect(r.motivo.name, e['motivo'], reason: 'motivo');
      expect(r.duracaoMinutos, e['minutos'], reason: 'minutos da estadia');

      final esperados = (e['trechos'] as List).cast<Map<String, dynamic>>();
      expect(r.trechos.length, esperados.length, reason: 'quantidade de trechos');
      for (var i = 0; i < esperados.length; i++) {
        final t = r.trechos[i];
        final x = esperados[i];
        expect(t.inicio.isAtSameMomentAs(DateTime.parse(x['inicio'] as String)), isTrue,
            reason: 'trecho $i início: ${t.inicio.toUtc()}');
        expect(t.fim.isAtSameMomentAs(DateTime.parse(x['fim'] as String)), isTrue,
            reason: 'trecho $i fim: ${t.fim.toUtc()}');
        expect(t.regraNome, x['regra'], reason: 'trecho $i regra');
        expect(t.minutos, x['minutos'], reason: 'trecho $i minutos');
        expect(t.centavos, x['centavos'], reason: 'trecho $i centavos');
      }
    });
  }

  test('o motivo "trechos" não existe: os motivos continuam os de hoje', () {
    expect(FareMotivo.values.map((m) => m.name),
        containsAll(['tolerancia', 'normal', 'tetoDiaria', 'pernoite']));
  });
}
