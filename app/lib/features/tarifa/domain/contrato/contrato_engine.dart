import 'fatias.dart';
import 'modelo.dart';
import 'tabela.dart';
import 'validar.dart';

export 'modelo.dart';
export 'validar.dart' show ErroContrato, validar;

/// Motor de tarifa por contrato (v2) — spec `.planning/specs/tarifa-contrato.md`.
///
/// PORT de `api/src/lib/contrato/calcular.ts`. Puro, sem I/O e sem relógio:
/// recebe instantes e o fuso IANA do pátio. As três cópias leem o mesmo
/// golden (`golden/tarifa-contrato.json`).
class ContratoInvalido implements Exception {
  const ContratoInvalido(this.erros);
  final List<ErroContrato> erros;

  @override
  String toString() => 'contrato inválido: ${erros.join(', ')}';
}

const _msMinuto = 60000;
const _minutosDia = 24 * 60;

/// Acima disso é dado errado (entrada zerada, relógio quebrado), não estadia.
const _maxMinutosEstadia = 10 * 366 * _minutosDia;

/// Valor da estadia pelo contrato. Duração em minutos inteiros, truncando os
/// segundos (como o motor v1); as janelas partem da entrada truncada ao minuto.
ResultadoContrato calcular({
  required DateTime entrada,
  required DateTime saida,
  required Contrato contrato,
  required String fuso,
}) {
  if (saida.isBefore(entrada)) {
    throw ArgumentError('saida deve ser igual ou posterior à entrada');
  }
  final erros = validar(contrato);
  if (erros.isNotEmpty) throw ContratoInvalido(erros);

  final msEntrada = entrada.millisecondsSinceEpoch;
  final minutos = (saida.millisecondsSinceEpoch - msEntrada) ~/ _msMinuto;
  if (minutos > _maxMinutosEstadia) throw ArgumentError('estadia acima de 10 anos');
  final e = (msEntrada ~/ _msMinuto) * _msMinuto;
  final s = e + minutos * _msMinuto;

  final diaria = contrato.diariaCentavos;
  Fatiamento escolhido;
  if (diaria != null) {
    escolhido = _comDiaria(e, minutos, contrato, diaria);
  } else {
    escolhido = fatiar(e, s, contrato.regras, fuso);
    if (contrato.cobrarMenorValor) {
      // Menor valor entre todas as regras e só a Padrão. Empate fica com
      // todas as regras.
      final soPadrao = fatiar(e, s, contrato.regras.sublist(0, 1), fuso);
      if (_total(soPadrao.fatias) < _total(escolhido.fatias)) escolhido = soPadrao;
    }
  }

  return ResultadoContrato(
    totalCentavos: _total(escolhido.fatias),
    minutosRestantes: (escolhido.pagoAte - s) ~/ _msMinuto,
    pagoAte: DateTime.fromMillisecondsSinceEpoch(escolhido.pagoAte, isUtc: true),
    fatias: escolhido.fatias,
  );
}

/// Diária a cada 24 h corridas desde a entrada: até 24 h, o menor entre a
/// diária e a tabela; acima disso, diárias cheias + o menor entre a diária e a
/// tabela aplicada à sobra. Empate fica com a diária.
Fatiamento _comDiaria(int e, int minutos, Contrato contrato, int diaria) {
  final padrao = contrato.regras.first;
  final cheias = minutos <= _minutosDia ? 0 : (minutos - 1) ~/ _minutosDia;
  final sobra = minutos - cheias * _minutosDia;
  final inicioSobra = e + cheias * _minutosDia * _msMinuto;
  final preco = precoDaTabela(padrao, sobra);

  FatiaDiarias diarias(int quantidade) => FatiaDiarias(
        quantidade: quantidade,
        inicio: DateTime.fromMillisecondsSinceEpoch(e, isUtc: true),
        fim: DateTime.fromMillisecondsSinceEpoch(
          e + quantidade * _minutosDia * _msMinuto,
          isUtc: true,
        ),
        valorCentavos: quantidade * diaria,
      );

  if (preco.valorCentavos >= diaria) {
    final f = diarias(cheias + 1);
    return Fatiamento([f], f.fim.millisecondsSinceEpoch);
  }
  final fim = inicioSobra + preco.cobertoMinutos * _msMinuto;
  final tabela = FatiaRegra(
    regra: padrao.nome,
    inicio: DateTime.fromMillisecondsSinceEpoch(inicioSobra, isUtc: true),
    fim: DateTime.fromMillisecondsSinceEpoch(fim, isUtc: true),
    minutos: sobra,
    cobranca: preco.cobranca,
    valorCentavos: preco.valorCentavos,
  );
  return Fatiamento(cheias > 0 ? [diarias(cheias), tabela] : [tabela], fim);
}

int _total(List<Fatia> fatias) => fatias.fold(0, (soma, f) => soma + f.valorCentavos);
