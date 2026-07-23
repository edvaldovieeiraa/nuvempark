import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/heartbeat/heartbeat_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/presentation/providers/auth_provider.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../sync/data/sync_loop.dart';
import '../../sync/presentation/sync_info_provider.dart';
import 'providers/assinatura_provider.dart';

/// Tela de bloqueio total (assinatura suspensa/cancelada ou tenant inativo).
///
/// Regras (decisão #11 revista): o operador NÃO opera, mas:
///  • o SYNC segue drenando a outbox (upload) — bloqueio comercial nunca causa
///    perda de dado operacional;
///  • o HEARTBEAT segue batendo — é o canal que traz o desbloqueio automático
///    (master reativa → próxima resposta traz bloqueia=false → volta pra /home);
///  • sem botão voltar / gesto de back.
class BloqueioScreen extends ConsumerStatefulWidget {
  const BloqueioScreen({super.key});

  @override
  ConsumerState<BloqueioScreen> createState() => _BloqueioScreenState();
}

class _BloqueioScreenState extends ConsumerState<BloqueioScreen> {
  bool _revalidando = false;

  @override
  void initState() {
    super.initState();
    // O MainShell (que roda sync+heartbeat) é desmontado ao entrar aqui — então
    // ligamos os dois nesta tela. iniciar() é idempotente; o sync continua
    // subindo a fila e o heartbeat continua trazendo o estado do gate.
    Future.microtask(() {
      if (!mounted) return;
      ref.read(syncLoopProvider).iniciar();
      ref.read(heartbeatServiceProvider).iniciar();
    });
  }

  Future<void> _tentarNovamente() async {
    if (_revalidando) return;
    setState(() => _revalidando = true);
    // Força uma batida de heartbeat: a resposta traz X-Assinatura-* e o
    // interceptor aplica no gate. Se desbloqueou, o guard leva pra /home sozinho.
    await ref.read(heartbeatServiceProvider).baterAgora();
    // Também tenta drenar a fila agora (caso a rede tenha voltado).
    ref.invalidate(syncInfoProvider);
    if (mounted) setState(() => _revalidando = false);
  }

  Future<void> _sair() => ref.read(authControllerProvider.notifier).logout();

  @override
  Widget build(BuildContext context) {
    final estado = ref.watch(assinaturaControllerProvider)?.estado ?? 'suspensa';
    final patioNome = ref.watch(patioNotifierProvider).value?.nome;
    final sync = ref.watch(syncInfoProvider).value;
    final pendentes = (sync?.pendentes ?? 0) + (sync?.falhos ?? 0);

    final texto = switch (estado) {
      'cancelada' =>
        'Assinatura cancelada. Procure o responsável pela conta para reativar.',
      _ =>
        'Acesso suspenso — assinatura bloqueada. Procure o responsável pela conta.',
    };

    return PopScope(
      canPop: false, // sem gesto de voltar
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    decoration: const BoxDecoration(
                      color: AppColors.dangerBg,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.lock_outline,
                        size: 38, color: AppColors.danger),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    estado == 'cancelada'
                        ? 'Assinatura cancelada'
                        : 'Acesso suspenso',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    texto,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      height: 1.45,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  if (patioNome != null && patioNome.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: AppColors.outlineVariant),
                      ),
                      child: Text(
                        patioNome,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  _cardOutbox(pendentes),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton.icon(
                      onPressed: _revalidando ? null : _tentarNovamente,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primaryFill,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      icon: _revalidando
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.refresh),
                      label: Text(
                        _revalidando ? 'Verificando…' : 'Tentar novamente',
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton.icon(
                      onPressed: _sair,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.onSurfaceVariant,
                        side: const BorderSide(color: AppColors.outlineVariant),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      icon: const Icon(Icons.logout),
                      label: const Text(
                        'Sair',
                        style: TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Estado da fila: enquanto há pendências, tranquiliza que nada será perdido;
  /// quando zera, confirma que tudo subiu.
  Widget _cardOutbox(int pendentes) {
    final tudoSincronizado = pendentes == 0;
    final cor = tudoSincronizado ? AppColors.success : AppColors.warning;
    final fundo = tudoSincronizado ? AppColors.successBg : AppColors.warningBg;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: fundo,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(
            tudoSincronizado ? Icons.cloud_done_outlined : Icons.sync,
            color: cor,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              tudoSincronizado
                  ? 'Todos os registros foram sincronizados.'
                  : '$pendentes registro${pendentes == 1 ? '' : 's'} '
                      'aguardando envio. Vamos continuar enviando — nada será perdido.',
              style: TextStyle(
                fontSize: 13.5,
                height: 1.35,
                fontWeight: FontWeight.w600,
                color: cor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
