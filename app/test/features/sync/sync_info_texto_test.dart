import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/sync/data/foto_uploader.dart';
import 'package:nuvempark_app/features/sync/presentation/sync_info_provider.dart';

const _mb = 1024 * 1024;

void main() {
  final agora = DateTime(2026, 10, 20, 15, 30);
  final hoje1402 = DateTime(2026, 10, 20, 14, 2);

  SyncInfo info({
    int pendentes = 0,
    int falhos = 0,
    int fotosPendentes = 0,
    int fotosBytes = 0,
    int fotosFalhas = 0,
    int fotosPerdidas = 0,
    FotoProgresso? progresso,
    DateTime? ultimo,
  }) =>
      SyncInfo(
        pendentes: pendentes,
        falhos: falhos,
        ultimoSync: ultimo ?? hoje1402,
        fotosPendentes: fotosPendentes,
        fotosBytes: fotosBytes,
        fotosFalhas: fotosFalhas,
        fotosPerdidas: fotosPerdidas,
        progresso: progresso,
      );

  TextoSync t(SyncInfo? i) => textoSincronizacao(i, agora: agora);

  test('tudo em dia só com dados e fotos enviados', () {
    expect(t(info()).texto, 'Tudo em dia · última às 14:02');
    expect(t(info()).tom, TomSync.emDia);
    expect(t(info(fotosPendentes: 1, fotosBytes: 100)).tom, isNot(TomSync.emDia),
        reason: 'antes o menu dizia "em dia" com fotos esperando');
  });

  test('pendentes: registros, fotos e o tamanho', () {
    expect(
        t(info(pendentes: 3, fotosPendentes: 12, fotosBytes: (4.8 * _mb).round()))
            .texto,
        '3 registros e 12 fotos (4,8 MB) aguardando envio · última às 14:02');
    expect(t(info(pendentes: 1)).texto,
        '1 registro aguardando envio · última às 14:02');
    expect(t(info(fotosPendentes: 1, fotosBytes: 300 * 1024)).texto,
        '1 foto (300 KB) aguardando envio · última às 14:02');
    expect(t(info(pendentes: 2)).tom, TomSync.pendente);
  });

  test('foto ainda sem tamanho medido não mostra "0 KB"', () {
    expect(t(info(fotosPendentes: 2)).texto,
        '2 fotos aguardando envio · última às 14:02');
  });

  test('falhas: dados, fotos ou os dois, com o convite a reenviar', () {
    expect(t(info(fotosFalhas: 2)).texto, '2 fotos falharam · toque para reenviar');
    expect(t(info(falhos: 1)).texto, '1 registro falhou · toque para reenviar');
    expect(t(info(falhos: 1, fotosFalhas: 1)).texto,
        '1 registro e 1 foto falharam · toque para reenviar');
    expect(t(info(falhos: 1, pendentes: 9)).tom, TomSync.falha,
        reason: 'falha pesa mais que pendência');
  });

  test('foto perdida (arquivo ausente): aviso sem convite a reenviar', () {
    final r = t(info(fotosPerdidas: 1));
    expect(r.texto, '1 foto perdida: arquivo não encontrado no aparelho');
    expect(r.tom, TomSync.falha);
    expect(t(info(fotosPerdidas: 2, pendentes: 1)).tom, TomSync.pendente,
        reason: 'pendência real passa na frente do aviso');
    expect(t(info(fotosPerdidas: 1, fotosFalhas: 1)).texto,
        '1 foto falhou · toque para reenviar');
  });

  test('enviando fotos: n de N e os bytes da rodada', () {
    final r = t(info(
      fotosPendentes: 12,
      falhos: 1,
      progresso: FotoProgresso(
        atual: 3,
        total: 10,
        bytesEnviados: (1.2 * _mb).round(),
        bytesTotal: (4.8 * _mb).round(),
      ),
    ));
    expect(r.texto, 'Enviando foto 3 de 10 · 1,2 de 4,8 MB');
    expect(r.tom, TomSync.enviando, reason: 'o envio em curso aparece primeiro');
    expect(r.fracao, closeTo(0.25, 0.001));
  });

  test('última sincronização de outro dia mostra a data; nenhuma ainda', () {
    expect(t(info(ultimo: DateTime(2026, 10, 18, 9, 5))).texto,
        'Tudo em dia · última em 18/10 09:05');
    expect(
        textoSincronizacao(
                const SyncInfo(pendentes: 0, falhos: 0, ultimoSync: null),
                agora: agora)
            .texto,
        'Tudo em dia · nenhuma ainda');
  });

  test('sem informação ainda: verificando', () {
    expect(t(null).texto, 'Verificando…');
    expect(t(null).tom, TomSync.verificando);
  });
}
