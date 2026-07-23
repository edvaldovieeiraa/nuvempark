import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../config/env.dart';
import '../network/bearer_interceptor.dart';
import '../network/refresh_interceptor.dart';
import '../network/assinatura_interceptor.dart';
import '../../database/app_database.dart';
import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/data/token_storage.dart';
import '../../features/sync/data/sync_engine.dart';
import '../../features/printing/data/printer_service.dart';
import '../../features/printing/data/printer_storage.dart';

// ── SecureStorage ──────────────────────────────────────────────────────────
final secureStorageProvider = Provider<SecureStorage>((_) => SecureStorage());

// ── TokenStorage ───────────────────────────────────────────────────────────
final tokenStorageProvider = Provider<TokenStorage>(
  (ref) => TokenStorage(ref.read(secureStorageProvider)),
);

// ── API Client (Dio) ───────────────────────────────────────────────────────
// RefreshInterceptor precisa do Dio; Dio precisa do RefreshInterceptor.
// Cria o Dio primeiro, depois adiciona os interceptors à lista.
final dioProvider = Provider<Dio>((ref) {
  final storage = ref.read(tokenStorageProvider);
  final bearer = BearerInterceptor(storage);

  final dio = ApiClientBase.create(
    baseUrl: Env.apiBaseUrl,
    enableLogs: Env.enableHttpLogs,
    connectTimeout: Env.connectTimeout,
    receiveTimeout: Env.receiveTimeout,
  );

  dio.interceptors.add(bearer);
  dio.interceptors.add(
    RefreshInterceptor(dio: dio, storage: storage, ref: ref),
  );
  // Publica o estado da assinatura de toda resposta autenticada no gate. Depois
  // do refresh: quando um 401 é renovado e a requisição repetida, é a resposta
  // repetida (já com os headers) que queremos ler.
  dio.interceptors.add(AssinaturaInterceptor(ref));

  return dio;
});

// ── AuthRepository ─────────────────────────────────────────────────────────
final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    dio: ref.read(dioProvider),
    storage: ref.read(tokenStorageProvider),
  ),
);

// ── AppDatabase (Drift) ────────────────────────────────────────────────────
final appDatabaseProvider = Provider<AppDatabase>((_) => AppDatabase());

// ── Impressão ──────────────────────────────────────────────────────────────
final printerStorageProvider = Provider<PrinterStorage>(
  (ref) => PrinterStorage(ref.read(secureStorageProvider)),
);
final printerServiceProvider = Provider<PrinterService>((_) => PrinterService());

// ── SyncEngine ─────────────────────────────────────────────────────────────
final syncEngineProvider = Provider<SyncEngine>(
  (ref) => SyncEngine(
    db: ref.read(appDatabaseProvider),
    dio: ref.read(dioProvider),
    storage: ref.read(tokenStorageProvider),
  ),
);
