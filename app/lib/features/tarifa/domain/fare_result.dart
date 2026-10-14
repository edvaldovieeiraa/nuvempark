enum FareMotivo {
  /// Permanência dentro do período de tolerância — sem cobrança.
  tolerancia,

  /// Cálculo normal de frações inicial + adicionais.
  normal,

  /// Valor atingiu o teto de diária.
  tetoDiaria,

  /// Estadia abrangeu a janela de pernoite.
  pernoite,

  /// Estadia acima de 24 h: soma de blocos de 24 h desde a entrada, cada um
  /// cobrado pelas regras acima, mais a sobra final.
  diarias,
}

class FareResult {
  const FareResult({
    required this.valor,
    required this.duracaoMinutos,
    required this.motivo,
  });

  final double valor;
  final int duracaoMinutos;
  final FareMotivo motivo;
}
