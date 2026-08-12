/// Regra de desconto de um voucher — o catálogo do pátio, análogo às tabelas
/// de preço.
///
/// A generalidade mora em TRÊS NÚMEROS, e não numa linguagem de regras:
///
///   isenção de 2h ....... abaterMinutos = 120
///   isenção de 12h ...... abaterMinutos = 720
///   isenção de 24h ...... abaterMinutos = 1440
///   isenção total ....... descontoPercentual = 100
///   metade do valor ..... descontoPercentual = 50
///   R$ 5 de abatimento .. descontoValor = 5.0
///
/// Os quatro casos pedidos pelo negócio são os três primeiros mais o quarto —
/// nenhum precisou de campo próprio, e "50% de desconto" saiu de graça.
class VoucherRegra {
  const VoucherRegra({
    required this.id,
    required this.nome,
    this.abaterMinutos = 0,
    this.descontoPercentual = 0,
    this.descontoValor = 0,
  });

  final String id;
  final String nome;

  /// Minutos abatidos da estadia ANTES de a tarifa ser calculada. É o que faz
  /// "2 horas grátis e depois valor fracionado" cair no motor existente sem
  /// que ele precise saber que vouchers existem.
  final int abaterMinutos;

  /// 0–100, aplicado sobre o valor já calculado.
  final int descontoPercentual;

  /// Abatimento em reais, aplicado depois do percentual.
  final double descontoValor;

  /// Regra sem efeito. O banco recusa cadastrar uma (`voucher_regras_faz_algo`
  /// em db/31), mas o app pode receber uma vinda de um servidor mais antigo, e
  /// aí é melhor tratar como "sem desconto" do que confiar.
  bool get neutra =>
      abaterMinutos <= 0 && descontoPercentual <= 0 && descontoValor <= 0;

  factory VoucherRegra.fromJson(Map<String, dynamic> json) => VoucherRegra(
        id: json['id'] as String? ?? '',
        nome: json['nome'] as String? ?? 'Voucher',
        abaterMinutos: (json['abater_minutos'] as num?)?.toInt() ?? 0,
        descontoPercentual: (json['desconto_percentual'] as num?)?.toInt() ?? 0,
        descontoValor: (json['desconto_valor'] as num?)?.toDouble() ?? 0,
      );
}
