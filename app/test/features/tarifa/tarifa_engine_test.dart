import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';
import 'package:nuvempark_app/features/tarifa/domain/fare_result.dart';
import 'package:nuvempark_app/features/tarifa/domain/tarifa_engine.dart';

void main() {
  // Tarifa padrão usada em todos os cenários.
  // fracao_inicial: 15 min / R$ 5,00
  // fracao_adicional: 15 min / R$ 3,00
  // teto_diaria: R$ 60,00
  // tolerancia: 10 min
  // pernoite: R$ 25,00 | 22h–06h
  final tarifa = TarifaConfig(
    id: 'test-tarifa',
    operacaoId: 'op-zz',
    nome: 'Padrão',
    tipoVeiculo: 'carro',
    ordem: 0,
    visivelOperador: true,
    fracaoInicialMinutos: 15,
    fracaoInicialValor: 5.00,
    fracaoAdicionalMinutos: 15,
    fracaoAdicionalValor: 3.00,
    tetoDiaria: 60.00,
    toleranciaMinutos: 10,
    pernoiteValor: 25.00,
    pernoiteHoraInicio: 22,
    pernoiteHoraFim: 6,
    vigenciaInicio: DateTime.utc(2020),
    vigenciaFim: null,
  );

  // Dia base para testes sem pernoite
  final diaBase = DateTime(2024, 1, 15);

  group('TarifaEngine', () {
    test('Cenário 1 — dentro da tolerância (8 min) → R\$ 0,00', () {
      final entrada = diaBase.add(const Duration(hours: 10));
      final saida = diaBase.add(const Duration(hours: 10, minutes: 8));

      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: saida,
        tarifa: tarifa,
      );

      expect(result.motivo, FareMotivo.tolerancia);
      expect(result.valor, closeTo(0.00, 0.001));
      expect(result.duracaoMinutos, 8);
    });

    test('Cenário 2 — fração inicial exata (15 min) → R\$ 5,00', () {
      final entrada = diaBase.add(const Duration(hours: 10));
      final saida = diaBase.add(const Duration(hours: 10, minutes: 15));

      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: saida,
        tarifa: tarifa,
      );

      expect(result.motivo, FareMotivo.normal);
      expect(result.valor, closeTo(5.00, 0.001));
    });

    test('Cenário 3 — inicial + 1 adicional (30 min) → R\$ 8,00', () {
      final entrada = diaBase.add(const Duration(hours: 10));
      final saida = diaBase.add(const Duration(hours: 10, minutes: 30));

      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: saida,
        tarifa: tarifa,
      );

      expect(result.motivo, FareMotivo.normal);
      expect(result.valor, closeTo(8.00, 0.001)); // 5 + 1×3
    });

    test('Cenário 4 — inicial + 3 adicionais (60 min) → R\$ 14,00', () {
      final entrada = diaBase.add(const Duration(hours: 10));
      final saida = diaBase.add(const Duration(hours: 11));

      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: saida,
        tarifa: tarifa,
      );

      expect(result.motivo, FareMotivo.normal);
      expect(result.valor, closeTo(14.00, 0.001)); // 5 + 3×3
    });

    test('Cenário 5 — fração adicional parcial (35 min) → R\$ 11,00', () {
      // 35 min = 15 inicial + 20 adicionais; ceil(20/15) = 2 frações
      final entrada = diaBase.add(const Duration(hours: 10));
      final saida = diaBase.add(const Duration(hours: 10, minutes: 35));

      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: saida,
        tarifa: tarifa,
      );

      expect(result.motivo, FareMotivo.normal);
      expect(result.valor, closeTo(11.00, 0.001)); // 5 + 2×3
    });

    test('Cenário 6 — teto diária (10 h = 600 min) → R\$ 60,00', () {
      // Normal seria 5 + ceil(585/15)×3 = 122,00 → aplica teto
      final entrada = diaBase.add(const Duration(hours: 8));
      final saida = diaBase.add(const Duration(hours: 18));

      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: saida,
        tarifa: tarifa,
      );

      expect(result.motivo, FareMotivo.tetoDiaria);
      expect(result.valor, closeTo(60.00, 0.001));
    });

    test('Cenário 7 — pernoite (20h → 08h do dia seguinte) → R\$ 25,00', () {
      // Janela: 22h de D até 06h de D+1.
      // Entrada 20h ≤ 22h e saída 08h ≥ 06h → pernoite
      final entrada = DateTime(2024, 1, 15, 20, 0);
      final saida = DateTime(2024, 1, 16, 8, 0);

      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: saida,
        tarifa: tarifa,
      );

      expect(result.motivo, FareMotivo.pernoite);
      expect(result.valor, closeTo(25.00, 0.001));
    });
  });

  // Tarifa idêntica à padrão, mas com tolerância parametrizável — para exercer o
  // gate de tolerância com precisão de segundos.
  TarifaConfig tarifaCom({required int toleranciaMinutos}) => TarifaConfig(
        id: 'test-tarifa',
        operacaoId: 'op-zz',
        nome: 'Padrão',
        tipoVeiculo: 'carro',
        ordem: 0,
        visivelOperador: true,
        fracaoInicialMinutos: 15,
        fracaoInicialValor: 5.00,
        fracaoAdicionalMinutos: 15,
        fracaoAdicionalValor: 3.00,
        tetoDiaria: 60.00,
        toleranciaMinutos: toleranciaMinutos,
        pernoiteValor: 25.00,
        pernoiteHoraInicio: 22,
        pernoiteHoraFim: 6,
        vigenciaInicio: DateTime.utc(2020),
        vigenciaFim: null,
      );

  group('TarifaEngine — tolerância em segundos (fix 2026-07)', () {
    final entrada = diaBase.add(const Duration(hours: 10));

    test('reproduz o bug: tolerância 0 + estadia 30s → cobra fração inicial', () {
      // No código antigo (floor p/ minutos) isto saía R\$ 0,00 (0min ≤ 0min).
      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: entrada.add(const Duration(seconds: 30)),
        tarifa: tarifaCom(toleranciaMinutos: 0),
      );

      expect(result.motivo, FareMotivo.normal);
      expect(result.valor, closeTo(5.00, 0.001));
    });

    test('tolerância 0 + estadia 1s → cobra fração inicial', () {
      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: entrada.add(const Duration(seconds: 1)),
        tarifa: tarifaCom(toleranciaMinutos: 0),
      );

      expect(result.motivo, FareMotivo.normal);
      expect(result.valor, closeTo(5.00, 0.001));
    });

    test('tolerância 0 + estadia 0s → gratuito (limite inclusivo)', () {
      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: entrada,
        tarifa: tarifaCom(toleranciaMinutos: 0),
      );

      expect(result.motivo, FareMotivo.tolerancia);
      expect(result.valor, closeTo(0.00, 0.001));
    });

    test('tolerância 10 + estadia exatamente 600s → gratuito (≤ inclusivo)', () {
      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: entrada.add(const Duration(seconds: 600)),
        tarifa: tarifaCom(toleranciaMinutos: 10),
      );

      expect(result.motivo, FareMotivo.tolerancia);
      expect(result.valor, closeTo(0.00, 0.001));
    });

    test('tolerância 10 + estadia 601s → cobra (antes saía grátis pelo floor)', () {
      // Mudança DELIBERADA: 10min01s (601s) antes truncava p/ 10min → grátis.
      // Agora 601s > 600s → cobra a fração inicial.
      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: entrada.add(const Duration(seconds: 601)),
        tarifa: tarifaCom(toleranciaMinutos: 10),
      );

      expect(result.motivo, FareMotivo.normal);
      expect(result.valor, closeTo(5.00, 0.001));
    });

    test('tolerância 10 + estadia 630s → cobra fração inicial', () {
      // 630s = 10min30s → passa o gate; 10min < 15min da fração inicial.
      final result = TarifaEngine.calcular(
        entrada: entrada,
        saida: entrada.add(const Duration(seconds: 630)),
        tarifa: tarifaCom(toleranciaMinutos: 10),
      );

      expect(result.motivo, FareMotivo.normal);
      expect(result.valor, closeTo(5.00, 0.001));
    });
  });
}
