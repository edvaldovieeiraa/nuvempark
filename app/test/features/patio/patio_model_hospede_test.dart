import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/patio/domain/patio_model.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';

TarifaConfig _tarifa(
  String id, {
  String tipo = 'carro',
  int ordem = 0,
  String modalidade = 'avulso',
  bool visivel = true,
  String? atraso,
}) =>
    TarifaConfig(
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
      tarifaAtrasoId: atraso,
    );

PatioModel _patio(List<TarifaConfig> tarifas) => PatioModel(
      id: 'p1',
      nome: 'Pátio',
      codigo: 'P1',
      qtdVagas: 10,
      tiposVeiculo: const ['carro', 'moto'],
      formasPagamento: const ['dinheiro', 'pix'],
      motivosIsencao: const [],
      motivosCancelamento: const [],
      ticketCabecalho: const [],
      ticketRodape: const [],
      tarifas: tarifas,
      sincronizadoEm: DateTime(2026),
    );

void main() {
  // Hóspede com a MENOR ordem: é o caso que pegaria o operador desprevenido.
  final hospede = _tarifa('hosp', ordem: 0, modalidade: 'hospede', atraso: 'noturna');
  final padrao = _tarifa('padrao', ordem: 1);
  final noturna = _tarifa('noturna', ordem: 2);
  final moto = _tarifa('moto', tipo: 'moto', ordem: 0);
  final patio = _patio([hospede, padrao, noturna, moto]);

  test('saída e cálculo avulso nunca veem a tabela de hóspede', () {
    expect(patio.tabelasVisiveis('carro').map((t) => t.id), ['padrao', 'noturna']);
    expect(patio.tarifasVigentes('carro').map((t) => t.id), ['padrao', 'noturna']);
  });

  test('a entrada oferece avulsas primeiro e hóspede depois', () {
    expect(patio.tabelasEntrada('carro').map((t) => t.id), ['padrao', 'noturna', 'hosp']);
  });

  test('tabela do atraso: a configurada', () {
    expect(patio.tarifaAtraso(hospede)?.id, 'noturna');
  });

  test('tabela do atraso: sem configuração, a primeira avulsa visível do tipo', () {
    final semAtraso = _tarifa('h2', modalidade: 'hospede');
    expect(patio.tarifaAtraso(semAtraso)?.id, 'padrao');
  });

  test('tabela do atraso: configurada mas inexistente cai na primeira avulsa', () {
    final apagada = _tarifa('h3', modalidade: 'hospede', atraso: 'sumiu');
    expect(patio.tarifaAtraso(apagada)?.id, 'padrao');
  });

  test('tabela do atraso: nenhuma avulsa do tipo → null', () {
    final hospMoto = _tarifa('hm', tipo: 'moto', modalidade: 'hospede');
    final soHospede = _patio([hospMoto]);
    expect(soHospede.tarifaAtraso(hospMoto), isNull);
  });

  test('isHospede', () {
    expect(hospede.isHospede, isTrue);
    expect(padrao.isHospede, isFalse);
  });
}
