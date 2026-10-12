import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../../estadias/presentation/providers/estadias_provider.dart';
import '../../data/avaria_service.dart';
import '../../data/entrada_service.dart';
import '../../data/pagamento_online_service.dart';
import '../../data/ticket_repository.dart';
import '../../data/tickets_abertos_sync.dart';
import '../../domain/ticket_model.dart';

final ticketRepositoryProvider = Provider<TicketRepository>(
  (ref) => TicketRepository(
    db: ref.read(appDatabaseProvider),
    dio: ref.read(dioProvider),
  ),
);

/// Modo rápido de entrada ligado neste aparelho. Quem muda a preferência
/// invalida este provider.
final modoRapidoLigadoProvider = FutureProvider<bool>(
  (ref) => ref.read(tokenStorageProvider).readModoRapido(),
);

/// Regras da entrada compartilhadas pela entrada normal e pelo modo rápido.
final entradaServiceProvider = Provider<EntradaService>(
  (ref) => EntradaService(
    tickets: ref.read(ticketRepositoryProvider),
    estadias: ref.read(estadiaRepositoryProvider),
  ),
);

/// Leitura dos veículos no pátio vindos dos outros aparelhos (ciclo rápido do
/// SyncLoop). Mantém o ETag da última lista em memória.
final ticketsAbertosSyncProvider = Provider<TicketsAbertosSync>(
  (ref) => TicketsAbertosSync(
    db: ref.read(appDatabaseProvider),
    dio: ref.read(dioProvider),
    mutex: ref.read(syncMutexProvider),
  ),
);

final pagamentoOnlineServiceProvider = Provider<PagamentoOnlineService>(
  (ref) => PagamentoOnlineService(dio: ref.read(dioProvider)),
);

final avariaServiceProvider = Provider<AvariaService>(
  (ref) => AvariaService(db: ref.read(appDatabaseProvider)),
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
