import '../../patio/domain/tarifa_config.dart';
import 'fare_result.dart';

/// Motor de cálculo de tarifa — puro Dart, sem I/O.
///
/// Regras (em ordem de precedência):
///  1. Tolerância  → R$ 0,00
///  2. Pernoite    → tarifa.pernoiteValor
///  3. Normal      → fração inicial + frações adicionais (arredondadas pra cima)
///  4. Teto diária → substituído por tarifa.tetoDiaria quando excedido
abstract final class TarifaEngine {
  /// Calcula o valor a cobrar dada uma entrada, saída e configuração de tarifa.
  static FareResult calcular({
    required DateTime entrada,
    required DateTime saida,
    required TarifaConfig tarifa,
  }) {
    assert(!saida.isBefore(entrada), 'saida deve ser igual ou posterior à entrada');
    assert(tarifa.fracaoAdicionalMinutos > 0, 'fracaoAdicionalMinutos deve ser > 0');

    final duracaoMinutos = saida.difference(entrada).inMinutes;

    // ── 1. Tolerância ───────────────────────────────────────────────────────
    if (duracaoMinutos <= tarifa.toleranciaMinutos) {
      return FareResult(
        valor: 0.0,
        duracaoMinutos: duracaoMinutos,
        motivo: FareMotivo.tolerancia,
      );
    }

    // ── 2. Pernoite ─────────────────────────────────────────────────────────
    // valor 0 = regra DESLIGADA (sem isto, atravessar a madrugada sairia grátis)
    if (tarifa.pernoiteValor > 0 && _isPernoite(entrada, saida, tarifa)) {
      return FareResult(
        valor: tarifa.pernoiteValor,
        duracaoMinutos: duracaoMinutos,
        motivo: FareMotivo.pernoite,
      );
    }

    // ── 3. Tarifa normal ────────────────────────────────────────────────────
    final double valorNormal;
    if (duracaoMinutos <= tarifa.fracaoInicialMinutos) {
      valorNormal = tarifa.fracaoInicialValor;
    } else {
      final minutosAdicionais = duracaoMinutos - tarifa.fracaoInicialMinutos;
      final fracoesAdicionais =
          (minutosAdicionais / tarifa.fracaoAdicionalMinutos).ceil();
      valorNormal =
          tarifa.fracaoInicialValor + fracoesAdicionais * tarifa.fracaoAdicionalValor;
    }

    // ── 4. Teto diária ──────────────────────────────────────────────────────
    // teto 0 = regra DESLIGADA (sem isto, TODA cobrança viraria R$ 0)
    if (tarifa.tetoDiaria > 0 && valorNormal >= tarifa.tetoDiaria) {
      return FareResult(
        valor: tarifa.tetoDiaria,
        duracaoMinutos: duracaoMinutos,
        motivo: FareMotivo.tetoDiaria,
      );
    }

    return FareResult(
      valor: valorNormal,
      duracaoMinutos: duracaoMinutos,
      motivo: FareMotivo.normal,
    );
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  /// Retorna true se a estadia abrangeu pelo menos uma janela de pernoite.
  ///
  /// Janela de pernoite: de [pernoiteHoraInicio]:00 do dia D até
  /// [pernoiteHoraFim]:00 do dia D+1.
  static bool _isPernoite(
    DateTime entrada,
    DateTime saida,
    TarifaConfig tarifa,
  ) {
    // Normalizar para meia-noite do dia da entrada
    var diaNormalizado = DateTime(entrada.year, entrada.month, entrada.day);
    final diaFim = DateTime(saida.year, saida.month, saida.day);

    while (!diaNormalizado.isAfter(diaFim)) {
      final inicioJanela =
          diaNormalizado.add(Duration(hours: tarifa.pernoiteHoraInicio));
      // O fim da janela cai sempre no dia seguinte (ex: 06:00 de D+1)
      final fimJanela =
          diaNormalizado.add(Duration(hours: tarifa.pernoiteHoraFim + 24));

      if (!entrada.isAfter(inicioJanela) && !saida.isBefore(fimJanela)) {
        return true;
      }

      diaNormalizado = diaNormalizado.add(const Duration(days: 1));
    }
    return false;
  }
}
