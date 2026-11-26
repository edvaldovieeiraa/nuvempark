enum FareMotivo {
  /// Permanência dentro do período de tolerância — sem cobrança.
  tolerancia,

  /// Cálculo por tempo (preço base e/ou regras de horário).
  normal,

  /// Valor atingiu o teto de diária.
  tetoDiaria,

  /// Estadia abrangeu a janela de pernoite.
  pernoite,
}

/// Um pedaço da estadia cobrado por uma regra de horário ou pelo preço base.
class TrechoCobranca {
  const TrechoCobranca({
    required this.inicio,
    required this.fim,
    required this.minutos,
    required this.centavos,
    this.regraId,
    this.regraNome,
  });

  /// Instantes reais (UTC). Para exibir, converter com `paraBrasilia`.
  final DateTime inicio;
  final DateTime fim;
  final int minutos;
  final int centavos;

  /// Nulo = preço base.
  final String? regraId;
  final String? regraNome;

  bool get isPrecoBase => regraId == null;
  double get valor => centavos / 100;
}

class FareResult {
  const FareResult({
    required this.valor,
    required this.duracaoMinutos,
    required this.motivo,
    this.trechos = const [],
  });

  final double valor;
  final int duracaoMinutos;
  final FareMotivo motivo;

  /// De onde veio o valor (motivo normal/teto). Vazio em tolerância e pernoite.
  /// No teto, a soma dos trechos passa do valor cobrado.
  final List<TrechoCobranca> trechos;

  /// O cartão "Como chegamos nesse valor" só vale com mais de um trecho, ou
  /// com um trecho só que é uma regra. Tabela sem regras fica como hoje.
  bool get temDetalheDeRegras =>
      trechos.length > 1 || trechos.any((t) => !t.isPrecoBase);
}
