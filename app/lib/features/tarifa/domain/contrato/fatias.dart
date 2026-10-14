import 'dart:math' as math;

import 'fuso.dart';
import 'modelo.dart';
import 'tabela.dart';

const _msMinuto = 60000;

/// Uma ocorrência concreta da janela de uma regra.
class _Janela {
  const _Janela(this.regra, this.de, this.ate);
  final Regra regra;
  final int de;
  final int ate;
}

class Fatiamento {
  const Fatiamento(this.fatias, this.pagoAte);
  final List<Fatia> fatias;
  final int pagoAte;
}

/// Corta a estadia [e, s] (ms, minuto cheio) pelas janelas das regras.
/// PORT de `api/src/lib/contrato/fatias.ts` — ver lá as regras e as escolhas
/// que o CloudPark não mostrou.
Fatiamento fatiar(int e, int s, List<Regra> regras, String fuso) {
  if (regras.isEmpty) throw StateError('contrato sem regras');
  final padrao = regras.first;
  final janelas = _gerarJanelas(regras.sublist(1), e, s, fuso);

  int menor(int a, int? b) => b == null ? a : math.min(a, b);

  final fatias = <Fatia>[];
  var cursor = e;
  // As janelas não se sobrepõem (`validar`) e o cursor só avança: um ponteiro
  // para a primeira janela que ainda não terminou basta.
  var i = 0;
  for (;;) {
    while (i < janelas.length && janelas[i].ate <= cursor) {
      i++;
    }
    final atual = i < janelas.length ? janelas[i] : null;
    final janela = atual != null && atual.de <= cursor ? atual : null;
    final proxima = janela != null ? (i + 1 < janelas.length ? janelas[i + 1] : null) : atual;
    final proximoInicio = proxima?.de;
    final regra = janela?.regra ?? padrao;
    final limite = janela != null ? janela.ate : proximoInicio;
    final minutos = (menor(s, limite) - cursor) ~/ _msMinuto;
    final preco = precoDaTabela(regra, minutos);
    final cobertoAte = cursor + preco.cobertoMinutos * _msMinuto;
    final fim = janela != null && regra.usarMinutosPagos
        ? menor(cobertoAte, proximoInicio)
        : menor(cobertoAte, limite);

    fatias.add(FatiaRegra(
      regra: regra.nome,
      inicio: DateTime.fromMillisecondsSinceEpoch(cursor, isUtc: true),
      fim: DateTime.fromMillisecondsSinceEpoch(fim, isUtc: true),
      minutos: minutos,
      cobranca: preco.cobranca,
      valorCentavos: preco.valorCentavos,
    ));
    if (s <= fim) return Fatiamento(fatias, fim);
    cursor = fim;
  }
}

/// Janelas de cada regra entre a véspera da entrada e dois dias depois da
/// saída, ordenadas pelo início.
List<_Janela> _gerarJanelas(List<Regra> regras, int e, int s, String fuso) {
  final janelas = <_Janela>[];
  final primeiro = partesLocais(DateTime.fromMillisecondsSinceEpoch(e, isUtc: true), fuso);
  final ultimo = partesLocais(DateTime.fromMillisecondsSinceEpoch(s, isUtc: true), fuso);
  final dias = DateTime.utc(ultimo.ano, ultimo.mes, ultimo.dia)
      .difference(DateTime.utc(primeiro.ano, primeiro.mes, primeiro.dia))
      .inDays;
  for (var k = -1; k <= dias + 2; k++) {
    final d = somarDias(primeiro.ano, primeiro.mes, primeiro.dia, k);
    final diaSemana = DateTime.utc(d.ano, d.mes, d.dia).weekday;
    for (final regra in regras) {
      final inicio = regra.inicio;
      final fim = regra.fim;
      if (inicio == null || fim == null || !(regra.dias?.contains(diaSemana) ?? false)) continue;
      final de = instanteLocal(d.ano, d.mes, d.dia, inicio, fuso).millisecondsSinceEpoch;
      final fimDia = fim > inicio ? d : somarDias(d.ano, d.mes, d.dia, 1);
      final ate = instanteLocal(fimDia.ano, fimDia.mes, fimDia.dia, fim, fuso).millisecondsSinceEpoch;
      janelas.add(_Janela(regra, de, ate));
    }
  }
  janelas.sort((a, b) => a.de.compareTo(b.de));
  return janelas;
}
