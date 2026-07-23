/// Estado da assinatura publicado pela API (headers + corpo de login/refresh/
/// bootstrap). O app APLICA o bloqueio; a API só publica.
///
/// - [bloqueia] true → tela de bloqueio total (suspensa/cancelada/tenant inativo).
/// - [estado] 'atrasada' → banner + opera. 'trial'/'ativa' → normal.
class AssinaturaStatus {
  const AssinaturaStatus({
    required this.estado,
    required this.libera,
    required this.bloqueia,
    this.trialDiasRestantes,
  });

  /// 'trial' | 'ativa' | 'atrasada' | 'suspensa' | 'cancelada'
  final String estado;

  /// fn_assinatura_libera (ativa OU trial vigente). Aproximado quando vindo só
  /// de headers (ver [comHeaders]).
  final bool libera;

  /// Corte do app: true → tela de bloqueio.
  final bool bloqueia;

  /// Dias restantes de trial (>=0), null quando não é trial.
  final int? trialDiasRestantes;

  static const ativa = AssinaturaStatus(
    estado: 'ativa',
    libera: true,
    bloqueia: false,
  );

  factory AssinaturaStatus.fromJson(Map<String, dynamic> j) => AssinaturaStatus(
        estado: (j['estado'] as String?) ?? 'ativa',
        libera: j['libera'] as bool? ?? true,
        bloqueia: j['bloqueia'] as bool? ?? false,
        trialDiasRestantes: (j['trial_dias_restantes'] as num?)?.toInt(),
      );

  /// Atualização a partir dos headers (X-Assinatura-Estado / -Bloqueia): só
  /// [estado] e [bloqueia] chegam; preserva o trial/libera já conhecidos.
  AssinaturaStatus comHeaders({required String estado, required bool bloqueia}) =>
      AssinaturaStatus(
        estado: estado,
        // libera não vem no header; melhor esforço sem contradizer o bloqueio.
        libera: !bloqueia && (estado == 'ativa' || estado == 'trial'),
        bloqueia: bloqueia,
        // preserva os dias de trial se o estado continua trial, senão zera.
        trialDiasRestantes: estado == 'trial' ? trialDiasRestantes : null,
      );

  bool get atrasada => estado == 'atrasada';

  @override
  bool operator ==(Object other) =>
      other is AssinaturaStatus &&
      other.estado == estado &&
      other.libera == libera &&
      other.bloqueia == bloqueia &&
      other.trialDiasRestantes == trialDiasRestantes;

  @override
  int get hashCode => Object.hash(estado, libera, bloqueia, trialDiasRestantes);
}
