import 'caixa_model.dart';

/// Total de entradas por forma de pagamento — o que entrou na gaveta, por meio.
/// Pagamento pix_online NÃO entra no caixa (cai na conta Asaas do tenant),
/// então nunca aparece aqui.
class ResumoForma {
  const ResumoForma({
    required this.forma,
    required this.total,
    required this.qtd,
  });

  /// Chave crua: 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' |
  /// 'manual' (lançamento sem forma).
  final String forma;
  final double total;
  final int qtd;
}

/// Agrupa as ENTRADAS por forma de pagamento (maior total primeiro).
/// Lançamentos manuais (sem forma) caem em 'manual'. Fonte da verdade: os
/// movimentos — a mesma base do cupom de fechamento.
List<ResumoForma> resumoPorForma(List<MovimentoModel> movimentos) {
  final acc = <String, ResumoForma>{};
  for (final m in movimentos) {
    if (m.tipo != 'entrada') continue;
    final forma = (m.formaPagamento == null || m.formaPagamento!.isEmpty)
        ? 'manual'
        : m.formaPagamento!;
    final atual = acc[forma];
    acc[forma] = ResumoForma(
      forma: forma,
      total: (atual?.total ?? 0) + m.valor,
      qtd: (atual?.qtd ?? 0) + 1,
    );
  }
  final lista = acc.values.toList()
    ..sort((a, b) => b.total.compareTo(a.total));
  return lista;
}

/// Rótulo amigável da forma de pagamento. Compartilhado entre a tela e a
/// impressão para os dois nunca divergirem.
String rotuloFormaPagamento(String forma) => switch (forma) {
      'dinheiro' => 'Dinheiro',
      'cartao_debito' => 'Cartão de débito',
      'cartao_credito' => 'Cartão de crédito',
      'pix' => 'Pix',
      'pix_online' => 'Pix online',
      'livre_passagem' => 'Livre passagem',
      'manual' => 'Lançamento manual',
      _ => forma.replaceAll('_', ' '),
    };
