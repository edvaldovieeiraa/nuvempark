import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/di/providers.dart';
import '../../../database/app_database.dart';
import '../data/foto_uploader.dart';

/// Estado da sincronização: fila de dados, fila de fotos, progresso do envio
/// e último sync. Alimenta o item "Sincronização" do Menu e as telas de
/// bloqueio (que leem só [pendentes]/[falhos], os de DADOS — o sentido desses
/// dois campos não mudou com a fila de fotos).
class SyncInfo {
  const SyncInfo({
    required this.pendentes,
    required this.falhos,
    required this.ultimoSync,
    this.fotosPendentes = 0,
    this.fotosBytes = 0,
    this.fotosFalhas = 0,
    this.progresso,
  });

  /// Registros de dados (sync_log) aguardando envio.
  final int pendentes;

  /// Registros de dados que esgotaram as tentativas.
  final int falhos;
  final DateTime? ultimoSync;

  final int fotosPendentes;

  /// Tamanho das fotos pendentes (0 = ainda não medido).
  final int fotosBytes;
  final int fotosFalhas;

  /// Rodada de fotos em curso; null fora dela.
  final FotoProgresso? progresso;

  bool get emDia =>
      pendentes == 0 && falhos == 0 && fotosPendentes == 0 && fotosFalhas == 0;
}

/// Contagens da fila de dados, ao vivo.
final syncDadosProvider = StreamProvider<({int pendentes, int falhos})>(
  (ref) => ref.read(appDatabaseProvider).syncDao.watchContagens(),
);

/// Contagens e tamanho da fila de fotos, ao vivo.
final fotosResumoProvider = StreamProvider<ResumoFotos>(
  (ref) => ref.read(appDatabaseProvider).fotosEnvioDao.watchResumo(),
);

/// Progresso da rodada de fotos; null fora dela.
final fotoProgressoProvider = StreamProvider<FotoProgresso?>(
  (ref) => ref.read(fotoUploaderProvider).progresso,
);

/// Último sync confirmado pelo servidor. Relido quando a fila de dados muda
/// (é quando o carimbo muda) e quando alguém invalida o [syncInfoProvider].
final ultimoSyncProvider = FutureProvider<DateTime?>((ref) async {
  ref.watch(syncDadosProvider);
  final iso = await ref.read(tokenStorageProvider).readUltimoSync();
  return iso == null ? null : DateTime.tryParse(iso);
});

/// Junta as quatro fontes acima sem pacote extra de streams: cada uma é um
/// provider e este só observa todas.
final syncInfoProvider = Provider<AsyncValue<SyncInfo>>((ref) {
  final dados = ref.watch(syncDadosProvider);
  final fotos = ref.watch(fotosResumoProvider);
  final ultimo = ref.watch(ultimoSyncProvider);
  final progresso = ref.watch(fotoProgressoProvider).value;

  for (final a in [dados, fotos, ultimo]) {
    if (a.hasError) return AsyncError(a.error!, a.stackTrace ?? StackTrace.empty);
  }
  final d = dados.value;
  final f = fotos.value;
  if (d == null || f == null || !ultimo.hasValue) return const AsyncLoading();
  return AsyncData(SyncInfo(
    pendentes: d.pendentes,
    falhos: d.falhos,
    ultimoSync: ultimo.value,
    fotosPendentes: f.pendentes,
    fotosBytes: f.bytes,
    fotosFalhas: f.falhas,
    progresso: progresso,
  ));
});

// ── Texto do item do Menu ────────────────────────────────────────────────

enum TomSync { verificando, enviando, falha, pendente, emDia }

class TextoSync {
  const TextoSync(this.tom, this.texto, {this.fracao});
  final TomSync tom;
  final String texto;

  /// 0–1 da barra de progresso; só no envio de fotos.
  final double? fracao;
}

final _hora = DateFormat('HH:mm');
final _diaHora = DateFormat('dd/MM HH:mm');

/// Subtítulo do item "Sincronização", por prioridade: envio de fotos em curso
/// → falhas → pendências → em dia. Puro, para ser testado sem widget.
TextoSync textoSincronizacao(SyncInfo? info, {required DateTime agora}) {
  if (info == null) return const TextoSync(TomSync.verificando, 'Verificando…');

  final p = info.progresso;
  if (p != null) {
    return TextoSync(
      TomSync.enviando,
      'Enviando foto ${p.atual} de ${p.total} · '
      '${_tamanho(p.bytesEnviados, semUnidadeSe: p.bytesTotal)} de '
      '${_tamanho(p.bytesTotal)}',
      fracao: p.bytesTotal == 0 ? null : p.bytesEnviados / p.bytesTotal,
    );
  }

  if (info.falhos > 0 || info.fotosFalhas > 0) {
    final partes = [
      if (info.falhos > 0) _contar(info.falhos, 'registro', 'registros'),
      if (info.fotosFalhas > 0) _contar(info.fotosFalhas, 'foto', 'fotos'),
    ];
    final total = info.falhos + info.fotosFalhas;
    return TextoSync(
      TomSync.falha,
      '${partes.join(' e ')} ${total == 1 ? 'falhou' : 'falharam'} · '
      'toque para reenviar',
    );
  }

  final ultimo = _fmtUltimo(info.ultimoSync, agora);
  if (info.pendentes > 0 || info.fotosPendentes > 0) {
    final partes = [
      if (info.pendentes > 0) _contar(info.pendentes, 'registro', 'registros'),
      if (info.fotosPendentes > 0)
        _contar(info.fotosPendentes, 'foto', 'fotos') +
            (info.fotosBytes > 0 ? ' (${_tamanho(info.fotosBytes)})' : ''),
    ];
    return TextoSync(
        TomSync.pendente, '${partes.join(' e ')} aguardando envio · $ultimo');
  }

  return TextoSync(TomSync.emDia, 'Tudo em dia · $ultimo');
}

String _contar(int n, String um, String varios) => '$n ${n == 1 ? um : varios}';

const _kb = 1024;
const _mb = 1024 * 1024;

/// "300 KB" abaixo de 1 MB, "4,8 MB" acima. Com [semUnidadeSe], usa a unidade
/// daquele total e omite o sufixo ("1,2 de 4,8 MB").
String _tamanho(int bytes, {int? semUnidadeSe}) {
  final emMb = (semUnidadeSe ?? bytes) >= _mb;
  final numero = emMb
      ? (bytes / _mb).toStringAsFixed(1).replaceAll('.', ',')
      : '${(bytes / _kb).ceil()}';
  if (semUnidadeSe != null) return numero;
  return '$numero ${emMb ? 'MB' : 'KB'}';
}

String _fmtUltimo(DateTime? d, DateTime agora) {
  if (d == null) return 'nenhuma ainda';
  final hoje = d.year == agora.year && d.month == agora.month && d.day == agora.day;
  return hoje ? 'última às ${_hora.format(d)}' : 'última em ${_diaHora.format(d)}';
}
