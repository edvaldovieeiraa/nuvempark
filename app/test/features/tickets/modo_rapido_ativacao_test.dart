import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/core/router/app_router.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';
import 'package:nuvempark_app/features/patio/domain/patio_model.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';
import 'package:nuvempark_app/features/tickets/presentation/navegacao_entrada.dart';

import '../../support/fakes.dart';

final _avulsa = TarifaConfig(
  id: 'tar-1',
  operacaoId: 'p1',
  nome: 'Padrão',
  tipoVeiculo: 'carro',
  ordem: 0,
  visivelOperador: true,
  fracaoInicialMinutos: 60,
  fracaoInicialValor: 10,
  fracaoAdicionalMinutos: 60,
  fracaoAdicionalValor: 5,
  tetoDiaria: 60,
  toleranciaMinutos: 10,
  pernoiteValor: 0,
  pernoiteHoraInicio: 22,
  pernoiteHoraFim: 6,
  vigenciaInicio: DateTime(2020),
);

PatioModel _patio({
  bool liberado = true,
  List<String> tipos = const ['carro'],
  List<TarifaConfig>? tarifas,
}) =>
    PatioModel(
      id: 'p1',
      nome: 'Pátio',
      codigo: 'P1',
      qtdVagas: 10,
      tiposVeiculo: tipos,
      formasPagamento: const [],
      motivosIsencao: const [],
      motivosCancelamento: const [],
      ticketCabecalho: const [],
      ticketRodape: const [],
      tarifas: tarifas ?? [_avulsa],
      sincronizadoEm: DateTime(2026),
      modoRapidoEntrada: liberado,
    );

void main() {
  group('preferência do aparelho', () {
    test('começa desligada, liga e desliga', () async {
      final s = TokenStorage(MemSecureStorage());
      expect(await s.readModoRapido(), isFalse);
      await s.saveModoRapido(true);
      expect(await s.readModoRapido(), isTrue);
      await s.saveModoRapido(false);
      expect(await s.readModoRapido(), isFalse);
    });

    test('sobrevive ao logout: é do aparelho, não do login', () async {
      final s = TokenStorage(MemSecureStorage());
      await s.saveModoRapido(true);
      await s.clearAll();
      expect(await s.readModoRapido(), isTrue);
    });
  });

  group('motivo de o modo rápido não estar disponível', () {
    test('tudo certo: nenhum motivo', () {
      expect(_patio().motivoModoRapidoIndisponivel, isNull);
    });

    test('pátio não liberou no painel', () {
      expect(_patio(liberado: false).motivoModoRapidoIndisponivel,
          contains('não está liberado'));
    });

    test('sem tipo de veículo', () {
      expect(_patio(tipos: []).motivoModoRapidoIndisponivel,
          contains('tipo de veículo'));
    });

    test('sem tabela avulsa para o tipo padrão', () {
      expect(_patio(tarifas: []).motivoModoRapidoIndisponivel,
          contains('tabela avulsa'));
    });
  });

  group('qual entrada o botão "Entrada" abre', () {
    test('rápida só com o pátio pronto e a preferência ligada', () {
      expect(rotaDeEntrada(_patio(), ligado: true), Routes.entradaRapida);
    });

    test('preferência desligada: entrada normal', () {
      expect(rotaDeEntrada(_patio(), ligado: false), Routes.entrada);
    });

    test('pátio desliberou no painel (edge 11): entrada normal', () {
      expect(rotaDeEntrada(_patio(liberado: false), ligado: true),
          Routes.entrada);
    });

    test('sem tabela avulsa: entrada normal', () {
      expect(rotaDeEntrada(_patio(tarifas: []), ligado: true), Routes.entrada);
    });

    test('pátio ainda não carregado: entrada normal', () {
      expect(rotaDeEntrada(null, ligado: true), Routes.entrada);
    });
  });
}
