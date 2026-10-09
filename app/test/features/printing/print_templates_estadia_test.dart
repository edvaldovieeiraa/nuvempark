import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/printing/data/print_templates.dart';

String _texto(List<int> bytes) => latin1.decode(bytes, allowInvalid: true);

final _vence = DateTime(2026, 10, 11, 14, 30);

void main() {
  test('contratação: um papel só — cupom de entrada com QR + bloco da estadia', () {
    final t = _texto(PrintTemplates.ticketEntrada(
      ticketId: 'abcdef12-0000-0000-0000-000000000000',
      placa: 'RTO4F21',
      tipoVeiculo: 'carro',
      entrada: DateTime(2026, 10, 8, 14, 30),
      operacaoNome: 'Patio Demonstracao',
      estadia: BlocoEstadia(
        titulo: 'HOSPEDE - ESTADIA PAGA',
        validaAte: _vence,
        diarias: 3,
        diariaValor: 30,
        total: 90,
        formaPagamento: 'pix',
      ),
    ));
    expect(t, contains('TICKET DE ENTRADA'));
    expect(t, contains('HOSPEDE - ESTADIA PAGA'));
    expect(t, contains('3 x R\$ 30,00'));
    expect(t, contains('R\$ 90,00'));
    expect(t, contains('VALIDA ATE 11/10 14:30'));
    expect(t, contains('ID: ABCDEF12'), reason: 'o QR e o id continuam');
    for (final linha in t.split('\n').where((l) => l.startsWith('Diarias'))) {
      expect(linha.length, lessThanOrEqualTo(PrintTemplates.cols58mm));
    }
  });

  test('entrada de hóspede sem pagamento: só a validade', () {
    final t = _texto(PrintTemplates.ticketEntrada(
      ticketId: 'abcdef12-0000-0000-0000-000000000000',
      placa: 'RTO4F21',
      tipoVeiculo: 'carro',
      entrada: DateTime(2026, 10, 9, 9, 40),
      operacaoNome: 'Patio',
      estadia: BlocoEstadia(titulo: 'HOSPEDE', validaAte: _vence),
    ));
    expect(t, contains('VALIDA ATE 11/10 14:30'));
    expect(t, isNot(contains('Total')));
  });

  test('renovação sem entrada: comprovante só com o bloco', () {
    final t = _texto(PrintTemplates.comprovanteEstadia(
      placa: 'RTO4F21',
      operacaoNome: 'Patio',
      estadia: BlocoEstadia(
        titulo: 'RENOVACAO DE ESTADIA',
        validaAte: DateTime(2026, 10, 12, 14, 30),
        diarias: 1,
        diariaValor: 30,
        total: 30,
        formaPagamento: 'dinheiro',
      ),
    ));
    expect(t, contains('RENOVACAO DE ESTADIA'));
    expect(t, contains('RTO4F21'));
    expect(t, contains('VALIDA ATE 12/10 14:30'));
    expect(t, isNot(contains('TICKET DE ENTRADA')));
  });
}
