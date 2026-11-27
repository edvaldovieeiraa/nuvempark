import '../../patio/domain/tarifa_config.dart';
import 'fare_result.dart';
import 'regra_horario.dart';

/// Motor de cálculo de tarifa — puro Dart, sem I/O.
///
/// CONTRATO com a API (`api/src/lib/tarifa-engine.ts`) e o painel
/// (`web/src/lib/tarifa-engine.ts`): os três rodam `testdata/tarifa-casos.json`.
/// Mudou a regra aqui? Mude nos três e no arquivo de casos.
///
/// Precedência (spec regras-horario-tarifa, req. 4):
///  1. Tolerância  → R$ 0,00 (sobre a estadia inteira)
///  2. Pernoite    → tarifa.pernoiteValor
///  3. Trechos     → cada trecho cobrado pela regra de horário em vigor ou pelo
///                   preço base (fração inicial + adicionais)
///  4. Teto diária → sobre a SOMA dos trechos
///
/// Horários sempre no relógio de Brasília, qualquer que seja o fuso do aparelho.
abstract final class TarifaEngine {
  static FareResult calcular({
    required DateTime entrada,
    required DateTime saida,
    required TarifaConfig tarifa,
  }) {
    assert(!saida.isBefore(entrada), 'saida deve ser igual ou posterior à entrada');
    assert(tarifa.fracaoAdicionalMinutos > 0, 'fracaoAdicionalMinutos deve ser > 0');

    final duracao = saida.difference(entrada);
    final duracaoSegundos = duracao.inSeconds;
    final duracaoMinutos = duracao.inMinutes;

    // ── 1. Tolerância ───────────────────────────────────────────────────────
    // Em segundos (fix 2026-07: estadia < 1 min com tolerância 0 saía grátis
    // pelo floor de inMinutes). `<=` inclusivo.
    if (duracaoSegundos <= tarifa.toleranciaMinutos * 60) {
      return FareResult(
        valor: 0.0,
        duracaoMinutos: duracaoMinutos,
        motivo: FareMotivo.tolerancia,
      );
    }

    final e = paraBrasilia(entrada);
    final s = paraBrasilia(saida);

    // ── 2. Pernoite ─────────────────────────────────────────────────────────
    // valor 0 = regra DESLIGADA (sem isto, atravessar a madrugada sairia grátis)
    if (tarifa.pernoiteValor > 0 && _isPernoite(e, s, tarifa)) {
      return FareResult(
        valor: tarifa.pernoiteValor,
        duracaoMinutos: duracaoMinutos,
        motivo: FareMotivo.pernoite,
      );
    }

    // ── 3. Trechos ──────────────────────────────────────────────────────────
    final blocos = _blocos(e, s, tarifa.regras);
    // Trecho com menos de 60 s não cobra (spec req. 8). Se nenhum chega a
    // 1 min, a estadia vira um trecho só pelo bloco da entrada.
    var validos = blocos.where((b) => b.fim.difference(b.inicio).inSeconds >= 60).toList();
    if (validos.isEmpty) {
      validos = [_Bloco(e, s, blocos.isEmpty ? null : blocos.first.regra)];
    }

    final baseDegraus = [
      DegrauPreco(
        ateMinutos: tarifa.fracaoInicialMinutos,
        centavos: _centavos(tarifa.fracaoInicialValor),
      ),
    ];
    final baseAdicionalCentavos = _centavos(tarifa.fracaoAdicionalValor);

    final trechos = <TrechoCobranca>[];
    var total = 0;
    for (final b in validos) {
      final minutos = b.fim.difference(b.inicio).inSeconds ~/ 60;
      final r = b.regra;
      final centavos = r == null
          ? _preco(baseDegraus, tarifa.fracaoAdicionalMinutos, baseAdicionalCentavos, minutos)
          : _preco(r.degraus, r.adicionalMinutos, r.adicionalCentavos, minutos);
      total += centavos;
      trechos.add(TrechoCobranca(
        inicio: deBrasilia(b.inicio),
        fim: deBrasilia(b.fim),
        minutos: minutos,
        centavos: centavos,
        regraId: r?.id,
        regraNome: r?.nome,
      ));
    }

    // ── 4. Teto diária ──────────────────────────────────────────────────────
    // teto 0 = regra DESLIGADA (sem isto, TODA cobrança viraria R$ 0)
    final teto = _centavos(tarifa.tetoDiaria);
    if (teto > 0 && total >= teto) {
      return FareResult(
        valor: teto / 100,
        duracaoMinutos: duracaoMinutos,
        motivo: FareMotivo.tetoDiaria,
        trechos: trechos,
      );
    }

    return FareResult(
      valor: total / 100,
      duracaoMinutos: duracaoMinutos,
      motivo: FareMotivo.normal,
      trechos: trechos,
    );
  }

  // ── trechos ──────────────────────────────────────────────────────────────

