class TarifaConfig {
  const TarifaConfig({
    required this.id,
    required this.operacaoId,
    required this.nome,
    required this.tipoVeiculo,
    required this.ordem,
    required this.visivelOperador,
    required this.fracaoInicialMinutos,
    required this.fracaoInicialValor,
    required this.fracaoAdicionalMinutos,
    required this.fracaoAdicionalValor,
    required this.tetoDiaria,
    required this.toleranciaMinutos,
    required this.pernoiteValor,
    required this.pernoiteHoraInicio,
    required this.pernoiteHoraFim,
    required this.vigenciaInicio,
    this.vigenciaFim,
    this.modalidade = modalidadeAvulso,
    this.diariaValor,
    this.diariaHoras,
    this.tarifaAtrasoId,
  });

  static const modalidadeAvulso = 'avulso';
  static const modalidadeHospede = 'hospede';

  final String id;
  final String operacaoId;
  final String nome;
  final String tipoVeiculo;
  final int ordem;
  final bool visivelOperador;
  final int fracaoInicialMinutos;
  final double fracaoInicialValor;
  final int fracaoAdicionalMinutos;
  final double fracaoAdicionalValor;
  final double tetoDiaria;
  final int toleranciaMinutos;
  final double pernoiteValor;
  final int pernoiteHoraInicio;
  final int pernoiteHoraFim;
  final DateTime vigenciaInicio;
  final DateTime? vigenciaFim;

  /// 'avulso' (cobra pelo tempo) | 'hospede' (diárias pagas na contratação).
  final String modalidade;

  /// Só em hóspede: preço e duração de uma diária, e a tabela avulsa do atraso
  /// (nula = primeira avulsa visível do tipo — ver [PatioModel.tarifaAtraso]).
  final double? diariaValor;
  final int? diariaHoras;
  final String? tarifaAtrasoId;

  bool get isHospede => modalidade == modalidadeHospede;

  bool get vigente {
    final now = DateTime.now();
    return now.isAfter(vigenciaInicio) &&
        (vigenciaFim == null || now.isBefore(vigenciaFim!));
  }
}
