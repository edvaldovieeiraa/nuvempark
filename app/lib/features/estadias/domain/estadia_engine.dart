import 'dart:math' as math;

import '../../patio/domain/tarifa_config.dart';
import '../../tarifa/domain/tarifa_engine.dart';

/// Regras de dinheiro e de tempo da estadia de hóspede (spec estadia-hospede).
/// Puro, sem I/O — testável sem banco nem tela.
///
/// O atraso NÃO entra no TarifaEngine: ele usa o TarifaEngine por bloco e
/// aplica por cima o teto de uma diária de hóspede. Os ports do motor na API e
/// no painel ("tem que bater com o Dart") ficam intocados.
abstract final class EstadiaEngine {
  static ContratacaoResult contratacao({
    required int diarias,
    required double diariaValor,
    required int diariaHoras,
    required DateTime inicio,
  }) =>
      ContratacaoResult(
        valor: _dinheiro(diarias * diariaValor),
        validaAte: inicio.add(Duration(hours: diarias * diariaHoras)),
      );

  /// Menor nº de diárias que leva a validade, contada de [inicio], até depois
  /// de [agora]. Nunca menos que 1. Usado na conversão de um ticket avulso
  /// (início = entrada do carro) e na renovação com o carro dentro.
  static int minimoDiarias({
    required DateTime inicio,
    required DateTime agora,
    required int diariaHoras,
  }) {
    final decorrido = agora.difference(inicio);
    if (decorrido <= Duration.zero) return 1;
    // Períodos cheios já decorridos + o período em curso. Exatamente 24 h
    // depois dá 2: com 1 a validade terminaria no próprio instante.
    return decorrido.inMicroseconds ~/ Duration(hours: diariaHoras).inMicroseconds + 1;
  }

  /// Regra 11: o atraso é dividido em blocos do tamanho da diária; cada bloco
  /// custa o MENOR valor entre a tabela avulsa aplicada àquele bloco e uma
  /// diária de hóspede. Sem tabela avulsa, cada período começado é uma diária.
  static AtrasoResult atraso({
    required DateTime validaAte,
    required DateTime saida,
    required double diariaValor,
    required int diariaHoras,
    TarifaConfig? tarifaAtraso,
  }) {
    if (!saida.isAfter(validaAte)) {
      return const AtrasoResult(valor: 0, minutos: 0, dentroTolerancia: false);
    }
    final minutos = saida.difference(validaAte).inMinutes;

    if (tarifaAtraso == null) {
      final diarias = minimoDiarias(
          inicio: validaAte, agora: saida, diariaHoras: diariaHoras);
      return AtrasoResult(
        valor: _dinheiro(diarias * diariaValor),
        minutos: minutos,
        dentroTolerancia: false,
      );
    }

    if (minutos <= tarifaAtraso.toleranciaMinutos) {
      return AtrasoResult(valor: 0, minutos: minutos, dentroTolerancia: true);
    }

    final periodo = Duration(hours: diariaHoras);
    var inicioBloco = validaAte;
    var total = 0.0;
    while (inicioBloco.isBefore(saida)) {
      final fimCheio = inicioBloco.add(periodo);
      final fimBloco = fimCheio.isAfter(saida) ? saida : fimCheio;
      final avulso = TarifaEngine.calcular(
        entrada: inicioBloco,
        saida: fimBloco,
        tarifa: tarifaAtraso,
      ).valor;
      total += math.min(avulso, diariaValor);
      inicioBloco = fimBloco;
    }
    return AtrasoResult(
      valor: _dinheiro(total),
      minutos: minutos,
      dentroTolerancia: false,
    );
  }

  /// Regra 14: de onde a renovação conta.
  ///   • estadia válida → do vencimento atual;
  ///   • vencida com o carro dentro → do vencimento antigo (as diárias novas
  ///     cobrem o atraso; o mínimo é o que cobre até agora);
  ///   • vencida com o carro fora → de agora (o tempo fora não é cobrado).
  /// O servidor aplica a mesma base com `greatest(valida_ate, base)` (db/41).
  static RenovacaoResult renovacao({
    required DateTime validaAte,
    required int diariaHoras,
    required double diariaValor,
    required int diarias,
    required DateTime agora,
    required bool carroDentro,
  }) {
    final vencida = agora.isAfter(validaAte);
    final base = (!vencida || carroDentro) ? validaAte : agora;
    final minimo = vencida && carroDentro
        ? minimoDiarias(inicio: validaAte, agora: agora, diariaHoras: diariaHoras)
        : 1;
    final nova = base.add(Duration(hours: diarias * diariaHoras));
    return RenovacaoResult(
      base: base,
      novaValidaAte: nova,
      valor: _dinheiro(diarias * diariaValor),
      minimoDiarias: minimo,
      cobreAgora: nova.isAfter(agora),
    );
  }

  static double _dinheiro(double v) => (v * 100).round() / 100;
}

class ContratacaoResult {
  const ContratacaoResult({required this.valor, required this.validaAte});
  final double valor;
  final DateTime validaAte;
}

class AtrasoResult {
  const AtrasoResult({
    required this.valor,
    required this.minutos,
    required this.dentroTolerancia,
  });

  final double valor;

  /// Minutos depois do vencimento (0 = saiu dentro do prazo).
  final int minutos;

  /// Venceu, mas dentro da tolerância da tabela do atraso: sai sem pagar.
  final bool dentroTolerancia;

  bool get vencida => minutos > 0;
}

class RenovacaoResult {
  const RenovacaoResult({
    required this.base,
    required this.novaValidaAte,
    required this.valor,
    required this.minimoDiarias,
    required this.cobreAgora,
  });

  final DateTime base;
  final DateTime novaValidaAte;
  final double valor;
  final int minimoDiarias;

  /// A nova validade fica depois de agora. Falso = diárias de menos (a tela
  /// trava o botão até chegar ao mínimo).
  final bool cobreAgora;
}
