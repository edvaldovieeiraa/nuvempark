import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/caixa/domain/caixa_model.dart';
import 'package:nuvempark_app/features/caixa/presentation/providers/caixa_provider.dart';
import 'package:nuvempark_app/features/patio/domain/patio_model.dart';
import 'package:nuvempark_app/features/patio/presentation/providers/patio_provider.dart';

final patioTeste = PatioModel(
  id: 'p1',
  nome: 'Pátio Teste',
  codigo: 'P1',
  qtdVagas: 10,
  tiposVeiculo: const ['carro'],
  formasPagamento: const ['dinheiro', 'pix'],
  motivosIsencao: const [],
  motivosCancelamento: const [],
  ticketCabecalho: const [],
  ticketRodape: const [],
  tarifas: const [],
  sincronizadoEm: DateTime(2026),
);

class PatioFixo extends PatioNotifier {
  @override
  Future<PatioModel?> build() async => patioTeste;
}

class CaixaFechado extends CaixaSessaoNotifier {
  @override
  Future<CaixaModel?> build() async => null;
}

Estadia estadiaTeste({required DateTime validaAte}) => Estadia(
      id: 'e1',
      operacaoId: 'p1',
      placa: 'RTO4F21',
      tipoVeiculo: 'carro',
      tarifaId: 't',
      diariaValor: 30,
      diariaHoras: 24,
      inicioEpoch: validaAte.subtract(const Duration(hours: 72)).millisecondsSinceEpoch,
      validaAteEpoch: validaAte.millisecondsSinceEpoch,
      diarias: 3,
      valorTotal: 90,
      syncStatus: 'sincronizado',
      criadoEm: 0,
      atualizadoEm: 0,
    );

Widget montar(Widget filho, {List<Override> overrides = const []}) => ProviderScope(
      overrides: [
        patioNotifierProvider.overrideWith(PatioFixo.new),
        caixaSessaoNotifierProvider.overrideWith(CaixaFechado.new),
        ...overrides,
      ],
      child: MaterialApp(home: Scaffold(body: filho)),
    );
