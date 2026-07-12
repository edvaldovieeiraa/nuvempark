import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/config/env.dart';
import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/presentation/providers/auth_provider.dart';

/// Info de sincronização exibida em Configurações.
class SyncInfo {
  const SyncInfo({
    required this.pendentes,
    required this.falhos,
    required this.ultimoSync,
  });

  final int pendentes;
  final int falhos;
  final DateTime? ultimoSync;

  bool get emDia => pendentes == 0 && falhos == 0;
}

final syncInfoProvider = FutureProvider<SyncInfo>((ref) async {
  final db = ref.read(appDatabaseProvider);
  final storage = ref.read(tokenStorageProvider);
  final pendentes = await db.syncDao.countPendentes();
  final falhos = await db.syncDao.countFalhos();
  final iso = await storage.readUltimoSync();
  return SyncInfo(
    pendentes: pendentes,
    falhos: falhos,
    ultimoSync: iso != null ? DateTime.tryParse(iso) : null,
  );
});

/// Aba Configurações: impressora, conexão, sincronização e sessão.
class AjustesScreen extends ConsumerWidget {
  const AjustesScreen({super.key});

  static final _dataHora = DateFormat('dd/MM/yyyy HH:mm');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth is AuthLoggedIn ? auth.user : null;
    final syncAsync = ref.watch(syncInfoProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Configurações')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Sincronização com a nuvem ────────────────────────────────
          _tituloSecao('Sincronização'),
          syncAsync.when(
            loading: () => const SkeletonBox(height: 120, radius: 16),
            error: (e, _) =>
                const ErrorState(mensagem: 'Erro ao ler o status de sync.'),
            data: (info) => _cardSync(context, ref, info),
          ),
          const SizedBox(height: 20),

          // ── Impressora ───────────────────────────────────────────────
          _tituloSecao('Impressora'),
          _tile(
            icone: Icons.print_outlined,
            titulo: 'Impressora Bluetooth',
            subtitulo: 'Parear, testar e configurar o cupom',
            onTap: () => context.push(Routes.impressora),
          ),
          const SizedBox(height: 20),

          // ── Conexão ──────────────────────────────────────────────────
          _tituloSecao('Conexão'),
          Container(
            decoration: _boxCard(),
            child: Column(
              children: [
                _linhaInfo('Operador', user?.nome ?? '—'),
                _divisor(),
                _linhaInfo('Usuário', user?.usuario ?? '—'),
                _divisor(),
                _linhaInfo(
                  'Servidor',
                  Env.apiBaseUrl.replaceFirst(RegExp(r'^https?://'), ''),
                ),
                _divisor(),
                _linhaInfo(
                  'Versão do app',
                  '${Env.appVersion} (${Env.buildNumber})',
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ── Sessão ───────────────────────────────────────────────────
          _tituloSecao('Sessão'),
          _tile(
            icone: Icons.logout,
            titulo: 'Sair do app',
            subtitulo: 'Encerra a sessão deste operador',
            cor: AppColors.danger,
            onTap: () => _confirmarLogout(context, ref),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  // ── Sincronização ──────────────────────────────────────────────────────

  Widget _cardSync(BuildContext context, WidgetRef ref, SyncInfo info) {
    final cor = info.falhos > 0
        ? AppColors.danger
        : info.pendentes > 0
            ? AppColors.warning
            : AppColors.success;
    final rotulo = info.falhos > 0
        ? '${info.falhos} ${info.falhos == 1 ? 'item falhou' : 'itens falharam'}'
        : info.pendentes > 0
            ? '${info.pendentes} ${info.pendentes == 1 ? 'item aguardando envio' : 'itens aguardando envio'}'
            : 'Tudo sincronizado';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _boxCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: cor, shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(rotulo,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 14)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            info.ultimoSync != null
                ? 'Última sincronização com a dashboard: ${_dataHora.format(info.ultimoSync!)}'
                : 'Nenhuma sincronização registrada ainda.',
            style: const TextStyle(
                fontSize: 12.5, color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _sincronizarAgora(context, ref),
              icon: const Icon(Icons.sync, size: 18),
              label: const Text('Sincronizar agora'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _sincronizarAgora(BuildContext context, WidgetRef ref) async {
    final r = await ref.read(syncEngineProvider).drain();
    ref.invalidate(syncInfoProvider);
    if (!context.mounted) return;
    if (r.failed > 0) {
      AppToast.error(
          context, '${r.synced} enviados, ${r.failed} falharam. Vou reintentar.');
    } else if (r.synced > 0) {
      AppToast.success(context, '${r.synced} ${r.synced == 1 ? 'item enviado' : 'itens enviados'} para a dashboard.');
    } else {
      AppToast.info(context, 'Nada pendente — tudo em dia.');
    }
  }

  Future<void> _confirmarLogout(BuildContext context, WidgetRef ref) async {
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

  BoxDecoration _boxCard() => BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      );

  Widget _tituloSecao(String t) => Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 8),
        child: Text(t.toUpperCase(),
            style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
                color: AppColors.onSurfaceVariant)),
      );

  Widget _tile({
    required IconData icone,
    required String titulo,
    required String subtitulo,
    required VoidCallback onTap,
    Color? cor,
  }) =>
      Container(
        decoration: _boxCard(),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: (cor ?? AppColors.primary).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child:
                      Icon(icone, size: 20, color: cor ?? AppColors.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(titulo,
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              color: cor)),
                      Text(subtitulo,
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.onSurfaceVariant)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right,
                    color: AppColors.onSurfaceVariant),
              ],
            ),
          ),
        ),
      );

  Widget _linhaInfo(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        child: Row(
          children: [
            Text(k,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.onSurfaceVariant)),
            const Spacer(),
            Flexible(
              child: Text(v,
                  textAlign: TextAlign.right,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );

  Widget _divisor() =>
      const Divider(height: 1, indent: 14, endIndent: 14);
}
