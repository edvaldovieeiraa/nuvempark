import 'package:dio/dio.dart';

import '../../../core/config/env.dart';

/// Estado do pagamento online de um ticket, do ponto de vista do OPERADOR.
/// A carência e a diferença vêm calculadas do servidor — o app não as recalcula
/// (o relógio do aparelho não é fonte de verdade para dinheiro).
class PagamentoOnlineStatus {
  const PagamentoOnlineStatus({
    required this.pago,
    required this.dentroCarencia,
    this.valorPago,
    this.pagoEm,
    this.diferenca,
  });

  final bool pago;

  /// Pode sair sem pagar mais nada.
  final bool dentroCarencia;
  final double? valorPago;
  final DateTime? pagoEm;

  /// > 0 quando a carência estourou e a estadia passou do valor pago.
  final double? diferenca;

  bool get temDiferenca => (diferenca ?? 0) > 0;
}

/// Consulta se o ticket já foi pago pelo QR (Pix na página pública).
///
/// EXIGE REDE, e isso é coerente: o Pix só existe online. Sem rede — ou com
/// qualquer erro — devolve `null`, e a saída cai no fluxo manual de sempre.
/// Falha de rede JAMAIS pode travar um carro no pátio.
class PagamentoOnlineService {
  PagamentoOnlineService({required this.dio});

  final Dio dio;

  /// Timeout curto: o operador está com o cliente na frente dele.
  static const Duration _timeout = Duration(seconds: 4);

  Future<PagamentoOnlineStatus?> consultar(String ticketId) async {
    try {
      final resp = await dio.get<Map<String, dynamic>>(
        '${Env.pagamentoOnlineUrl}/$ticketId/pagamento-online',
        options: Options(
          sendTimeout: _timeout,
          receiveTimeout: _timeout,
        ),
      );
      final d = resp.data;
      if (d == null) return null;

      final pagoEm = d['pago_em'];
      final valor = d['valor_pago'];
      final dif = d['diferenca'];

      return PagamentoOnlineStatus(
        pago: d['pago'] == true,
        dentroCarencia: d['dentro_carencia'] == true,
        valorPago: valor is num ? valor.toDouble() : null,
        pagoEm: pagoEm is String ? DateTime.tryParse(pagoEm)?.toLocal() : null,
        diferenca: dif is num ? dif.toDouble() : null,
      );
    } catch (_) {
      // Offline, timeout, 4xx, 5xx: tanto faz. Segue o fluxo manual.
      return null;
    }
  }
}
