import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/heartbeat/heartbeat_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/presentation/providers/auth_provider.dart';
import '../../sync/data/sync_loop.dart';
import '../../sync/presentation/sync_info_provider.dart';
import 'providers/dispositivo_provider.dart';

/// Tela de bloqueio de DISPOSITIVO (não confundir com "sessão inválida").
///
/// Sessão, banco local e outbox permanecem INTACTOS. Se há sessão, o SYNC segue
/// drenando a fila e o HEARTBEAT segue batendo — e é o heartbeat 200 (dispositivo
/// liberado no painel) que traz o desbloqueio automático, sem reinstalar nada.
///
/// Sem ação de autorização aqui: liberar dispositivo é exclusividade do painel
/// web do gestor. O operador só dita o CÓDIGO DE PAREAMENTO por telefone.
class DispositivoBloqueioScreen extends ConsumerStatefulWidget {
  const DispositivoBloqueioScreen({super.key});

  @override
  ConsumerState<DispositivoBloqueioScreen> createState() =>
      _DispositivoBloqueioScreenState();
}

class _DispositivoBloqueioScreenState
    extends ConsumerState<DispositivoBloqueioScreen> {
  bool _revalidando = false;

  bool get _temSessao => ref.read(authControllerProvider) is AuthLoggedIn;

  @override
  void initState() {
    super.initState();
    // Só drena/bate se HÁ sessão (bloqueio pós-login). No 403 do próprio login
    // não há token: ligar os loops só provocaria 401 → refresh sem token →
    // clearAll. Aí a tela é só informativa (código + voltar ao login).
    Future.microtask(() {
      if (!mounted || !_temSessao) return;
      ref.read(syncLoopProvider).iniciar();
      ref.read(heartbeatServiceProvider).iniciar();
    });
  }

  Future<void> _tentarNovamente() async {
    if (_revalidando) return;
    setState(() => _revalidando = true);

    if (_temSessao) {
      // Heartbeat 200 = liberado → o próprio serviço chama liberar() e o guard
      // devolve à /home. Se ainda bloqueado, o interceptor mantém o estado.
      await ref.read(heartbeatServiceProvider).baterAgora();
      ref.invalidate(syncInfoProvider);
      if (mounted &&
          ref.read(dispositivoControllerProvider) != null) {
        setState(() => _revalidando = false);
        _aviso('Ainda não liberado. Peça ao gestor e tente de novo.');
      }
      // Se liberou, o guard troca de tela — não precisa mexer no state daqui.
    } else {
      // Sem sessão (403 no login): limpa o gate e volta ao login para o
      // operador tentar de novo depois que o gestor liberar.
      ref.read(dispositivoControllerProvider.notifier).liberar();
    }
  }

  void _aviso(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _sair() => ref.read(authControllerProvider.notifier).logout();

  @override
  Widget build(BuildContext context) {
    final bloqueio = ref.watch(dispositivoControllerProvider);
    final sync = ref.watch(syncInfoProvider).value;
    final pendentes = (sync?.pendentes ?? 0) + (sync?.falhos ?? 0);
    final codigo = bloqueio?.codigoPareamento;

    return PopScope(
      canPop: false,
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
                      color: AppColors.warningBg,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.smartphone,
                        size: 36, color: AppColors.warning),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Dispositivo não autorizado',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    bloqueio?.mensagem ??
                        'Este dispositivo não está autorizado neste pátio.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      height: 1.45,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  if (codigo != null && codigo.isNotEmpty) ...[
                    const SizedBox(height: 22),
                    _cardCodigo(codigo),
                  ],
                  if (_temSessao) ...[
                    const SizedBox(height: 22),
                    _cardOutbox(pendentes),
                  ],
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

  /// Código de pareamento em destaque — é o que o operador dita por telefone
  /// para o gestor identificar o aparelho certo no painel.
  Widget _cardCodigo(String codigo) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Column(
        children: [
          const Text(
            'CÓDIGO DESTE APARELHO',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.5,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          SelectableText(
            codigo,
            style: const TextStyle(
              fontSize: 40,
              fontWeight: FontWeight.w900,
              letterSpacing: 8,
              color: AppColors.onSurface,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: 6),
          TextButton.icon(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: codigo));
              _aviso('Código copiado.');
            },
            icon: const Icon(Icons.copy, size: 16),
            label: const Text('Copiar'),
          ),
          const SizedBox(height: 2),
          const Text(
            'Dite este número ao gestor para ele liberar no painel.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  /// Fila da outbox: tranquiliza que nada será perdido enquanto bloqueado.
  Widget _cardOutbox(int pendentes) {
    final tudo = pendentes == 0;
    final cor = tudo ? AppColors.success : AppColors.warning;
    final fundo = tudo ? AppColors.successBg : AppColors.warningBg;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: fundo,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(tudo ? Icons.cloud_done_outlined : Icons.sync, color: cor),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              tudo
                  ? 'Todos os registros foram enviados.'
                  : 'Enviando $pendentes registro${pendentes == 1 ? '' : 's'} '
                      'pendente${pendentes == 1 ? '' : 's'}… nada será perdido.',
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
