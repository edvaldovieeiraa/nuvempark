import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';
import 'package:nuvempark_app/features/tarifa/domain/fare_result.dart';
import 'package:nuvempark_app/features/tarifa/domain/tarifa_engine.dart';
import 'package:nuvempark_app/features/vouchers/domain/voucher_engine.dart';
import 'package:nuvempark_app/features/vouchers/domain/voucher_regra.dart';

void main() {
  // MESMA tarifa do tarifa_engine_test, de propósito: os dois conjuntos falam
  // dos mesmos números, e um resultado pode ser conferido contra o outro.
  // fracao inicial 15min/R$5 · adicional 15min/R$3 · teto R$60
  // tolerancia 10min · pernoite R$25 (22h–06h)
  final tarifa = TarifaConfig(
    id: 'test-tarifa',
    operacaoId: 'op-zz',
    nome: 'Padrão',
    tipoVeiculo: 'carro',
    ordem: 0,
    visivelOperador: true,
    fracaoInicialMinutos: 15,
    fracaoInicialValor: 5.00,
    fracaoAdicionalMinutos: 15,
    fracaoAdicionalValor: 3.00,
    tetoDiaria: 60.00,
    toleranciaMinutos: 10,
    pernoiteValor: 25.00,
    pernoiteHoraInicio: 22,
    pernoiteHoraFim: 6,
    vigenciaInicio: DateTime.utc(2020),
    vigenciaFim: null,
  );

  final diaBase = DateTime(2024, 1, 15);
  DateTime as(int h, [int m = 0]) =>
      diaBase.add(Duration(hours: h, minutes: m));

  VoucherRegra regra({
    int abater = 0,
    int percentual = 0,
    double valor = 0,
    String nome = 'Regra',
  }) =>
      VoucherRegra(
        id: 'r1',
        nome: nome,
        abaterMinutos: abater,
        descontoPercentual: percentual,
        descontoValor: valor,
      );

  // Estadia de 3h (10h→13h), longe da janela de pernoite.
  // 180min: 5,00 + ceil(165/15)=11 adicionais x 3,00 = R$ 38,00
  const valor3h = 38.00;

  group('Os quatro casos que o negócio pediu', () {
    test('isenção de 2h e depois fracionado — abate só as duas primeiras horas',
        () {
      final r = VoucherEngine.aplicar(
        entrada: as(10),
        saida: as(13),
        tarifa: tarifa,
        regra: regra(abater: 120, nome: '2 horas'),
        parceiroNome: 'Loja X',
      );

      // Sobra 1h de cobrança: 5,00 + ceil(45/15)=3 x 3,00 = R$ 14,00
      expect(r.valorOriginal, valor3h);
      expect(r.valorFinal, 14.00);
      expect(r.valorAbatido, 24.00);
    });

    test('isenção total — cliente não paga e o parceiro custeia tudo', () {
      final r = VoucherEngine.aplicar(
        entrada: as(10),
        saida: as(13),
        tarifa: tarifa,
        regra: regra(percentual: 100, nome: 'Isenção total'),
        parceiroNome: 'Loja X',
      );

      expect(r.valorFinal, 0);
      expect(r.valorAbatido, valor3h);
      expect(r.isentouTudo, isTrue);
    });

    test('isenção de 12h cobre uma estadia de 3h por inteiro', () {
      final r = VoucherEngine.aplicar(
        entrada: as(10),
        saida: as(13),
        tarifa: tarifa,
        regra: regra(abater: 720, nome: '12 horas'),
        parceiroNome: 'Loja X',
      );

      expect(r.valorFinal, 0);
      expect(r.valorAbatido, valor3h);
    });

    test('isenção de 24h num carro de 20 min abate R\$ 8,00, e não um dia', () {
      // O ponto do teste: `valor_abatido` é a DIFERENÇA do que seria cobrado,
      // não o tamanho da regra. Se fosse o tamanho da regra, o parceiro
      // faturado pagaria uma diária por um cliente de 20 minutos.
      final r = VoucherEngine.aplicar(
        entrada: as(10),
        saida: as(10, 20),
        tarifa: tarifa,
        regra: regra(abater: 1440, nome: '24 horas'),
        parceiroNome: 'Loja X',
      );

      expect(r.valorOriginal, 8.00); // 5,00 + 1 adicional
      expect(r.valorFinal, 0);
      expect(r.valorAbatido, 8.00);
    });
  });

  group('Bordas', () {
    test('abater mais que a estadia não estoura o assert do TarifaEngine', () {
      // `TarifaEngine.calcular` tem `assert(!saida.isBefore(entrada))`. Sem o
      // trave em `saida`, a entrada efetiva passaria da saída e o app quebraria
      // em debug — justamente no caso mais comum (isenção longa, estadia curta).
      expect(
        () => VoucherEngine.aplicar(
          entrada: as(10),
          saida: as(10, 5),
          tarifa: tarifa,
          regra: regra(abater: 100000),
          parceiroNome: 'Loja X',
        ),
        returnsNormally,
      );
    });

    test('desconto em valor nunca produz cobrança negativa', () {
      final r = VoucherEngine.aplicar(
        entrada: as(10),
        saida: as(10, 20),
        tarifa: tarifa,
        regra: regra(valor: 999.99),
        parceiroNome: 'Loja X',
      );

      expect(r.valorFinal, 0);
      expect(r.valorAbatido, 8.00);
    });

    test('regra neutra devolve exatamente o TarifaEngine — motor intocado', () {
      final semVoucher = TarifaEngine.calcular(
        entrada: as(10),
        saida: as(13),
        tarifa: tarifa,
      );
      final r = VoucherEngine.aplicar(
        entrada: as(10),
        saida: as(13),
        tarifa: tarifa,
        regra: regra(),
        parceiroNome: 'Loja X',
      );

      expect(r.valorFinal, semVoucher.valor);
      expect(r.valorAbatido, 0);
      expect(r.semEfeito, isTrue);
    });

    test('percentual e valor fixo se combinam, nessa ordem', () {
      // 38,00 -> 50% = 19,00 -> menos 4,00 = 15,00
      final r = VoucherEngine.aplicar(
        entrada: as(10),
        saida: as(13),
        tarifa: tarifa,
        regra: regra(percentual: 50, valor: 4.00),
        parceiroNome: 'Loja X',
      );

      expect(r.valorFinal, 15.00);
      expect(r.valorAbatido, 23.00);
    });

    test('o valor final nunca tem terceira casa decimal', () {
      // Dinheiro arredondado no motor, e não na tela: cupom, caixa e a soma da
      // competência do parceiro precisam bater no centavo.
      for (final p in [3, 7, 13, 17, 33, 41, 67, 83, 99]) {
        final r = VoucherEngine.aplicar(
          entrada: as(10),
          saida: as(13),
          tarifa: tarifa,
          regra: regra(percentual: p),
          parceiroNome: 'Loja X',
        );
        final centavos = r.valorFinal * 100;
        expect(centavos, closeTo(centavos.roundToDouble(), 1e-9),
            reason: '$p% deixou fração de centavo: ${r.valorFinal}');
      }
    });
  });

  group('O que a tela mostra', () {
    test('duração é a REAL, não a efetiva depois do abatimento', () {
      // Um cupom dizendo "1h" para um carro que ficou 3h no pátio seria errado,
      // e o cliente notaria antes do operador.
      final r = VoucherEngine.aplicar(
        entrada: as(10),
        saida: as(13),
        tarifa: tarifa,
        regra: regra(abater: 120),
        parceiroNome: 'Loja X',
      );

      expect(r.duracaoMinutos, 180);
    });

    test('a origem do desconto viaja junto para o operador ver', () {
      final r = VoucherEngine.aplicar(
        entrada: as(10),
        saida: as(13),
        tarifa: tarifa,
        regra: regra(abater: 120, nome: '2 horas grátis'),
        parceiroNome: 'Padaria do Zé',
      );

      expect(r.regraNome, '2 horas grátis');
      expect(r.parceiroNome, 'Padaria do Zé');
    });

    test('o abatimento pode mudar o MOTIVO, e não só o valor', () {
      // Estadia de 25 min com 20 min abatidos cai na tolerância de 10 min.
      // É o comportamento certo: "20 minutos grátis" significa que eles não
      // existem para efeito de cobrança, inclusive para as regras especiais.
      final r = VoucherEngine.aplicar(
        entrada: as(10),
        saida: as(10, 25),
        tarifa: tarifa,
        regra: regra(abater: 20),
        parceiroNome: 'Loja X',
      );

      expect(r.semVoucher.motivo, FareMotivo.normal);
      expect(r.valorFinal, 0);
    });
  });
}
