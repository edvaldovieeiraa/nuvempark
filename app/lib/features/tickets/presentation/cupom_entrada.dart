import 'dart:io';

import 'package:image/image.dart' as img;
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/router/app_router.dart';
import '../../patio/domain/patio_model.dart';
import '../../printing/data/print_templates.dart';
import '../../printing/presentation/providers/printer_provider.dart';

/// Monta e imprime o cupom de entrada. Usado pela entrada normal e pelo modo
/// rápido, sempre através da `FilaImpressao` (a impressora recusa um cupom
/// enquanto imprime o anterior).
///
/// Roda fora do caminho crítico e depois de a tela ter saído: não usa `ref` nem
/// o `context` de quem chamou — os providers chegam já lidos, e o aviso de
/// falha vai pelo navigator raiz. Nunca lança; devolve se imprimiu. Sem
/// impressora configurada não imprime e não avisa (como sempre foi).
Future<bool> imprimirCupomEntrada({
  required Future<PrinterState> printerFuture,
  required PrinterNotifier printerNotifier,
  required String ticketId,
  required String placa,
  required String tipoVeiculo,
  required DateTime entrada,
  required PatioModel patio,
  String? fotoPath,
  bool operadorMarcouFoto = false,
  BlocoEstadia? estadia,
}) async {
  final printer = await printerFuture.catchError((_) => const PrinterState());
  if (!printer.temImpressora) return false;

  // Modo da parametrização: sempre, o operador decidiu, ou nunca.
  final deveImprimirFoto = patio.fotoReciboSempre ||
      (patio.fotoReciboOperadorDecide && operadorMarcouFoto);
  img.Image? fotoVeiculo;
  if (deveImprimirFoto && fotoPath != null) {
    try {
      final decodificada = img.decodeImage(await File(fotoPath).readAsBytes());
      if (decodificada != null) {
        fotoVeiculo = img.bakeOrientation(decodificada);
      }
    } catch (_) {
      // Foto ilegível não pode derrubar o cupom — imprime sem ela.
    }
  }

  final bytes = PrintTemplates.ticketEntrada(
    ticketId: ticketId,
    placa: placa,
    tipoVeiculo: tipoVeiculo,
    entrada: entrada,
    operacaoNome: patio.nome,
    cols: printer.cols,
    avancoFinal: printer.avancoFinal,
    cabecalho: patio.ticketCabecalho,
    rodape: patio.ticketRodape,
    fotoVeiculo: fotoVeiculo,
    estadia: estadia,
  );
  final ok = await printerNotifier.print(bytes);
  if (ok) return true;

  // Com a placa: no modo rápido vários cupons estão na fila ao mesmo tempo.
  final ctx = rootNavigatorKey.currentContext;
  if (ctx != null && ctx.mounted) {
    AppToast.error(ctx, 'Falha ao imprimir o ticket de $placa.');
  }
  return false;
}
