import 'modelo.dart';

/// Preço de uma regra para uma duração, e até onde esse preço cobre.
class Preco {
  const Preco({
    required this.valorCentavos,
    required this.cobertoMinutos,
    required this.cobranca,
  });

  final int valorCentavos;

  /// Minutos pagos a partir do início da fatia (≥ a duração pedida).
  final int cobertoMinutos;
  final Cobranca cobranca;
}

/// A tabela de uma regra aplicada a [minutos]. PORT de
/// `api/src/lib/contrato/tabela.ts` (golden S01–S22 e S50–S54):
///  - a faixa vale até o limite INCLUSIVO; o preço é acumulado;
///  - depois da última faixa, cada fração começada é cobrada inteira;
///  - com "recomeçar", cada ciclo completo soma o maior valor e a tabela
///    recomeça do início no que sobra.
Preco precoDaTabela(Regra regra, int minutos) {
  final faixas = regra.faixas;
  if (faixas.isEmpty) throw StateError('regra "${regra.nome}" sem faixas');
  final ultima = faixas.last;

  for (final f in faixas) {
    if (minutos <= f.ateMinutos) {
      return Preco(
        valorCentavos: f.valorCentavos,
        cobertoMinutos: f.ateMinutos,
        cobranca: CobrancaFaixa(f.ateMinutos),
      );
    }
  }

  if (regra.recomecarTabela) {
    final ciclos = minutos ~/ ultima.ateMinutos;
    final sobra = minutos - ciclos * ultima.ateMinutos;
    final base = ciclos * ultima.valorCentavos;
    final cobertoCiclos = ciclos * ultima.ateMinutos;
    if (sobra == 0) {
      return Preco(
        valorCentavos: base,
        cobertoMinutos: cobertoCiclos,
        cobranca: CobrancaCiclos(ciclos: ciclos, resto: null),
      );
    }
    final resto = precoDaTabela(regra, sobra);
    return Preco(
      valorCentavos: base + resto.valorCentavos,
      cobertoMinutos: cobertoCiclos + resto.cobertoMinutos,
      cobranca: CobrancaCiclos(ciclos: ciclos, resto: resto.cobranca),
    );
  }

  final fracao = regra.fracao;
  if (fracao == null) throw StateError('regra "${regra.nome}" sem fração nem recomeço');
  // Divisão inteira arredondando para cima (minutos > última faixa aqui).
  final excedente = minutos - ultima.ateMinutos;
  final fracoes = (excedente + fracao.minutos - 1) ~/ fracao.minutos;
  return Preco(
    valorCentavos: ultima.valorCentavos + fracoes * fracao.valorCentavos,
    cobertoMinutos: ultima.ateMinutos + fracoes * fracao.minutos,
    cobranca: CobrancaFracao(ateMinutos: ultima.ateMinutos, fracoes: fracoes),
  );
}
