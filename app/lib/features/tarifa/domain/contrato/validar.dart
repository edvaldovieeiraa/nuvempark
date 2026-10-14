import 'modelo.dart';

/// Regras de negócio do contrato (spec, requisito 14). PORT de
/// `api/src/lib/contrato/validar.ts`: mesmos códigos e caminhos.
/// `calcular` recusa o que `validar` recusar.
class ErroContrato {
  const ErroContrato(this.caminho, this.codigo);

  /// Caminho no JSON (snake_case), ex.: `regras[1].faixas[0].ate_minutos`.
  final String caminho;
  final String codigo;

  @override
  String toString() => '$caminho:$codigo';
}

/// "Até 23:59".
const limiteMinutos = 23 * 60 + 59;

/// "Até 999 h", com "regras com mais de 24 horas".
const limiteMinutosMais24h = 999 * 60;

const _minutosSemana = 7 * 24 * 60;

List<ErroContrato> validar(Contrato c) {
  final erros = <ErroContrato>[];
  void erro(String caminho, String codigo) => erros.add(ErroContrato(caminho, codigo));

  if (c.regras.isEmpty) {
    erro('regras', 'sem_regras');
    return erros;
  }

  final limite = c.maisDe24h ? limiteMinutosMais24h : limiteMinutos;
  final nomes = <String>{};

  for (var i = 0; i < c.regras.length; i++) {
    final r = c.regras[i];
    final p = 'regras[$i]';
    if (i == 0) {
      if (r.nome != 'Padrão') erro('$p.nome', 'padrao_nome');
      if (r.inicio != null || r.fim != null || r.dias != null) erro(p, 'padrao_com_horario');
      if (r.usarMinutosPagos) erro('$p.usar_minutos_pagos', 'padrao_usar_minutos_pagos');
    } else {
      final nome = r.nome.trim();
      if (nome.isEmpty) {
        erro('$p.nome', 'nome_vazio');
      } else if (nome == 'Padrão') {
        erro('$p.nome', 'nome_padrao_repetido');
      } else if (nomes.contains(nome)) {
        erro('$p.nome', 'nome_repetido');
      }
      nomes.add(nome);

      if (r.inicio == null || r.fim == null) {
        erro(p, 'janela_incompleta');
      } else if (r.inicio == r.fim) {
        erro(p, 'janela_vazia');
      }
      final dias = r.dias;
      if (dias == null || dias.isEmpty) {
        erro('$p.dias', 'sem_dias');
      } else if (dias.any((d) => d < 1 || d > 7) || dias.toSet().length != dias.length) {
        erro('$p.dias', 'dia_invalido');
      }

      // Combinações que os casos do CloudPark não provam (plano, Fase 0).
      if (r.recomecarTabela) erro('$p.recomecar_tabela', 'nao_provado_recomeco_em_regra');
      if (r.usarMinutosPagos && c.regras.length > 2) {
        erro('$p.usar_minutos_pagos', 'nao_provado_minutos_pagos_com_regras');
      }
    }
    _validarTabela(r, p, limite, erro);
  }

  _validarSobreposicao(c.regras, erro);

  if (c.maisDe24h) {
    if (c.diariaCentavos != null) erro('diaria_centavos', 'mais_de_24h_com_diaria');
    if (c.regras.length > 1) erro('regras', 'mais_de_24h_com_regras');
  }
  final diaria = c.diariaCentavos;
  if (diaria != null) {
    if (diaria <= 0) {
      erro('diaria_centavos', 'diaria_invalida');
    } else if (c.regras.length > 1) {
      erro('diaria_centavos', 'nao_provado_diaria_com_regras');
    }
  }
  if (c.cobrarMenorValor && c.regras.length < 2) {
    erro('cobrar_menor_valor', 'menor_valor_sem_regras');
  }
  return erros;
}

void _validarTabela(
  Regra r,
  String p,
  int limite,
  void Function(String caminho, String codigo) erro,
) {
  if (r.faixas.isEmpty) erro('$p.faixas', 'sem_faixas');
  for (var j = 0; j < r.faixas.length; j++) {
    final f = r.faixas[j];
    final q = '$p.faixas[$j]';
    final anterior = j > 0 ? r.faixas[j - 1] : null;
    if (f.ateMinutos < 1) {
      erro('$q.ate_minutos', 'faixa_minimo');
    } else if (f.ateMinutos > limite) {
      erro('$q.ate_minutos', 'acima_do_limite');
    } else if (anterior != null && f.ateMinutos <= anterior.ateMinutos) {
      erro('$q.ate_minutos', 'faixa_fora_de_ordem');
    }
    if (f.valorCentavos < 0) {
      erro('$q.valor_centavos', 'valor_negativo');
    } else if (anterior != null && f.valorCentavos < anterior.valorCentavos) {
      erro('$q.valor_centavos', 'valor_menor_que_anterior');
    }
  }

  final fracao = r.fracao;
  if (r.recomecarTabela) {
    if (fracao != null) erro('$p.fracao', 'recomeco_com_fracao');
    return;
  }
  if (fracao == null) {
    erro('$p.fracao', 'sem_fracao_nem_recomeco');
    return;
  }
  if (fracao.minutos < 1) {
    erro('$p.fracao.minutos', 'fracao_minimo');
  } else if (fracao.minutos > limite) {
    erro('$p.fracao.minutos', 'acima_do_limite');
  }
  if (fracao.valorCentavos < 0) erro('$p.fracao.valor_centavos', 'valor_negativo');
}

/// Duas regras não podem cobrir o mesmo minuto da semana (segunda 00:00 = 0).
/// A janela que cruza a meia-noite avança no dia seguinte, e a de domingo que
/// cruza volta para segunda.
void _validarSobreposicao(
  List<Regra> regras,
  void Function(String caminho, String codigo) erro,
) {
  final intervalos = <({int regra, int de, int ate})>[];
  for (var i = 1; i < regras.length; i++) {
    final r = regras[i];
    final inicio = r.inicio;
    final fim = r.fim;
    final dias = r.dias;
    if (inicio == null || fim == null || inicio == fim || dias == null) continue;
    final duracao = fim > inicio ? fim - inicio : fim + 1440 - inicio;
    for (final d in dias.toSet()) {
      if (d < 1 || d > 7) continue;
      final de = (d - 1) * 1440 + inicio;
      final ate = de + duracao;
      if (ate <= _minutosSemana) {
        intervalos.add((regra: i, de: de, ate: ate));
      } else {
        intervalos.add((regra: i, de: de, ate: _minutosSemana));
        intervalos.add((regra: i, de: 0, ate: ate - _minutosSemana));
      }
    }
  }

  final comErro = <int>{};
  for (var a = 0; a < intervalos.length; a++) {
    for (var b = a + 1; b < intervalos.length; b++) {
      final x = intervalos[a];
      final y = intervalos[b];
      if (x.regra == y.regra) continue;
      if (x.de < y.ate && y.de < x.ate) comErro.add(x.regra > y.regra ? x.regra : y.regra);
    }
  }
  for (final i in comErro.toList()..sort()) {
    erro('regras[$i]', 'sobreposicao');
  }
}
