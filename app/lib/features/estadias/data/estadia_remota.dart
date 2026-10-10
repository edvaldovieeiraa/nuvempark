import 'package:drift/drift.dart';

import '../../../database/app_database.dart';

/// `numeric` do Postgres chega como número ou como string ("30.00").
num? _num(Object? v) => switch (v) {
      num n => n,
      String s => num.tryParse(s),
      _ => null,
    };

int _epoch(Object? iso) => DateTime.parse(iso as String).millisecondsSinceEpoch;

/// Estadia vinda do servidor (`GET /tickets/abertos`) → linha local. Nasce
/// `sincronizado`: o servidor já a tem, este aparelho não deve reenviá-la.
EstadiasCompanion estadiaRemotaParaCompanion(Map<String, dynamic> m, String patioId) {
  final agora = DateTime.now().millisecondsSinceEpoch;
  return EstadiasCompanion.insert(
    id: m['id'] as String,
    operacaoId: patioId,
    placa: (m['placa'] as String).toUpperCase(),
    tipoVeiculo: m['tipo_veiculo'] as String? ?? 'carro',
    tarifaId: m['tarifa_id'] as String,
    diariaValor: _num(m['diaria_valor'])!.toDouble(),
    diariaHoras: _num(m['diaria_horas'])!.toInt(),
    inicioEpoch: _epoch(m['inicio']),
    validaAteEpoch: _epoch(m['valida_ate']),
    diarias: _num(m['diarias'])!.toInt(),
    valorTotal: _num(m['valor_total'])!.toDouble(),
    syncStatus: const Value('sincronizado'),
    criadoEm: agora,
    atualizadoEm: agora,
  );
}

EstadiaPagamentosCompanion pagamentoRemotoParaCompanion(
  Map<String, dynamic> m,
  String estadiaId,
  String patioId,
) {
  final pagoEm = _epoch(m['pago_em']);
  return EstadiaPagamentosCompanion.insert(
    id: m['id'] as String,
    operacaoId: patioId,
    estadiaId: estadiaId,
    tipo: m['tipo'] as String,
    diarias: _num(m['diarias'])!.toInt(),
    valor: _num(m['valor'])!.toDouble(),
    formaPagamento: m['forma_pagamento'] as String,
    pagoEmEpoch: pagoEm,
    syncStatus: const Value('sincronizado'),
    criadoEm: pagoEm,
  );
}
