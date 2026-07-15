import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/presentation/providers/auth_provider.dart';
import '../../sync/presentation/sync_info_provider.dart';

/// Aba "Menu": porta única para o que não mora na barra inferior, em três
/// seções — Operação / Aparelho / Informações. Regra de ouro: cada conceito
/// tem UM lugar só (a antiga tela de Configurações foi dissolvida aqui: o
/// card de sync virou o item vivo, o bloco "Conexão" foi para o Sobre e o
/// Sair subiu para o fim do menu).
class MenuGeralScreen extends ConsumerStatefulWidget {
  const MenuGeralScreen({super.key});

  @override
  ConsumerState<MenuGeralScreen> createState() => _MenuGeralScreenState();
}

class _MenuGeralScreenState extends ConsumerState<MenuGeralScreen> {
  static final _hora = DateFormat('HH:mm');
  static final _diaHora = DateFormat('dd/MM HH:mm');

  bool _sincronizando = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Menu')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _secao('Operação'),
          _item(
            icone: Icons.badge_outlined,
            titulo: 'Mensalistas',
            subtitulo: 'Clientes e recebimento de mensalidades',
            onTap: () => context.push(Routes.mensalistas),
          ),
          _item(
            icone: Icons.receipt_long_outlined,
            titulo: 'Movimentos do pátio',
            subtitulo: 'Histórico de entradas e saídas',
            onTap: () => context.push(Routes.movimentos),
          ),
          const SizedBox(height: 14),

          _secao('Aparelho'),
          _item(
            icone: Icons.print_outlined,
            titulo: 'Impressora Bluetooth',
            subtitulo: 'Parear, testar e configurar o cupom',
            onTap: () => context.push(Routes.impressora),
          ),
          _itemSync(),
          const SizedBox(height: 14),

          _secao('Informações'),
          _item(
            icone: Icons.info_outline,
            titulo: 'Sobre o pátio e o app',
            subtitulo: 'Pátio, cadastros, versão e servidor',
            onTap: () => context.push(Routes.sobre),
          ),
          _item(
            icone: Icons.logout,
            titulo: 'Sair do app',
            subtitulo: 'Encerra a sessão deste operador',
            cor: AppColors.danger,
            semChevron: true,
            onTap: _confirmarLogout,
          ),
        ],
      ),
    );
  }

  // ── Sincronização: item VIVO (status + ação, sem fingir navegação) ──────

  /// Bolinha de status + última sincronização no subtítulo; o toque dispara a
  /// MESMA drenagem que o loop automático usa — só que na hora.
  Widget _itemSync() {
    final syncAsync = ref.watch(syncInfoProvider);
    final info = syncAsync.value;

    final Color cor;
    final String subtitulo;
    if (_sincronizando) {
      cor = AppColors.warning;
      subtitulo = 'Sincronizando…';
    } else if (info == null) {
      cor = AppColors.outline;
      subtitulo = 'Verificando…';
    } else if (info.falhos > 0) {
      cor = AppColors.danger;
      subtitulo =
          '${info.falhos} ${info.falhos == 1 ? 'item falhou' : 'itens falharam'} · toque para reenviar';
    } else if (info.pendentes > 0) {
      cor = AppColors.warning;
      subtitulo =
          '${info.pendentes} aguardando envio · ${_fmtUltimo(info.ultimoSync)}';
    } else {
      cor = AppColors.success;
      subtitulo = 'Tudo em dia · ${_fmtUltimo(info.ultimoSync)}';
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: InkWell(
          onTap: _sincronizando ? null : _sincronizarAgora,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.entradaBg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.sync,
                      size: 21, color: AppColors.entrada),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text('Sincronização',
                              style: TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 15)),
                          const SizedBox(width: 7),
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                                color: cor, shape: BoxShape.circle),
                          ),
                        ],
                      ),
                      Text(subtitulo,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.onSurfaceVariant)),
                    ],
                  ),
                ),
                if (_sincronizando)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2.2),
                  )
                else
                  const Icon(Icons.play_arrow_rounded,
                      color: AppColors.onSurfaceVariant),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _fmtUltimo(DateTime? d) {
    if (d == null) return 'nenhuma ainda';
    final agora = DateTime.now();
    final hoje = d.year == agora.year &&
        d.month == agora.month &&
        d.day == agora.day;
    return hoje
        ? 'última às ${_hora.format(d)}'
        : 'última em ${_diaHora.format(d)}';
  }

  /// Dispara a MESMA drenagem que o loop de sync usa — só que na hora, a
  /// pedido do operador. O engine não muda: só é invocado.
  Future<void> _sincronizarAgora() async {
    if (_sincronizando) return;
    setState(() => _sincronizando = true);
    try {
      final r = await ref.read(syncEngineProvider).drain();
      ref.invalidate(syncInfoProvider);
      if (!mounted) return;
      if (r.failed > 0) {
        AppToast.error(context,
            '${r.synced} enviados, ${r.failed} falharam. Vou reintentar.');
      } else if (r.synced > 0) {
        AppToast.success(
            context,
            '${r.synced} ${r.synced == 1 ? 'item enviado' : 'itens enviados'} '
            'para a dashboard.');
      } else {
        AppToast.info(context, 'Nada pendente — tudo em dia.');
      }
    } catch (_) {
      if (mounted) {
        AppToast.error(context, 'Não consegui sincronizar agora.');
      }
    } finally {
      if (mounted) setState(() => _sincronizando = false);
    }
  }

  // ── Sair (subiu das Configurações; mesma confirmação) ───────────────────

  Future<void> _confirmarLogout() async {
    final sair = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sair do app?'),
        content: const Text(
            'Você vai precisar do código do pátio, usuário e senha para entrar de novo.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Sair')),
        ],
      ),
    );
    if (sair == true) {
      ref.read(authControllerProvider.notifier).logout();
    }
  }

  // ── Auxiliares de layout ────────────────────────────────────────────────

  Widget _secao(String t) => Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 8),
        child: Text(t.toUpperCase(),
            style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
                color: AppColors.onSurfaceVariant)),
      );

  Widget _item({
    required IconData icone,
    required String titulo,
    required String subtitulo,
    required VoidCallback onTap,
    Color? cor,
    bool semChevron = false,
  }) {
    final corIcone = cor ?? AppColors.entrada;
    final corFundo =
        cor != null ? cor.withValues(alpha: 0.1) : AppColors.entradaBg;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: corFundo,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icone, size: 21, color: corIcone),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(titulo,
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: cor)),
                      Text(subtitulo,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.onSurfaceVariant)),
                    ],
                  ),
                ),
                if (!semChevron)
                  const Icon(Icons.chevron_right,
                      color: AppColors.onSurfaceVariant),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
