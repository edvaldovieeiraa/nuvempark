/// Estado de bloqueio do dispositivo (distinto de "sessão inválida").
///
/// A sessão, o banco local e a outbox permanecem INTACTOS quando isto é setado:
/// o app só troca de tela e continua drenando o /sync em background.
class DispositivoBloqueio {
  const DispositivoBloqueio({required this.motivo, this.codigoPareamento});

  /// limite_atingido | bloqueado | revogado | pendente_aprovacao |
  /// limite_pendentes | assinatura_bloqueada
  final String motivo;
  final String? codigoPareamento;

  /// Mensagem amigável por motivo (sem jargão técnico).
  String get mensagem => switch (motivo) {
        'limite_atingido' =>
          'Este dispositivo não está autorizado neste pátio. Peça ao gestor para liberá-lo no painel.',
        'pendente_aprovacao' =>
          'Este dispositivo está aguardando o gestor aprová-lo no painel.',
        'bloqueado' =>
          'Este dispositivo foi bloqueado pelo gestor. Fale com o responsável para reativá-lo.',
        'revogado' =>
          'Este dispositivo foi removido deste pátio. Peça ao gestor para autorizá-lo de novo.',
        'limite_pendentes' =>
          'A fila de aparelhos aguardando aprovação está cheia. Tente novamente em instantes.',
        'assinatura_bloqueada' =>
          'A assinatura desta rede está bloqueada. Fale com o responsável pela conta.',
        _ => 'Este dispositivo não está autorizado neste pátio.',
      };

  @override
  bool operator ==(Object other) =>
      other is DispositivoBloqueio &&
      other.motivo == motivo &&
      other.codigoPareamento == codigoPareamento;

  @override
  int get hashCode => Object.hash(motivo, codigoPareamento);
}

/// Lançada pelo login quando a API responde 403 `dispositivo_nao_autorizado`.
/// Distingue o caso de um erro de credencial/rede — o app vai à tela de
/// bloqueio sem limpar sessão nem outbox.
class DispositivoBloqueadoException implements Exception {
  const DispositivoBloqueadoException({required this.motivo, this.codigoPareamento});
  final String motivo;
  final String? codigoPareamento;
}

/// Info do dispositivo vinda do /bootstrap (só para exibição — NÃO bloqueia).
class DispositivoInfo {
  const DispositivoInfo({
    this.status,
    this.licenca,
    this.apelido,
    this.codigoPareamento,
  });
  final String? status;
  final String? licenca;
  final String? apelido;
  final String? codigoPareamento;
}
