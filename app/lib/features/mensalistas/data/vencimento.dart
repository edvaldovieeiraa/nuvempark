/// Regra de vencimento do mensalista (espelha web/ e api/).
/// 1 pagamento estende a vigência por 1 ciclo:
///   - diaVencimento (1..28): esse dia no mês SEGUINTE ao vencimento atual;
///   - nulo: vencimento atual + 30 dias.
/// Base = vencimento atual, ou hoje se ainda não houver. Trabalha só com a
/// data (sem hora) para não escorregar por fuso.
library;

DateTime proximoVencimento(DateTime? atual, int? diaVencimento) {
  final ref = atual ?? DateTime.now();
  final base = DateTime(ref.year, ref.month, ref.day); // zera a hora

  if (diaVencimento != null && diaVencimento >= 1 && diaVencimento <= 28) {
    var ano = base.year;
    var mes = base.month + 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
    return DateTime(ano, mes, diaVencimento);
  }
  return base.add(const Duration(days: 30));
}
