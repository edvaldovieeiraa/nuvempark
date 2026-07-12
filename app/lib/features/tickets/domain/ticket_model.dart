class TicketModel {
  const TicketModel({
    required this.id,
    required this.operacaoId,
    required this.placa,
    required this.tipoVeiculo,
    required this.entrada,
    this.saida,
    this.valorCalculado,
    this.valorCobrado,
    this.formaPagamento,
    this.motivoIsencao,
    required this.status,
    required this.operadorId,
    this.caixaSessaoId,
    this.tabelaPrecoId,
    this.clienteId,
    this.planoId,
    this.origem = 'avulso',
    required this.syncStatus,
    this.fotoEntradaPath,
  });

  final String id;
  final String operacaoId;
  final String placa;
  final String tipoVeiculo;
  final DateTime entrada;
  final DateTime? saida;
  final double? valorCalculado;
  final double? valorCobrado;
  final String? formaPagamento;
  final String? motivoIsencao;
  final String status;
  final String operadorId;
  final String? caixaSessaoId;
  final String? tabelaPrecoId;
  final String? clienteId;
  final String? planoId;
  final String origem;
  final String syncStatus;

  /// Caminho local da foto de entrada, se houver (feature foto + OCR).
  final String? fotoEntradaPath;

  bool get isAberto => status == 'aberto';

  /// Ticket de livre passagem (cliente mensalista/credenciado) — saída gratuita.
  bool get isLivrePassagem => origem == 'plano';

  Duration get tempoPermanencia {
    final fim = saida ?? DateTime.now();
    return fim.difference(entrada);
  }
}