  /// Corta [e, s) (relógio de Brasília) em blocos de regra ou de preço base.
  static List<_Bloco> _blocos(DateTime e, DateTime s, List<RegraHorario> regras) {
    final out = <_Bloco>[];
    var cursor = e;
    var primeiro = true;
    // Uma estadia de vários dias gera poucos blocos por dia; o limite só
    // protege contra laço infinito com regra malformada.
    for (var guarda = 0; cursor.isBefore(s) && guarda < 5000; guarda++) {
      final regra = _regraEm(cursor, regras);
      DateTime fim;
      if (regra != null) {
        if (primeiro && regra.cobrarDoInicio) {
          out.add(_Bloco(cursor, s, regra));
          cursor = s;
          break;
        }
        fim = _fimDaRegra(regra, cursor, s);
      } else {
        fim = _proximoInicio(cursor, regras) ?? s;
      }
      if (!fim.isBefore(s)) fim = s;
      out.add(_Bloco(cursor, fim, regra));
      cursor = fim;
      primeiro = false;
    }
    // Guarda estourou (regra malformada): o resto da estadia NUNCA sai de
    // graça — vira um bloco final pelo que estiver em vigor.
    if (cursor.isBefore(s)) out.add(_Bloco(cursor, s, _regraEm(cursor, regras)));
    return out;
  }

  static DateTime _dia(DateTime t) => DateTime.utc(t.year, t.month, t.day);

  /// Ocorrência da [regra] que começa no dia [d] (ou null se o dia não vale).
  static (DateTime, DateTime)? _ocorrencia(RegraHorario regra, DateTime d) {
    if (!regra.dias.contains(d.weekday)) return null;
    final ini = d.add(Duration(minutes: regra.inicioMinutos));
    final DateTime fim;
    if (regra.diaInteiro) {
      fim = ini.add(const Duration(days: 1));
    } else if (regra.fimMinutos > regra.inicioMinutos) {
      fim = d.add(Duration(minutes: regra.fimMinutos));
    } else {
      fim = d.add(Duration(days: 1, minutes: regra.fimMinutos));
    }
    return (ini, fim);
  }

  /// Ocorrência da [regra] que contém [t], se houver.
  static (DateTime, DateTime)? _ocorrenciaEm(RegraHorario regra, DateTime t) {
    final hoje = _dia(t);
    for (final d in [hoje.subtract(const Duration(days: 1)), hoje]) {
      final o = _ocorrencia(regra, d);
      if (o != null && !t.isBefore(o.$1) && t.isBefore(o.$2)) return o;
    }
    return null;
  }

  static RegraHorario? _regraEm(DateTime t, List<RegraHorario> regras) {
    for (final r in regras) {
      if (_ocorrenciaEm(r, t) != null) return r;
    }
    return null;
  }

  /// Fim da [regra] a partir de [t], juntando ocorrências seguidas
  /// (o "dia todo" de sábado e o de domingo formam um trecho só).
  static DateTime _fimDaRegra(RegraHorario regra, DateTime t, DateTime s) {
    var fim = _ocorrenciaEm(regra, t)!.$2;
    // Junta até a saída (estadia longa numa regra "todo dia, dia inteiro" é um
    // trecho só); o limite só protege contra laço infinito.
    for (var i = 0; i < 4000 && fim.isBefore(s); i++) {
      final seguinte = _ocorrenciaEm(regra, fim);
      if (seguinte == null) break;
      fim = seguinte.$2;
    }
    return fim;
  }

  /// Primeiro início de regra depois de [t] (fim de um bloco de preço base).
  static DateTime? _proximoInicio(DateTime t, List<RegraHorario> regras) {
    DateTime? melhor;
    final hoje = _dia(t);
    for (final r in regras) {
      for (var k = 0; k <= 8; k++) {
        final o = _ocorrencia(r, hoje.add(Duration(days: k)));
        if (o == null || !o.$1.isAfter(t)) continue;
        if (melhor == null || o.$1.isBefore(melhor)) melhor = o.$1;
        break;
      }
    }
    return melhor;
  }

  /// Degraus + adicional. O preço base é um degrau só.
  static int _preco(
    List<DegrauPreco> degraus,
    int adicionalMinutos,
    int adicionalCentavos,
    int minutos,
  ) {
    for (final d in degraus) {
      if (minutos <= d.ateMinutos) return d.centavos;
    }
    final ultimo = degraus.last;
    if (adicionalCentavos <= 0 || adicionalMinutos <= 0) return ultimo.centavos;
    final excedente = minutos - ultimo.ateMinutos;
    final fracoes = (excedente + adicionalMinutos - 1) ~/ adicionalMinutos;
    return ultimo.centavos + fracoes * adicionalCentavos;
  }

  static int _centavos(double reais) => (reais * 100).round();

  /// Janela de pernoite: das [pernoiteHoraInicio]:00 do dia D até as
  /// [pernoiteHoraFim]:00 de D+1, no relógio de Brasília. Vale se a estadia
  /// cobriu a janela INTEIRA.
  static bool _isPernoite(DateTime e, DateTime s, TarifaConfig tarifa) {
    var dia = _dia(e);
    final diaFim = _dia(s);
    while (!dia.isAfter(diaFim)) {
      final inicioJanela = dia.add(Duration(hours: tarifa.pernoiteHoraInicio));
      final fimJanela = dia.add(Duration(hours: tarifa.pernoiteHoraFim + 24));
      if (!e.isAfter(inicioJanela) && !s.isBefore(fimJanela)) return true;
      dia = dia.add(const Duration(days: 1));
    }
    return false;
  }
}

class _Bloco {
  _Bloco(this.inicio, this.fim, this.regra);

  final DateTime inicio;
  final DateTime fim;
  final RegraHorario? regra;
}
