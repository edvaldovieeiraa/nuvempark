import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/patio/domain/patio_model.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';
import 'package:nuvempark_app/features/tarifa/domain/regra_horario.dart';

RegraHorario _regra({int requer = 1}) => RegraHorario(
      id: 'r',
      nome: 'Noturno',
      dias: const {1, 2, 3, 4, 5, 6, 7},
      inicioMinutos: 18 * 60,
      fimMinutos: 6 * 60,
      cobrarDoInicio: true,
      degraus: const [DegrauPreco(ateMinutos: 720, centavos: 2000)],
      adicionalMinutos: 60,
      adicionalCentavos: 0,
      requer: requer,
    );

TarifaConfig _tarifa(String id, {List<RegraHorario> regras = const [], String modalidade = 'avulso', String? atraso}) =>
    TarifaConfig(
      id: id,
      operacaoId: 'p1',
      nome: id,
      tipoVeiculo: 'carro',
      ordem: 0,
      visivelOperador: true,
      fracaoInicialMinutos: 15,
      fracaoInicialValor: 5,
      fracaoAdicionalMinutos: 15,
      fracaoAdicionalValor: 3,
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
      regras: regras,
    );

PatioModel _patio(List<TarifaConfig> tarifas) => PatioModel(
      id: 'p1',
      nome: 'Pátio',
      codigo: 'P1',
      qtdVagas: 10,
      tiposVeiculo: const ['carro'],
      formasPagamento: const ['dinheiro'],
      motivosIsencao: const [],
      motivosCancelamento: const [],
      ticketCabecalho: const [],
      ticketRodape: const [],
      tarifas: tarifas,
      sincronizadoEm: DateTime(2026),
    );

void main() {
  test('tabela com regras v1 é cobrável normalmente', () {
    final p = _patio([_tarifa('carro', regras: [_regra()])]);
    expect(p.tabelasVisiveis('carro').map((t) => t.id), ['carro']);
    expect(p.tarifasVigentes('carro').map((t) => t.id), ['carro']);
    expect(p.temTabelaQueExigeAppNovo('carro'), isFalse);
  });

  test('tabela com regra de app mais novo sai de todas as listas', () {
    final p = _patio([
      _tarifa('nova', regras: [_regra(requer: 2)]),
      _tarifa('moto'),
    ]);
    expect(p.tabelasVisiveis('carro').map((t) => t.id), ['moto']);
    expect(p.tarifasVigentes('carro').map((t) => t.id), ['moto']);
    expect(p.tabelasEntrada('carro').map((t) => t.id), ['moto']);
    expect(p.temTabelaQueExigeAppNovo('carro'), isTrue);
  });

  test('atraso de hóspede nunca cobra por tabela que exige app mais novo', () {
    final hosp = _tarifa('hosp', modalidade: 'hospede', atraso: 'nova');
    final p = _patio([_tarifa('nova', regras: [_regra(requer: 2)]), hosp]);
    expect(p.tarifaAtraso(hosp), isNull, reason: 'sem outra avulsa: diárias inteiras');
  });
}
