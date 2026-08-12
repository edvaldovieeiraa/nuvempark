import '../../patio/domain/tarifa_config.dart';
import '../../tarifa/domain/tarifa_engine.dart';
import 'fare_com_voucher.dart';
import 'voucher_regra.dart';

/// Aplica um voucher sobre o cálculo de tarifa — puro Dart, sem I/O.
///
/// O [TarifaEngine] NÃO sabe que vouchers existem, e é assim que fica. Todas
/// as regras dele (tolerância, pernoite, frações, teto de diária) continuam
/// valendo exatamente como valiam; o voucher só mexe no que entra e no que sai:
///
///   entrada + abaterMinutos  ->  TarifaEngine  ->  percentual  ->  valor fixo
///
/// Envolver em vez de alterar tem uma consequência que vale ter em mente: um
/// abatimento pode fazer a estadia cair na TOLERÂNCIA ou sair da janela de
/// PERNOITE, e o resultado muda de motivo, não só de valor. É o comportamento
/// certo — "2 horas grátis" significa que as duas primeiras horas não existem
/// para efeito de cobrança, inclusive para as regras especiais.
abstract final class VoucherEngine {
  /// Calcula DUAS vezes de propósito.
  ///
  /// A primeira, sem voucher, é o que seria cobrado — e é contra ela que o
  /// abatimento é medido. Sem esse número não há como faturar o parceiro:
  /// `valor_abatido` é a diferença, não o valor da regra. Uma isenção de 24h
  /// num carro que ficou 20 minutos abate centavos, não um dia inteiro.
  static FareComVoucher aplicar({
    required DateTime entrada,
    required DateTime saida,
    required TarifaConfig tarifa,
    required VoucherRegra regra,
    required String parceiroNome,
  }) {
    final semVoucher = TarifaEngine.calcular(
      entrada: entrada,
      saida: saida,
      tarifa: tarifa,
    );

    if (regra.neutra) {
      return FareComVoucher(
        semVoucher: semVoucher,
        valorFinal: semVoucher.valor,
        regraNome: regra.nome,
        parceiroNome: parceiroNome,
      );
    }

    // Abater mais do que a estadia inteira não é erro — uma isenção de 24h num
    // carro de 20 minutos é o caso comum. Travar em `saida` mantém o intervalo
    // válido: `TarifaEngine.calcular` tem um `assert` de que a saída não é
    // anterior à entrada, e passar dele lançaria em modo debug.
    final entradaEfetiva = entrada.add(Duration(minutes: regra.abaterMinutos));
    final comAbatimento = TarifaEngine.calcular(
      entrada: entradaEfetiva.isAfter(saida) ? saida : entradaEfetiva,
      saida: saida,
      tarifa: tarifa,
    );

    var valor = comAbatimento.valor;
    if (regra.descontoPercentual > 0) {
      valor = valor * (100 - regra.descontoPercentual) / 100;
    }
    if (regra.descontoValor > 0) {
      valor = valor - regra.descontoValor;
    }

    return FareComVoucher(
      // A comparação e a duração vêm SEMPRE do cálculo sem voucher.
      semVoucher: semVoucher,
      valorFinal: _emCentavos(valor < 0 ? 0 : valor),
      regraNome: regra.nome,
      parceiroNome: parceiroNome,
    );
  }

  /// Dinheiro não tem terceira casa. Um desconto de 33% sobre R$ 10,00 dá
  /// 6,7000000000000002 em ponto flutuante; sem arredondar aqui, esse valor
  /// chegaria ao cupom, ao caixa e à soma da competência do parceiro — e três
  /// lugares que deveriam bater deixariam de bater por centésimos.
  static double _emCentavos(double valor) => (valor * 100).round() / 100;
}
