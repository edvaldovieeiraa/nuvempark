import 'package:dio/dio.dart';

import '../../../core/config/env.dart';
import '../../../database/app_database.dart';
import '../domain/voucher_regra.dart';

/// Como a consulta terminou. São TRÊS estados, e a distinção entre os dois
/// últimos é o coração desta feature.
enum EstadoLiberacao {
  /// Existe voucher. O desconto se aplica.
  encontrada,

  /// O servidor respondeu e disse que NÃO há voucher. Cobra cheio, sem aviso —
  /// é a resposta normal da esmagadora maioria das saídas.
  ausente,

  /// Não foi possível saber. Cobra cheio, MAS avisa na tela.
  ///
  /// Confundir isto com [ausente] seria cobrar em silêncio de um cliente que
  /// talvez tivesse desconto — o erro mais caro que este módulo pode cometer,
  /// porque ninguém fica sabendo.
  naoConfirmada,
}

class LiberacaoConsulta {
  const LiberacaoConsulta({
    required this.estado,
    this.regra,
    this.parceiroNome,
    this.conferidoEm,
  });

  final EstadoLiberacao estado;
  final VoucherRegra? regra;
  final String? parceiroNome;

  /// Instante do último bootstrap, quando a resposta veio da cópia local.
  /// Nulo quando veio do servidor agora.
  final DateTime? conferidoEm;

  bool get doCache => conferidoEm != null;

  const LiberacaoConsulta.ausente() : this(estado: EstadoLiberacao.ausente);
}

/// Descobre se o ticket tem voucher de parceiro, no momento da saída.
///
/// Duas fontes, nesta ordem, e a ordem importa:
///
///   1. O SERVIDOR, com prazo curto. É a única fonte que enxerga a liberação
///      feita há dez segundos pelo lojista do outro lado da rua — que é
///      justamente o caso mais comum, o cliente valida na loja e caminha até
///      o carro. Nenhum cache de 30 segundos pegaria isso.
///
///   2. A CÓPIA LOCAL do bootstrap, quando o servidor não responde. Não é tão
///      fresca, mas transforma "não sei" em "sei o que era no último sync" —
///      e evita cobrar cheio de quem já tinha voucher antes de a rede cair.
///
/// O prazo de 3 segundos é curto de propósito: isto está no caminho crítico da
/// cancela, com o carro parado. Melhor cair para a cópia local do que segurar
/// o operador esperando uma rede que já se foi.
class LiberacaoService {
  LiberacaoService({required this.dio, required this.db});

  final Dio dio;
  final AppDatabase db;

  static const Duration prazo = Duration(seconds: 3);

  Future<LiberacaoConsulta> consultar(String ticketId) async {
    try {
      final resp = await dio.get<Map<String, dynamic>>(
        Env.liberacaoUrl(ticketId),
        options: Options(
          receiveTimeout: prazo,
          sendTimeout: prazo,
          // 502 é o "não deu para consultar" do servidor (ver a rota). Sem
          // isto o Dio lançaria e cairíamos no cache — que é o que queremos
          // de todo jeito, mas passar pelo catch é mais claro que tratar aqui.
        ),
      );

      final corpo = resp.data;
      final bruto = corpo?['liberacao'];
      if (bruto == null) return const LiberacaoConsulta.ausente();

      final mapa = Map<String, dynamic>.from(bruto as Map);
      final regra = VoucherRegra.fromJson(
        Map<String, dynamic>.from(mapa['regra'] as Map),
      );
      return LiberacaoConsulta(
        estado: EstadoLiberacao.encontrada,
        regra: regra,
        parceiroNome: mapa['parceiro_nome'] as String? ?? 'Parceiro',
      );
    } catch (_) {
      return _daCopiaLocal(ticketId);
    }
  }

  /// A cópia baixada no último bootstrap.
  ///
  /// Ausência AQUI não vira [EstadoLiberacao.ausente]: pode ser que a liberação
  /// exista no servidor e ainda não tenha chegado. Só o servidor pode afirmar
  /// que não há voucher.
  Future<LiberacaoConsulta> _daCopiaLocal(String ticketId) async {
    try {
      final linha = await db.liberacoesDao.porTicket(ticketId);
      final conferido = await _ultimoSync(linha?.operacaoId);

      if (linha == null) {
        return LiberacaoConsulta(
          estado: EstadoLiberacao.naoConfirmada,
          conferidoEm: conferido,
        );
      }

      return LiberacaoConsulta(
        estado: EstadoLiberacao.encontrada,
        regra: VoucherRegra(
          id: '',
          nome: linha.regraNome,
          abaterMinutos: linha.abaterMinutos,
          descontoPercentual: linha.descontoPercentual,
          descontoValor: linha.descontoValor,
        ),
        parceiroNome: linha.parceiroNome,
        conferidoEm: conferido,
      );
    } catch (_) {
      // Banco local indisponível é o pior cenário; ainda assim não podemos
      // afirmar que não há voucher.
      return const LiberacaoConsulta(estado: EstadoLiberacao.naoConfirmada);
    }
  }

  /// Quando o bootstrap rodou pela última vez — é o que permite à tela dizer
  /// "conferido às 14:32" em vez de um alarme genérico.
  Future<DateTime?> _ultimoSync(String? operacaoId) async {
    if (operacaoId == null) return null;
    final cache = await db.operacaoDao.getCacheByOperacaoId(operacaoId);
    if (cache == null) return null;
    return DateTime.fromMillisecondsSinceEpoch(cache.sincronizadoEm);
  }
}
