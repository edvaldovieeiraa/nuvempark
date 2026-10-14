import '../../patio/domain/tarifa_config.dart';
import 'fare_result.dart';

/// Motor de cálculo de tarifa — puro Dart, sem I/O.
///
/// Regras (em ordem de precedência):
///  1. Tolerância  → R$ 0,00
///  2. Pernoite    → tarifa.pernoiteValor
///  3. Normal      → fração inicial + frações adicionais (arredondadas pra cima)
///  4. Teto diária → substituído por tarifa.tetoDiaria quando excedido
///
/// Acima de 24 h, com teto ou pernoite ligados, a estadia é dividida em blocos
/// de 24 h corridas desde a entrada; cada bloco e a sobra final passam pelas
/// regras 1–4 e os valores são somados (motivo `diarias`). Sem teto nem
/// pernoite as frações já cobram o tempo todo, então não divide.
abstract final class TarifaEngine {
  static const _periodo = Duration(hours: 24);

  /// Calcula o valor a cobrar dada uma entrada, saída e configuração de tarifa.
  static FareResult calcular({
    required DateTime entrada,
    required DateTime saida,
    required TarifaConfig tarifa,
  }) {
    assert(!saida.isBefore(entrada), 'saida deve ser igual ou posterior à entrada');
    assert(tarifa.fracaoAdicionalMinutos > 0, 'fracaoAdicionalMinutos deve ser > 0');

    final cobraPorPeriodo = tarifa.tetoDiaria > 0 || tarifa.pernoiteValor > 0;
    if (!cobraPorPeriodo || saida.difference(entrada) <= _periodo) {
      return _calcularPeriodo(entrada, saida, tarifa);
    }

    var inicio = entrada;
    var valor = 0.0;
    while (saida.difference(inicio) > _periodo) {
      final fim = inicio.add(_periodo);
      valor += _calcularPeriodo(inicio, fim, tarifa).valor;
      inicio = fim;
    }
    valor += _calcularPeriodo(inicio, saida, tarifa).valor;

    return FareResult(
      valor: valor,
      duracaoMinutos: saida.difference(entrada).inMinutes,
      motivo: FareMotivo.diarias,
    );
  }

  /// Regras 1–4 aplicadas a um intervalo de até 24 h (ou a qualquer intervalo
  /// quando a tarifa não tem teto nem pernoite).
  static FareResult _calcularPeriodo(
    DateTime entrada,
    DateTime saida,
    TarifaConfig tarifa,
  ) {
    final duracao = saida.difference(entrada);
    final duracaoSegundos = duracao.inSeconds;
    // Frações/pernoite/teto seguem em MINUTOS (regra original inalterada).
    final duracaoMinutos = duracao.inMinutes;

    // ── 1. Tolerância ───────────────────────────────────────────────────────
    // Tolerância comparada em segundos (fix 2026-07: estadia < 1min com
    // tolerância 0 saía grátis pelo floor de inMinutes). Mantém o `<=` inclusivo.
    if (duracaoSegundos <= tarifa.toleranciaMinutos * 60) {
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
