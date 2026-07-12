enum FareMotivo {
  /// Permanência dentro do período de tolerância — sem cobrança.
  tolerancia,

  /// Cálculo normal de frações inicial + adicionais.
  normal,

  /// Valor atingiu o teto de diária.
  tetoDiaria,

  /// Estadia abrangeu a janela de pernoite.
  pernoite,
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
