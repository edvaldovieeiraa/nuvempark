/// Modelo do contrato do motor de tarifa v2 (spec `tarifa-contrato`).
///
/// PORT de `api/src/lib/contrato/modelo.ts`: mesmos nomes, mesmos campos.
/// O contrato chega como JSON em snake_case (coluna `tarifas.contrato`,
/// golden). Dinheiro em CENTAVOS inteiros, tempo em MINUTOS inteiros.
library;

class Faixa {
  const Faixa({required this.ateMinutos, required this.valorCentavos});

  /// Limite inclusivo, em minutos desde o início da fatia.
  final int ateMinutos;

  /// Preço ACUMULADO até este limite.
  final int valorCentavos;
}

class Fracao {
  const Fracao({required this.minutos, required this.valorCentavos});

  final int minutos;
  final int valorCentavos;
}

class Regra {
  Regra({
    required this.nome,
    this.inicio,
    this.fim,
    this.dias,
    this.usarMinutosPagos = false,
    this.recomecarTabela = false,
    required this.faixas,
    this.fracao,
  });

  String nome;

  /// Minuto do dia (0–1439) em que a janela começa. Nulo na Padrão.
  int? inicio;

  /// Minuto do dia em que a janela termina; menor que [inicio] = cruza a
  /// meia-noite.
  int? fim;

  /// Dias ISO (1 = segunda … 7 = domingo) em que a janela COMEÇA. Nulo na
  /// Padrão.
  List<int>? dias;
  bool usarMinutosPagos;
  bool recomecarTabela;
  List<Faixa> faixas;
  Fracao? fracao;
}

class Contrato {
  Contrato({
    this.maisDe24h = false,
    this.diariaCentavos,
    this.cobrarMenorValor = false,
    required this.regras,
  });

  final int versao = 1;
  bool maisDe24h;
  int? diariaCentavos;
  bool cobrarMenorValor;

  /// A primeira é sempre a "Padrão".
  List<Regra> regras;
}

/// Como o valor de uma fatia saiu da tabela da regra.
sealed class Cobranca {
  const Cobranca();
}

class CobrancaFaixa extends Cobranca {
  const CobrancaFaixa(this.ateMinutos);
  final int ateMinutos;
}

class CobrancaFracao extends Cobranca {
  const CobrancaFracao({required this.ateMinutos, required this.fracoes});
  final int ateMinutos;
  final int fracoes;
}

class CobrancaCiclos extends Cobranca {
  const CobrancaCiclos({required this.ciclos, required this.resto});
  final int ciclos;
  final Cobranca? resto;
}

sealed class Fatia {
  const Fatia({required this.inicio, required this.fim, required this.valorCentavos});

  final DateTime inicio;

  /// Até onde a fatia está paga.
  final DateTime fim;
  final int valorCentavos;
}

class FatiaRegra extends Fatia {
  const FatiaRegra({
    required this.regra,
    required super.inicio,
    required super.fim,
    required this.minutos,
    required this.cobranca,
    required super.valorCentavos,
  });

  final String regra;

  /// Minutos cobrados nesta fatia (entrada da tabela).
  final int minutos;
  final Cobranca cobranca;
}

class FatiaDiarias extends Fatia {
  const FatiaDiarias({
    required this.quantidade,
    required super.inicio,
    required super.fim,
    required super.valorCentavos,
  });

  final int quantidade;
}

class ResultadoContrato {
  const ResultadoContrato({
    required this.totalCentavos,
    required this.minutosRestantes,
    required this.pagoAte,
    required this.fatias,
  });

  final int totalCentavos;

  /// Minutos já pagos depois da saída.
  final int minutosRestantes;
  final DateTime pagoAte;
  final List<Fatia> fatias;
}

/// Erro de leitura: o JSON não tem a forma de um contrato.
class ContratoMalformado implements Exception {
  const ContratoMalformado(this.caminho);
  final String caminho;

  @override
  String toString() => 'contrato malformado em $caminho';
}

