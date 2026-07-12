import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../data/avaria_service.dart';
import '../../data/ticket_repository.dart';
import '../../domain/ticket_model.dart';

final ticketRepositoryProvider = Provider<TicketRepository>(
  (ref) => TicketRepository(db: ref.read(appDatabaseProvider)),
);

final avariaServiceProvider = Provider<AvariaService>(
  (ref) => AvariaService(
    db: ref.read(appDatabaseProvider),
    dio: ref.read(dioProvider),
  ),
);

/// Lista de tickets abertos do pátio atual (veículos no pátio).
final ticketsAbertosProvider = FutureProvider<List<TicketModel>>((ref) async {
  final patioId = await ref.read(tokenStorageProvider).readPatioId();
  if (patioId == null) return const [];
  return ref.read(ticketRepositoryProvider).getTicketsAbertos(patioId);
});

/// Histórico de movimentos do pátio (todos os status) para a tela de
/// movimentos no app.
final ticketsMovimentosProvider =
    FutureProvider<List<TicketModel>>((ref) async {
  final patioId = await ref.read(tokenStorageProvider).readPatioId();
  if (patioId == null) return const [];
  return ref.read(ticketRepositoryProvider).getMovimentos(patioId);
});
