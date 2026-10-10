import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/estadias/presentation/providers/estadias_provider.dart';
import 'package:nuvempark_app/features/tickets/domain/ticket_model.dart';

final agora = DateTime(2026, 10, 9, 10, 30);

Estadia _e(String id, String placa, DateTime validaAte) => Estadia(
      id: id,
      operacaoId: 'p1',
      placa: placa,
      tipoVeiculo: 'carro',
      tarifaId: 't',
      diariaValor: 30,
      diariaHoras: 24,
      inicioEpoch: 0,
      validaAteEpoch: validaAte.millisecondsSinceEpoch,
      diarias: 1,
      valorTotal: 30,
      syncStatus: 'sincronizado',
      criadoEm: 0,
      atualizadoEm: 0,
    );

TicketModel _t(String id, String estadiaId) => TicketModel(
      id: id,
      operacaoId: 'p1',
      placa: 'X',
      tipoVeiculo: 'carro',
      entrada: agora,
      status: 'aberto',
      operadorId: 'op',
      syncStatus: 'sincronizado',
      estadiaId: estadiaId,
    );

void main() {
  test('uma linha por placa (a mais recente), vencidas primeiro, depois por validade, dentro/fora',
      () {
    final velhaRto = _e('e0', 'RTO4F21', DateTime(2026, 10, 5));
    final rto = _e('e1', 'RTO4F21', DateTime(2026, 10, 11, 14, 30));
    final qab = _e('e2', 'QAB2C34', DateTime(2026, 10, 10, 7, 10));
    final plm = _e('e3', 'PLM8N90', DateTime(2026, 10, 7, 18));

    final itens = montarHospedes(
      recentes: [velhaRto, rto, qab, plm],
      deCarroDentro: [rto],
      abertos: [_t('t1', 'e1')],
      agora: agora,
    );

    expect(itens.map((i) => i.estadia.placa), ['PLM8N90', 'QAB2C34', 'RTO4F21']);
    expect(itens.last.estadia.id, 'e1', reason: 'a estadia velha da mesma placa some');
    expect(itens.last.dentro, isTrue);
    expect(itens.first.vencida(agora), isTrue);
  });
}
