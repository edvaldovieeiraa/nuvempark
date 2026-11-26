import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../tarifa/domain/fare_result.dart';
import '../../../tarifa/domain/regra_horario.dart';

/// Paleta das regras de horário — a MESMA do painel
/// (`web/src/lib/regras-horario.ts`): a cor sai do `id` da regra, não da
/// posição, para não mudar quando outra regra é removida. Sem verde (no painel
/// o verde é reservado a dinheiro).
const _paleta = <Color>[
  Color(0xFF7DD3FC), // céu
  Color(0xFF6D28D9), // violeta
  Color(0xFFF59E0B), // âmbar
  Color(0xFF14B8A6), // teal
  Color(0xFFDB2777), // rosa
  Color(0xFF1D4ED8), // azul
];

/// Índice da cor de uma regra: hash `h = (h × 31 + código) & 0x7fffffff`
/// sobre as unidades UTF-16 do id, módulo 6. Igual no painel.
int indiceCorRegra(String id) {
  var h = 0;
  for (final c in id.codeUnits) {
    h = (h * 31 + c) & 0x7fffffff;
  }
  return h % _paleta.length;
}

/// "Como chegamos nesse valor": um trecho por linha na saída. Só aparece
/// quando o cálculo usou regras de horário (ver [FareResult.temDetalheDeRegras]).
class ComoChegamosCard extends StatelessWidget {
  const ComoChegamosCard({
    super.key,
    required this.fare,
    this.descontoVoucher,
    this.jaPagoOnline,
  });

  /// O cálculo SEM voucher (os trechos vêm dele).
  final FareResult fare;

  /// Quanto o voucher abateu (linha "Voucher −R$ X"), se houver.
  final double? descontoVoucher;

  /// Quanto o cliente já pagou pelo QR (linha "Já pago pelo QR −R$ X").
  final double? jaPagoOnline;

  static final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: r'R$');
  static final _hora = DateFormat('HH:mm');

  static String _duracao(int minutos) {
    if (minutos < 60) return '$minutos min';
    final h = minutos ~/ 60;
    final m = minutos % 60;
    return m == 0 ? '${h}h' : '${h}h${m.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final linhas = <Widget>[];
    for (var i = 0; i < fare.trechos.length; i++) {
      final t = fare.trechos[i];
      if (i > 0) linhas.add(const Divider(height: 18, color: AppColors.outlineVariant));
      final cor = t.isPrecoBase ? null : _paleta[indiceCorRegra(t.regraId!)];
      final faixa =
          '${_hora.format(paraBrasilia(t.inicio))}–${_hora.format(paraBrasilia(t.fim))}';
      linhas.add(Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: cor ?? AppColors.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(3),
              border: cor == null ? Border.all(color: AppColors.outline) : null,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$faixa · ${t.regraNome ?? 'Preço base'}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                Text(_duracao(t.minutos),
                    style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
              ],
            ),
          ),
          Text(_moeda.format(t.valor),
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        ],
      ));
    }

    Widget ajuste(String rotulo, String valor) => Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Row(
            children: [
              Expanded(
                child: Text(rotulo,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurfaceVariant)),
              ),
              Text(valor,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
            ],
          ),
        );

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.primaryContainer, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Como chegamos nesse valor',
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 10),
          ...linhas,
          if (fare.motivo == FareMotivo.tetoDiaria)
            ajuste('Teto da diária', _moeda.format(fare.valor)),
          if (descontoVoucher != null && descontoVoucher! > 0)
            ajuste('Voucher', '−${_moeda.format(descontoVoucher)}'),
          if (jaPagoOnline != null && jaPagoOnline! > 0)
            ajuste('Já pago pelo QR', '−${_moeda.format(jaPagoOnline)}'),
        ],
      ),
    );
  }
}
