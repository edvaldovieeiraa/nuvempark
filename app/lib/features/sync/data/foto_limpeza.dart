import 'dart:io';

import '../../../core/config/env.dart';
import '../../../database/app_database.dart';
import '../../auth/data/token_storage.dart';

/// Apaga do celular as fotos que já cumpriram o papel.
///
/// Antes nenhuma foto saía do aparelho: num pátio movimentado isso passa de
/// 1 GB por mês, e armazenamento cheio derruba câmera e app. A regra (spec
/// fila-fotos-sync, item D) só apaga o que o servidor já confirmou e cujo
/// carro saiu há [Env.fotoLimpezaDias] dias — nunca foto pendente, nunca foto
/// de carro ainda no pátio (ela aparece na ficha do veículo), nunca arquivo
/// que a fila não conhece.
class FotoLimpeza {
  FotoLimpeza({
    required this.db,
    required this.storage,
    DateTime Function()? agora,
  }) : _agora = agora ?? DateTime.now;

  final AppDatabase db;
  final TokenStorage storage;
  final DateTime Function() _agora;

  static const _intervalo = Duration(hours: 24);
  bool _rodando = false;

  /// Roda no máximo uma vez a cada 24 h. Nunca lança — é disparada sem
  /// `await` pelo loop de sincronização. Devolve quantos arquivos apagou.
  Future<int> talvezExecutar() async {
    if (_rodando) return 0;
    _rodando = true;
    try {
      final agora = _agora();
      final ultima = await storage.readUltimaLimpezaFotos();
      if (ultima != null && agora.difference(ultima) < _intervalo) return 0;
      final n = await executar();
      await storage.saveUltimaLimpezaFotos(agora);
      return n;
    } catch (_) {
      return 0;
    } finally {
      _rodando = false;
    }
  }

  /// Apaga os arquivos elegíveis agora, sem olhar o intervalo.
  Future<int> executar() async {
    final agora = _agora().millisecondsSinceEpoch;
    const dia = Duration.millisecondsPerDay;
    final elegiveis = await db.fotosEnvioDao.elegiveisLimpeza(
      corteEpoch: agora - Env.fotoLimpezaDias * dia,
    );
    var apagados = 0;
    for (final f in elegiveis) {
      try {
        final arquivo = File(f.caminhoLocal);
        if (await arquivo.exists()) await arquivo.delete();
        await db.fotosEnvioDao.marcarArquivoApagado(f.id, agoraEpoch: agora);
        apagados++;
      } catch (_) {
        // Não deu para apagar este: tenta de novo na próxima limpeza.
      }
    }
    await db.fotosEnvioDao.removerApagadasAntes(
      corteEpoch: agora - Env.fotoLinhaRetencaoDias * dia,
    );
    return apagados;
  }
}
