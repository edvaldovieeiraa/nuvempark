import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../caixa/presentation/providers/caixa_provider.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../../tickets/presentation/providers/ticket_provider.dart';
import '../data/estadia_repository.dart';
import 'providers/estadias_provider.dart';

/// O que toda cobrança de estadia precisa saber de quem está operando.
class ContextoCobranca {
  const ContextoCobranca({required this.operadorId, required this.caixaSessaoId});
  final String operadorId;
  final String caixaSessaoId;
}

/// Operador logado + caixa aberto. Null = sem caixa (a tela mostra a faixa).
Future<ContextoCobranca?> lerContextoCobranca(WidgetRef ref) async {
  final user = await ref.read(tokenStorageProvider).readUser();
  final caixa = await ref.read(caixaSessaoNotifierProvider.future);
  if (user == null || caixa == null) return null;
  return ContextoCobranca(operadorId: user.id, caixaSessaoId: caixa.id);
}

/// Roda uma gravação de estadia com o tratamento comum: mensagens de erro em
/// português para as recusas do repositório, envio da outbox na hora e as
/// listas (pátio, hóspedes, caixa) redesenhadas. Devolve true se gravou.
///
/// Os providers são lidos ANTES do await: quem chama costuma fechar a tela
/// logo depois, e `ref` de widget desmontado não pode mais ser usado.
Future<bool> executarCobrancaEstadia(
  BuildContext context,
  WidgetRef ref,
  Future<void> Function(ContextoCobranca ctx) gravar,
) async {
  final sync = ref.read(syncEngineProvider);
  final container = ProviderScope.containerOf(context, listen: false);
  final ctx = await lerContextoCobranca(ref);
  if (!context.mounted) return false;
  if (ctx == null) {
    AppToast.error(context, 'Abra o caixa para cobrar a estadia.');
    return false;
  }
  try {
    await gravar(ctx);
  } on DiariasInsuficientesException catch (e) {
    if (context.mounted) {
      AppToast.error(context, 'Escolha pelo menos ${e.minimo} diária${e.minimo == 1 ? '' : 's'}.');
    }
    return false;
  } on CaixaFechadoException {
    if (context.mounted) AppToast.error(context, 'Abra o caixa para cobrar a estadia.');
    return false;
  } on EstadiaJaAtivaException {
    if (context.mounted) {
      AppToast.error(context, 'Esta placa já é hóspede. Use "Renovar estadia".');
    }
    return false;
  } catch (_) {
    if (context.mounted) AppToast.error(context, 'Erro ao registrar a estadia.');
    return false;
  }
  container.invalidate(ticketsAbertosProvider);
  container.invalidate(ticketsMovimentosProvider);
  container.invalidate(hospedesProvider);
  container.invalidate(caixaSessaoNotifierProvider);
  unawaited(sync.drain());
  return true;
}

/// Impressão fora do caminho crítico (como a entrada): a gravação já valeu;
/// falha de impressora vira aviso pelo navigator raiz.
void imprimirEmSegundoPlano(
  WidgetRef ref,
  List<int> Function(PrinterState printer) montar,
) {
  final printerFuture = ref.read(printerNotifierProvider.future);
  final printerNotifier = ref.read(printerNotifierProvider.notifier);
  unawaited(() async {
    final printer = await printerFuture.catchError((_) => const PrinterState());
    if (!printer.temImpressora) return;
    final ok = await printerNotifier.print(montar(printer));
    if (ok) return;
    final ctx = rootNavigatorKey.currentContext;
    if (ctx != null && ctx.mounted) AppToast.error(ctx, 'Falha ao imprimir o comprovante.');
  }());
}
