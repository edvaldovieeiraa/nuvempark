import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../database/app_database.dart';
import '../data/foto_uploader.dart';
import '../data/sync_engine.dart';
import '../data/sync_result.dart';
import 'sync_info_provider.dart';

/// "Sincronizar agora", a pedido do operador.
///
/// Reabre o que falhou — itens de dados (`retryFalhos`, que até aqui nenhuma
/// tela chamava: o "toque para reenviar" não reenviava nada) e fotos, menos as
/// de arquivo ausente —, drena os dados na hora e dispara uma rodada de fotos
/// SEM esperar por ela: o progresso aparece no próprio item.
Future<SyncResult> sincronizarAgora({
  required AppDatabase db,
  required SyncEngine engine,
  required FotoUploader uploader,
}) async {
  await db.syncDao.retryFalhos();
  await db.fotosEnvioDao.resetFalhas();
  final r = await engine.drain();
  unawaited(uploader.rodada());
  return r;
}

/// Item VIVO "Sincronização" do Menu: status de dados e fotos, tamanho do que
/// falta enviar, barra durante o envio de fotos e o toque que sincroniza na
/// hora. Saiu da tela do Menu para ser testado sozinho.
class SincronizacaoTile extends ConsumerStatefulWidget {
  const SincronizacaoTile({super.key});

  @override
  ConsumerState<SincronizacaoTile> createState() => _SincronizacaoTileState();
}

class _SincronizacaoTileState extends ConsumerState<SincronizacaoTile> {
  bool _sincronizando = false;

  @override
  Widget build(BuildContext context) {
    final info = ref.watch(syncInfoProvider).value;
    final t = textoSincronizacao(info, agora: DateTime.now());
    // O toque manual mostra "Sincronizando…", mas o envio de fotos — que tem
    // números de verdade — passa na frente.
    final manual = _sincronizando && t.tom != TomSync.enviando;
    final cor = manual ? AppColors.warning : _cor(t.tom);
    final subtitulo = manual ? 'Sincronizando…' : t.texto;

    return InkWell(
      onTap: _sincronizando ? null : _tocar,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: AppColors.primaryContainer,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.sync, size: 20, color: AppColors.primary),
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
                              fontSize: 14,
                              height: 1.3,
                              fontWeight: FontWeight.w700,
                              color: AppColors.onSurface)),
                      const SizedBox(width: 7),
                      Container(
                        width: 9,
                        height: 9,
                        decoration:
                            BoxDecoration(color: cor, shape: BoxShape.circle),
                      ),
                    ],
                  ),
                  Text(subtitulo,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 11.5,
                          height: 1.3,
                          fontWeight: FontWeight.w500,
                          // O estado "tudo em dia" fala em verde; os demais
                          // ficam neutros para o verde significar só uma coisa.
                          color: cor == AppColors.success
                              ? AppColors.primary
                              : AppColors.onSurfaceVariant)),
                  if (t.tom == TomSync.enviando) ...[
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: t.fracao,
                        minHeight: 4,
                        color: AppColors.primaryFill,
                        backgroundColor: AppColors.surfaceContainerHigh,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (_sincronizando)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: AppColors.primaryFill,
                  backgroundColor: AppColors.surfaceContainerHigh,
                ),
              )
            else
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text('sincronizar',
                    style: TextStyle(
                        fontSize: 11,
                        height: 1,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary)),
              ),
          ],
        ),
      ),
    );
  }

  static Color _cor(TomSync tom) => switch (tom) {
        TomSync.verificando => AppColors.outline,
        TomSync.enviando => AppColors.warning,
        TomSync.falha => AppColors.danger,
        TomSync.pendente => AppColors.warning,
        TomSync.emDia => AppColors.success,
      };

  Future<void> _tocar() async {
    if (_sincronizando) return;
    setState(() => _sincronizando = true);
    try {
      final db = ref.read(appDatabaseProvider);
      final r = await sincronizarAgora(
        db: db,
        engine: ref.read(syncEngineProvider),
        uploader: ref.read(fotoUploaderProvider),
      );
      ref.invalidate(ultimoSyncProvider);
      final fotos = (await db.fotosEnvioDao.watchResumo().first).pendentes;
      if (!mounted) return;
      if (r.failed > 0) {
        AppToast.error(context,
            '${r.synced} enviados, ${r.failed} falharam. Vou reintentar.');
      } else if (r.synced > 0) {
        AppToast.success(
            context,
            '${r.synced} ${r.synced == 1 ? 'item enviado' : 'itens enviados'} '
            'para a dashboard.');
      } else if (fotos > 0) {
        AppToast.info(context,
            'Registros em dia. Enviando $fotos ${fotos == 1 ? 'foto' : 'fotos'}…');
      } else {
        AppToast.info(context, 'Nada pendente — tudo em dia.');
      }
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não consegui sincronizar agora.');
    } finally {
      if (mounted) setState(() => _sincronizando = false);
    }
  }
}
