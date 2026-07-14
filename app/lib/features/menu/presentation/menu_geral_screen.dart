import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/config/env.dart';
import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../ajustes/presentation/ajustes_screen.dart';

/// Aba "Menu Geral": porta de entrada única para as telas que não moram na
/// barra inferior. Nada de UI duplicada — cada item navega para a tela que já
/// existe (Configurações, Movimentos, Mensalistas, Impressora).
class MenuGeralScreen extends ConsumerStatefulWidget {
  const MenuGeralScreen({super.key});

  @override
  ConsumerState<MenuGeralScreen> createState() => _MenuGeralScreenState();
}

class _MenuGeralScreenState extends ConsumerState<MenuGeralScreen> {
  bool _sincronizando = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Menu geral')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _item(
            icone: Icons.badge_outlined,
            titulo: 'Mensalistas',
            subtitulo: 'Clientes e recebimento de mensalidades',
            onTap: () => context.push(Routes.mensalistas),
          ),
          _item(
            icone: Icons.settings_outlined,
            titulo: 'Configuração',
            subtitulo: 'Sincronização, conexão e sessão',
            onTap: () => context.push(Routes.ajustes),
          ),
          _item(
            icone: Icons.receipt_long_outlined,
            titulo: 'Movimentos',
            subtitulo: 'Histórico de entradas e saídas do pátio',
            onTap: () => context.push(Routes.movimentos),
          ),
          _item(
            icone: Icons.sync,
            titulo: 'Sincronização manual',
            subtitulo: _sincronizando
                ? 'Sincronizando…'
                : 'Envia agora o que está na fila',
            carregando: _sincronizando,
            onTap: _sincronizarAgora,
          ),
          _item(
            icone: Icons.print_outlined,
            titulo: 'Impressora Bluetooth',
            subtitulo: 'Parear, testar e configurar o cupom',
            onTap: () => context.push(Routes.impressora),
          ),
          _item(
            icone: Icons.local_parking_outlined,
            titulo: 'Sobre o pátio',
            subtitulo: 'Nome, código, vagas e cadastros',
            onTap: () => context.push(Routes.sobrePatio),
          ),
          _item(
            icone: Icons.info_outline,
            titulo: 'Sobre o aplicativo',
            subtitulo: 'Versão ${Env.versionDisplay}',
            onTap: () => context.push(Routes.sobreApp),
          ),
        ],
      ),
    );
  }

  /// Dispara a MESMA drenagem que o loop de sync usa — só que na hora, a pedido
  /// do operador. O engine não muda: só é invocado.
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

  Widget _item({
    required IconData icone,
    required String titulo,
    required String subtitulo,
    required VoidCallback onTap,
    bool carregando = false,
  }) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: InkWell(
            onTap: carregando ? null : onTap,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.entradaBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child:
                        Icon(icone, size: 21, color: AppColors.entrada),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(titulo,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 15)),
                        Text(subtitulo,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  if (carregando)
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2.2),
                    )
                  else
                    const Icon(Icons.chevron_right,
                        color: AppColors.onSurfaceVariant),
                ],
              ),
            ),
          ),
        ),
      );
}