/// Lê o JSON do contrato. Só confere a FORMA (tipos dos campos); as regras de
/// negócio ficam em `validar`.
Contrato lerContrato(Object? json) {
  final c = _objeto(json, 'contrato');
  if (c['versao'] != 1) throw const ContratoMalformado('versao');
  final regras = c['regras'];
  if (regras is! List) throw const ContratoMalformado('regras');
  return Contrato(
    maisDe24h: _bool(c['mais_de_24h'], 'mais_de_24h'),
    diariaCentavos: _inteiroOuNulo(c['diaria_centavos'], 'diaria_centavos'),
    cobrarMenorValor: _bool(c['cobrar_menor_valor'], 'cobrar_menor_valor'),
    regras: [for (var i = 0; i < regras.length; i++) _lerRegra(regras[i], 'regras[$i]')],
  );
}

Regra _lerRegra(Object? json, String caminho) {
  final r = _objeto(json, caminho);
  final faixas = r['faixas'];
  if (faixas is! List) throw ContratoMalformado('$caminho.faixas');
  final dias = r['dias'];
  if (dias != null && dias is! List) throw ContratoMalformado('$caminho.dias');
  final fracao = r['fracao'];
  return Regra(
    nome: _texto(r['nome'], '$caminho.nome'),
    inicio: _horaOuNulo(r['inicio'], '$caminho.inicio'),
    fim: _horaOuNulo(r['fim'], '$caminho.fim'),
    dias: dias is List
        ? [for (var i = 0; i < dias.length; i++) _inteiro(dias[i], '$caminho.dias[$i]')]
        : null,
    usarMinutosPagos: _bool(r['usar_minutos_pagos'], '$caminho.usar_minutos_pagos'),
    recomecarTabela: _bool(r['recomecar_tabela'], '$caminho.recomecar_tabela'),
    faixas: [
      for (var i = 0; i < faixas.length; i++)
        () {
          final o = _objeto(faixas[i], '$caminho.faixas[$i]');
          return Faixa(
            ateMinutos: _inteiro(o['ate_minutos'], '$caminho.faixas[$i].ate_minutos'),
            valorCentavos: _inteiro(o['valor_centavos'], '$caminho.faixas[$i].valor_centavos'),
          );
        }(),
    ],
    fracao: fracao == null
        ? null
        : () {
            final o = _objeto(fracao, '$caminho.fracao');
            return Fracao(
              minutos: _inteiro(o['minutos'], '$caminho.fracao.minutos'),
              valorCentavos: _inteiro(o['valor_centavos'], '$caminho.fracao.valor_centavos'),
            );
          }(),
  );
}

Map<String, Object?> _objeto(Object? v, String caminho) {
  if (v is! Map) throw ContratoMalformado(caminho);
  return v.cast<String, Object?>();
}

bool _bool(Object? v, String caminho) {
  if (v is! bool) throw ContratoMalformado(caminho);
  return v;
}

String _texto(Object? v, String caminho) {
  if (v is! String) throw ContratoMalformado(caminho);
  return v;
}

int _inteiro(Object? v, String caminho) {
  if (v is int) return v;
  // JSON decodificado pode trazer 1.0 para um inteiro; 1.5 não é inteiro.
  if (v is double && v == v.truncateToDouble()) return v.toInt();
  throw ContratoMalformado(caminho);
}

int? _inteiroOuNulo(Object? v, String caminho) => v == null ? null : _inteiro(v, caminho);

final _hora = RegExp(r'^(\d{2}):(\d{2})$');

/// "HH:MM" → minuto do dia.
int? _horaOuNulo(Object? v, String caminho) {
  if (v == null) return null;
  final m = v is String ? _hora.firstMatch(v) : null;
  if (m == null) throw ContratoMalformado(caminho);
  final h = int.parse(m.group(1)!);
  final min = int.parse(m.group(2)!);
  if (h > 23 || min > 59) throw ContratoMalformado(caminho);
  return h * 60 + min;
}
