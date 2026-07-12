import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../../../database/app_database.dart';
import '../../data/mensalidade_repository.dart';

final mensalidadeRepositoryProvider = Provider<MensalidadeRepository>(
  (ref) => MensalidadeRepository(db: ref.read(appDatabaseProvider)),
);

/// Snapshot local da tela Mensalistas: clientes + placas + competências pagas.
class MensalistasData {
  MensalistasData({
    required this.clientes,
    required this.placasPorCliente,
    required this.competenciasPorCliente,
  });

  final List<PatioCliente> clientes;
  final Map<String, List<String>> placasPorCliente;
  final Map<String, Set<String>> competenciasPorCliente;
}

final mensalistasDataProvider = FutureProvider<MensalistasData>((ref) async {
  final db = ref.read(appDatabaseProvider);
  final patioId = await ref.read(tokenStorageProvider).readPatioId() ?? '';

  final clientes = await db.clientesDao.getClientes(patioId);
  final placas = await db.clientesDao.getPlacas(patioId);
  final pagamentos = await db.mensalidadePagamentosDao.getByOperacao(patioId);

  final placasPorCliente = <String, List<String>>{};
  for (final pl in placas) {
    (placasPorCliente[pl.clienteId] ??= []).add(pl.placa);
  }
  final competenciasPorCliente = <String, Set<String>>{};
  for (final pg in pagamentos) {
    (competenciasPorCliente[pg.clienteId] ??= <String>{}).add(pg.competencia);
  }

  return MensalistasData(
    clientes: clientes,
    placasPorCliente: placasPorCliente,
    competenciasPorCliente: competenciasPorCliente,
  );
});
