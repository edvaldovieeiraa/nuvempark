import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/estadias/domain/estadia_engine.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';
import 'package:nuvempark_app/features/tarifa/domain/regra_horario.dart';
import 'package:nuvempark_app/features/vouchers/domain/voucher_engine.dart';
import 'package:nuvempark_app/features/vouchers/domain/voucher_regra.dart';

// Mesmas regras do arquivo de casos: Comercial só o trecho (seg–sex 08–18,
// até 1h R$ 10, até 2h R$ 15, +R$ 5/30 min) e Noturno (todo dia 18–06,
// estadia inteira, até 12h R$ 20, depois nada).
const _comercial = RegraHorario(
  id: 'r-com',
  nome: 'Comercial',
  dias: {1, 2, 3, 4, 5},
  inicioMinutos: 8 * 60,
  fimMinutos: 18 * 60,
  cobrarDoInicio: false,
  degraus: [
    DegrauPreco(ateMinutos: 60, centavos: 1000),
    DegrauPreco(ateMinutos: 120, centavos: 1500),
  ],
  adicionalMinutos: 30,
  adicionalCentavos: 500,
);
const _noturno = RegraHorario(
  id: 'r-not',
  nome: 'Noturno',
  dias: {1, 2, 3, 4, 5, 6, 7},
  inicioMinutos: 18 * 60,
  fimMinutos: 6 * 60,
  cobrarDoInicio: true,
  degraus: [DegrauPreco(ateMinutos: 720, centavos: 2000)],
  adicionalMinutos: 60,
  adicionalCentavos: 0,
);

final _tarifa = TarifaConfig(
  id: 'carro',
  operacaoId: 'p1',
  nome: 'Carro',
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
  regras: const [_comercial, _noturno],
);

DateTime _t(String hhmm) => DateTime.parse('2026-11-24T$hhmm:00-03:00'); // terça

void main() {
  test('voucher que abate minutos: a entrada deslocada decide a regra', () {
    final r = VoucherEngine.aplicar(
      entrada: _t('17:30'),
      saida: _t('19:00'),
      tarifa: _tarifa,
      regra: const VoucherRegra(id: 'v', nome: '1h grátis', abaterMinutos: 60),
      parceiroNome: 'Loja',
    );
    // Sem voucher: Comercial 17:30–18:00 (R$ 10) + Noturno 18:00–19:00 (R$ 20).
    expect(r.semVoucher.valor, 30);
    // Com 1h abatida o carro "entra" às 18:30, dentro do Noturno, que cobra
    // a estadia inteira: R$ 20.
    expect(r.valorFinal, 20);
  });

  test('atraso de hóspede pela tabela avulsa com regras, limitado à diária', () {
    // Venceu às 17:00, saiu às 20:00 (um bloco de 3h < 24h).
    final r = EstadiaEngine.atraso(
      validaAte: _t('17:00'),
      saida: _t('20:00'),
      diariaValor: 50,
      diariaHoras: 24,
      tarifaAtraso: _tarifa,
    );
    // Comercial 17–18 (R$ 10) + Noturno 18–20 (R$ 20) = R$ 30 < diária R$ 50.
    expect(r.valor, 30);
  });
}
