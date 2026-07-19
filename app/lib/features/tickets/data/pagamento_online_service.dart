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

/// Cobrança Pix gerada pelo operador na saída (Pix dinâmico). Espelha a resposta
/// de `POST /ticket/:id/pix` — a MESMA geração da página pública.
class CobrancaPixDinamico {
  const CobrancaPixDinamico({
    required this.pagamentoId,
    required this.valor,
    required this.pixCopiaCola,
    this.pixQrcodeBase64,
    this.expiraEm,
  });

  final String pagamentoId;
  final double valor;
  final String pixCopiaCola;

  /// PNG do QR em base64 (sem o prefixo data:). Pode faltar em algum PSP.
  final String? pixQrcodeBase64;
  final DateTime? expiraEm;
}

/// Erro amigável ao gerar o Pix — o Dio não vaza para a tela.
class PixIndisponivelException implements Exception {
  const PixIndisponivelException(this.mensagem);
  final String mensagem;
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

  /// Gera (ou reaproveita) a cobrança Pix do ticket — o Pix dinâmico da saída.
  /// EXIGE REDE (o Pix é online). Lança [PixIndisponivelException] com uma
  /// mensagem pronta; o caller mostra e não trava a saída (há o fluxo manual).
  Future<CobrancaPixDinamico> gerarPix(String ticketId) async {
    try {
      final resp = await dio.post<Map<String, dynamic>>(
        '${Env.pagamentoOnlineUrl}/$ticketId/pix',
      );
      final d = resp.data;
      if (d == null) {
        throw const PixIndisponivelException('Resposta vazia do servidor.');
      }
      final valor = d['valor'];
      final expira = d['expira_em'];
      return CobrancaPixDinamico(
        pagamentoId: d['pagamento_id'] as String,
        valor: valor is num ? valor.toDouble() : 0.0,
        pixCopiaCola: d['pix_copia_cola'] as String,
        pixQrcodeBase64: d['pix_qrcode_base64'] as String?,
        expiraEm: expira is String ? DateTime.tryParse(expira)?.toLocal() : null,
      );
    } on DioException catch (e) {
      final resp = e.response;

      // SEM resposta = a requisição não chegou ao servidor: timeout, DNS, offline.
      // Só AQUI "sem conexão" é verdade. Antes, qualquer erro caía neste texto —
      // um 500 do PSP virava "sem conexão" e escondia a causa real na saída.
      if (resp == null) {
        throw const PixIndisponivelException(
            'Sem conexão para gerar o Pix. Tente de novo.');
      }

      // Servidor respondeu: a mensagem dele é a verdade. 409 já é esperado
      // ("Estadia já paga" / "Nada a pagar"); os demais (500 etc.) trazem o
      // motivo — mostrá-lo é o que permite diagnosticar sem o log do servidor.
      final data = resp.data;
      final msgServidor = data is Map && data['error'] is String
          ? data['error'] as String
          : (data is Map && data['message'] is String
              ? data['message'] as String
              : null);

      if (resp.statusCode == 409) {
        throw PixIndisponivelException(msgServidor ?? 'Nada a cobrar.');
      }

      throw PixIndisponivelException(
        msgServidor != null
            ? 'Pagamento indisponível: $msgServidor'
            : 'O servidor recusou a cobrança (erro ${resp.statusCode}). '
                'Tente de novo ou avise o suporte.',
      );
    }
  }
}
