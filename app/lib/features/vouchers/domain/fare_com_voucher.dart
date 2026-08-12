import '../../tarifa/domain/fare_result.dart';

/// Resultado do cálculo quando existe voucher.
///
/// Carrega o [semVoucher] inteiro de propósito: a tela precisa mostrar a
/// DURAÇÃO REAL da estadia ("2h30 no pátio"), e não a duração efetiva depois
/// do abatimento. Um cupom dizendo "0h30" para um carro que ficou 2h30 seria
/// simplesmente errado, e o cliente notaria antes do operador.
class FareComVoucher {
  const FareComVoucher({
    required this.semVoucher,
    required this.valorFinal,
    required this.regraNome,
    required this.parceiroNome,
  });

  /// O que o motor de tarifa devolveria se o voucher não existisse. É a base
  /// de comparação — e é dela que sai o valor que o parceiro faturado paga.
  final FareResult semVoucher;

  /// O que o cliente paga de fato.
  final double valorFinal;

  final String regraNome;
  final String parceiroNome;

  double get valorOriginal => semVoucher.valor;

  /// Quanto o parceiro custeou. Vai para `liberacoes.valor_abatido` no
  /// fechamento do ticket e é o número que a competência soma.
  double get valorAbatido => valorOriginal - valorFinal;

  /// Duração real da estadia, para o cupom e a tela.
  int get duracaoMinutos => semVoucher.duracaoMinutos;

  bool get isentouTudo => valorFinal <= 0;

  /// O voucher não mudou nada — cliente ficou pouco tempo e já estava na
  /// tolerância, ou a regra não alcançou este caso. A tela deve dizer isso em
  /// vez de anunciar um desconto de R$ 0,00.
  bool get semEfeito => valorAbatido <= 0;
}
