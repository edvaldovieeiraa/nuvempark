class CaixaModel {
  const CaixaModel({
    required this.id,
    required this.operacaoId,
    required this.operadorId,
    required this.operadorNome,
    required this.fundoCaixa,
    required this.totalEntradas,
    required this.totalSangrias,
    this.totalFechamento,
    required this.status,
    required this.abertura,
    this.fechamento,
    this.observacaoFechamento,
    required this.syncStatus,
  });

  final String id;
  final String operacaoId;
  final String operadorId;
  final String operadorNome;
  final double fundoCaixa;
  final double totalEntradas;
  final double totalSangrias;
  final double? totalFechamento;
  final String status;
  final DateTime abertura;
  final DateTime? fechamento;
  final String? observacaoFechamento;
  final String syncStatus;

  bool get isAberta => status == 'aberta';

  /// fundo + entradas - sangrias
  double get saldoCalculado => fundoCaixa + totalEntradas - totalSangrias;
}

class MovimentoModel {
  const MovimentoModel({
    required this.id,
    required this.caixaSessaoId,
    required this.tipo,
    required this.valor,
    required this.descricao,
    this.ticketId,
    this.formaPagamento,
    this.tabelaPrecoNome,
    required this.criadoEm,
  });

  final String id;
  final String caixaSessaoId;
  // 'entrada' | 'sangria' | 'isencao'
  final String tipo;
  final double valor;
  final String descricao;
  final String? ticketId;
  final String? formaPagamento;
  final String? tabelaPrecoNome;
  final DateTime criadoEm;
}

class FechamentoResult {
  const FechamentoResult({
    required this.totalCalculado,
    required this.totalContado,
    required this.divergencia,
    this.jaEstavaFechada = false,
  });

  final double totalCalculado;
  final double totalContado;
  final double divergencia; // totalContado - totalCalculado (positivo = excesso)

  /// true quando a sessão já estava fechada e este fechamento foi um no-op
  /// idempotente (duplo-toque/retry): nada foi reescrito nem reenfileirado.
  final bool jaEstavaFechada;

  bool get temDivergencia => divergencia.abs() > 0.01;
  bool get emExcesso => divergencia > 0.01;
  bool get emFalta => divergencia < -0.01;
}
