/// Resultado do reconhecimento de uma placa na entrada.
/// Regra (fechada no produto): bloqueado OU vencido NÃO libera passagem —
/// vira ticket avulso. Vagas esgotadas também não liberam.
enum StatusReconhecimento {
  livrePassagem, // ok → entrada gratuita vinculada ao plano
  bloqueado, // cliente bloqueado → avulso
  vencido, // plano vencido → avulso
  vagasEsgotadas, // já atingiu o limite de veículos simultâneos → avulso
}

class ReconhecimentoCliente {
  const ReconhecimentoCliente({
    required this.clienteId,
    required this.nome,
    required this.planoId,
    required this.planoNome,
    required this.planoTipo,
    required this.vagas,
    required this.vagasOcupadas,
    required this.status,
  });

  final String clienteId;
  final String nome;
  final String? planoId;
  final String? planoNome;
  final String? planoTipo;
  final int vagas;
  final int vagasOcupadas;
  final StatusReconhecimento status;

  bool get liberaPassagem => status == StatusReconhecimento.livrePassagem;

  String get mensagem => switch (status) {
        StatusReconhecimento.livrePassagem =>
          'Livre passagem · vaga ${vagasOcupadas + 1}/$vagas',
        StatusReconhecimento.bloqueado => 'Cliente bloqueado — cobrar avulso',
        StatusReconhecimento.vencido => 'Plano vencido — cobrar avulso',
        StatusReconhecimento.vagasEsgotadas =>
          'Limite de vagas atingido ($vagasOcupadas/$vagas) — cobrar avulso',
      };
}
