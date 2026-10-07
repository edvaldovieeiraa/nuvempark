import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/vouchers/data/liberacao_service.dart';

import '../../support/fakes.dart';

void main() {
  late AppDatabase db;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });
  tearDown(() => db.close());

  Map<String, dynamic> corpoComVoucher() => {
        'liberacao': {
          'id': 'lib-1',
          'liberado_em': '2026-08-10T14:00:00Z',
          'parceiro_nome': 'Padaria do Zé',
          'regra': {
            'id': 'r1',
            'nome': '2 horas',
            'abater_minutos': 120,
            'desconto_percentual': 0,
            'desconto_valor': 0,
          },
        },
      };

  Future<void> semearCache({
    required String ticketId,
    required String patio,
    int sincronizadoEm = 1,
  }) async {
    await db.operacaoDao.upsertCache(OperacaoCacheCompanion(
      operacaoId: Value(patio),
      nome: const Value('Pátio Teste'),
      codigo: const Value('T1'),
      qtdVagas: const Value(10),
      configJson: const Value('{}'),
      sincronizadoEm: Value(sincronizadoEm),
    ));
    await db.liberacoesDao.substituir(patio, [
      LiberacoesCacheCompanion.insert(
        ticketId: ticketId,
        operacaoId: patio,
        parceiroNome: 'Padaria do Zé',
        regraNome: '2 horas',
        abaterMinutos: const Value(120),
        liberadoEmEpoch: 1,
      ),
    ]);
  }

  group('Com o servidor respondendo', () {
    test('chama a rota sob o prefixo da API do app', () async {
      // Sem o prefixo a API responde 404, o app lê como "sem rede" e cobra
      // cheio de quem tinha voucher — foi assim em produção até 07/10.
      Uri? chamada;
      final s = LiberacaoService(
        dio: fakeDio((o) {
          chamada = o.uri;
          return jsonResponse({'liberacao': null});
        }),
        db: db,
      );

      await s.consultar('t1');

      expect(chamada!.path, '/api/mobile/v1/patio/tickets/t1/liberacao');
    });

    test('tem voucher → encontrada, e vem FRESCA (sem conferidoEm)', () async {
      final s = LiberacaoService(
        dio: fakeDio((_) => jsonResponse(corpoComVoucher())),
        db: db,
      );

      final r = await s.consultar('t1');

      expect(r.estado, EstadoLiberacao.encontrada);
      expect(r.regra?.abaterMinutos, 120);
      expect(r.parceiroNome, 'Padaria do Zé');
      expect(r.doCache, isFalse,
          reason: 'veio do servidor agora, não da cópia local');
    });

    test('não tem voucher → ausente, e ausente NÃO gera aviso', () async {
      final s = LiberacaoService(
        dio: fakeDio((_) => jsonResponse({'liberacao': null})),
        db: db,
      );

      final r = await s.consultar('t1');

      // É a resposta da esmagadora maioria das saídas. Só o servidor pode
      // AFIRMAR que não há voucher — por isso este caso existe separado de
      // naoConfirmada, e por isso ele não avisa nada na tela.
      expect(r.estado, EstadoLiberacao.ausente);
      expect(r.regra, isNull);
    });
  });

  group('Sem o servidor', () {
    test('erro de rede SEM cópia local → naoConfirmada, JAMAIS ausente',
        () async {
      final s = LiberacaoService(
        dio: fakeDio((_) => throw Exception('rede caiu')),
        db: db,
      );

      final r = await s.consultar('t1');

      // O ponto central da feature: confundir isto com `ausente` seria cobrar
      // cheio em silêncio de um cliente que talvez tivesse desconto.
      expect(r.estado, EstadoLiberacao.naoConfirmada);
      expect(r.estado, isNot(EstadoLiberacao.ausente));
    });

    test('resposta 502 do servidor também NÃO vira ausente', () async {
      // A rota devolve 502 quando a consulta ao banco falha, justamente para o
      // app não confundir "não deu para saber" com "não tem".
      final s = LiberacaoService(
        dio: fakeDio((_) => jsonResponse({'error': 'x'}, status: 502)),
        db: db,
      );

      final r = await s.consultar('t1');

      expect(r.estado, EstadoLiberacao.naoConfirmada);
    });

    test('erro de rede COM cópia local → encontrada, marcada como do cache',
        () async {
      await semearCache(ticketId: 't1', patio: 'p1', sincronizadoEm: 1000);

      final s = LiberacaoService(
        dio: fakeDio((_) => throw Exception('rede caiu')),
        db: db,
      );

      final r = await s.consultar('t1');

      // É o que a cópia do bootstrap comprou: offline, o desconto que já
      // existia no último sync continua valendo.
      expect(r.estado, EstadoLiberacao.encontrada);
      expect(r.regra?.abaterMinutos, 120);
      expect(r.doCache, isTrue);
      expect(r.conferidoEm, DateTime.fromMillisecondsSinceEpoch(1000),
          reason: 'a tela mostra o horário do último sync, não um alarme seco');
    });

    test('offline, ticket de outro carro → naoConfirmada, não ausente',
        () async {
      // Ausência NA CÓPIA LOCAL não prova ausência no servidor: a liberação
      // pode ter sido feita depois do último sync.
      await semearCache(ticketId: 't1', patio: 'p1');

      final s = LiberacaoService(
        dio: fakeDio((_) => throw Exception('rede caiu')),
        db: db,
      );

      final r = await s.consultar('t2');

      expect(r.estado, EstadoLiberacao.naoConfirmada);
    });
  });
}
