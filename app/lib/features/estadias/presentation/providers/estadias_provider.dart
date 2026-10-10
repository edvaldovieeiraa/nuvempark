import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../../../database/app_database.dart';
import '../../../tickets/domain/ticket_model.dart';
import '../../../tickets/presentation/providers/ticket_provider.dart';
import '../../data/estadia_repository.dart';

final estadiaRepositoryProvider = Provider<EstadiaRepository>(
  (ref) => EstadiaRepository(db: ref.read(appDatabaseProvider)),
);

/// Linha da aba Hóspedes.
class ItemHospede {
  const ItemHospede({required this.estadia, required this.ticketAberto});

  final Estadia estadia;

  /// Ticket aberto ligado à estadia (carro dentro); null = fora do pátio.
  final TicketModel? ticketAberto;

  bool get dentro => ticketAberto != null;

  bool vencida(DateTime agora) =>
      estadia.validaAteEpoch <= agora.millisecondsSinceEpoch;
}

/// Monta a aba Hóspedes (design, observações 4 e 13):
///   • estadias válidas, vencidas há até 7 dias e QUALQUER uma de carro dentro;
///   • uma linha por placa — a estadia mais recente;
///   • vencidas primeiro, depois por validade (a que vence antes no topo).
List<ItemHospede> montarHospedes({
  required List<Estadia> recentes,
  required List<Estadia> deCarroDentro,
  required List<TicketModel> abertos,
  required DateTime agora,
}) {
  final porPlaca = <String, Estadia>{};
  for (final e in [...recentes, ...deCarroDentro]) {
    final atual = porPlaca[e.placa];
    if (atual == null || e.validaAteEpoch > atual.validaAteEpoch) porPlaca[e.placa] = e;
  }
  final ticketPorEstadia = {
    for (final t in abertos)
      if (t.estadiaId != null) t.estadiaId!: t,
  };
  final itens = [
    for (final e in porPlaca.values)
      ItemHospede(estadia: e, ticketAberto: ticketPorEstadia[e.id]),
  ];
  itens.sort((a, b) {
    final va = a.vencida(agora), vb = b.vencida(agora);
    if (va != vb) return va ? -1 : 1;
    return a.estadia.validaAteEpoch.compareTo(b.estadia.validaAteEpoch);
  });
  return itens;
}

final hospedesProvider = FutureProvider<List<ItemHospede>>((ref) async {
  final patioId = await ref.read(tokenStorageProvider).readPatioId();
  if (patioId == null) return const [];
  final db = ref.read(appDatabaseProvider);
  final agora = DateTime.now();
  final abertos = await ref.watch(ticketsAbertosProvider.future);
  final recentes = await db.estadiasDao.doPatioDesde(
    patioId,
    agora.subtract(EstadiaRepository.janelaVencida).millisecondsSinceEpoch,
  );
  final deCarroDentro = await db.estadiasDao
      .porIds(abertos.map((t) => t.estadiaId).whereType<String>());
  return montarHospedes(
    recentes: recentes,
    deCarroDentro: deCarroDentro,
    abertos: abertos,
    agora: agora,
  );
});
