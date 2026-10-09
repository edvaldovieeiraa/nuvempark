import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/estadias/domain/estadia_engine.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';

/// Tabela avulsa dos exemplos da spec: 1ª hora R$ 10, + R$ 5/h, teto R$ 60,
/// tolerância 10 min, sem pernoite.
final padrao = TarifaConfig(
  id: 'padrao',
  operacaoId: 'p1',
  nome: 'Padrão',
  tipoVeiculo: 'carro',
  ordem: 0,
  visivelOperador: true,
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
);

const diaria = 30.0;
const horas = 24;
final vence = DateTime(2026, 10, 11, 14, 30);

void main() {
  group('contratação', () {
    test('3 diárias de R\$ 30 = R\$ 90, válida por 72 h', () {
      final inicio = DateTime(2026, 10, 8, 14, 30);
      final r = EstadiaEngine.contratacao(
          diarias: 3, diariaValor: diaria, diariaHoras: horas, inicio: inicio);
      expect(r.valor, 90);
      expect(r.validaAte, DateTime(2026, 10, 11, 14, 30));
    });

    test('mínimo de diárias que cobre desde um início no passado (conversão)', () {
      final entrada = DateTime(2026, 10, 9, 7, 10);
      expect(
          EstadiaEngine.minimoDiarias(
              inicio: entrada, agora: DateTime(2026, 10, 9, 10, 30), diariaHoras: horas),
          1);
      expect(
          EstadiaEngine.minimoDiarias(
              inicio: entrada, agora: DateTime(2026, 10, 10, 8, 0), diariaHoras: horas),
          2);
      expect(
          EstadiaEngine.minimoDiarias(
              inicio: entrada, agora: entrada, diariaHoras: horas),
          1,
          reason: 'nunca menos que 1');
      expect(
          EstadiaEngine.minimoDiarias(
              inicio: entrada,
              agora: entrada.add(const Duration(hours: 24)),
              diariaHoras: horas),
          2,
          reason: 'exatamente no limite, 1 diária venceria agora');
    });
  });

  group('atraso (regra 11)', () {
    AtrasoResult atraso(Duration d, {TarifaConfig? tarifa}) => EstadiaEngine.atraso(
          validaAte: vence,
          saida: vence.add(d),
          diariaValor: diaria,
          diariaHoras: horas,
          tarifaAtraso: tarifa,
        );

    test('2 h → R\$ 15 pela tabela avulsa', () {
      expect(atraso(const Duration(hours: 2), tarifa: padrao).valor, 15);
    });

    test('9 h → avulso daria R\$ 50, para em R\$ 30 (uma diária)', () {
      expect(atraso(const Duration(hours: 9), tarifa: padrao).valor, 30);
    });

    test('30 h → bloco de 24 h (R\$ 30) + 6 h (avulso R\$ 35 → R\$ 30) = R\$ 60', () {
      expect(atraso(const Duration(hours: 30), tarifa: padrao).valor, 60);
    });

    test('dentro da tolerância da tabela do atraso → R\$ 0', () {
      final r = atraso(const Duration(minutes: 8), tarifa: padrao);
      expect(r.valor, 0);
      expect(r.dentroTolerancia, isTrue);
    });

    test('24 h + 5 min: o resto cai na tolerância da tabela → só a diária', () {
      expect(atraso(const Duration(hours: 24, minutes: 5), tarifa: padrao).valor, 30);
    });

    test('sem tabela avulsa: cada período começado é uma diária', () {
      expect(atraso(const Duration(hours: 2)).valor, 30);
      expect(atraso(const Duration(hours: 25)).valor, 60);
    });

    test('saída antes do vencimento: sem atraso', () {
      final r = EstadiaEngine.atraso(
        validaAte: vence,
        saida: vence.subtract(const Duration(hours: 1)),
        diariaValor: diaria,
        diariaHoras: horas,
        tarifaAtraso: padrao,
      );
      expect(r.valor, 0);
      expect(r.minutos, 0);
      expect(r.vencida, isFalse);
    });
  });

  group('renovação (regra 14 / Revisão 2)', () {
    test('estadia válida: conta a partir do vencimento', () {
      final r = EstadiaEngine.renovacao(
        validaAte: vence,
        diariaHoras: horas,
        diariaValor: diaria,
        diarias: 2,
        agora: vence.subtract(const Duration(hours: 5)),
        carroDentro: true,
      );
      expect(r.base, vence);
      expect(r.novaValidaAte, vence.add(const Duration(hours: 48)));
      expect(r.valor, 60);
      expect(r.minimoDiarias, 1);
    });

    test('vencida com carro dentro: conta do vencimento antigo (cobre o atraso)', () {
      final r = EstadiaEngine.renovacao(
        validaAte: vence,
        diariaHoras: horas,
        diariaValor: diaria,
        diarias: 1,
        agora: vence.add(const Duration(hours: 5)),
        carroDentro: true,
      );
      expect(r.base, vence);
      expect(r.novaValidaAte, vence.add(const Duration(hours: 24)));
      expect(r.minimoDiarias, 1);
    });

    test('vencida com carro dentro há 30 h: exige 2 diárias', () {
      final r = EstadiaEngine.renovacao(
        validaAte: vence,
        diariaHoras: horas,
        diariaValor: diaria,
        diarias: 1,
        agora: vence.add(const Duration(hours: 30)),
        carroDentro: true,
      );
      expect(r.minimoDiarias, 2);
      expect(r.cobreAgora, isFalse, reason: '1 diária não cobre até agora');
    });

    test('vencida com carro fora: conta a partir de agora', () {
      final agora = vence.add(const Duration(hours: 19));
      final r = EstadiaEngine.renovacao(
        validaAte: vence,
        diariaHoras: horas,
        diariaValor: diaria,
        diarias: 1,
        agora: agora,
        carroDentro: false,
      );
      expect(r.base, agora);
      expect(r.novaValidaAte, agora.add(const Duration(hours: 24)));
      expect(r.minimoDiarias, 1);
    });
  });
}
