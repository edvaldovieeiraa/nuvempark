import 'dart:convert';

/// Versão das regras de horário que ESTE app entende. O bootstrap recebe
/// `regras_horario_v1` deste app; uma regra com `requer` maior foi feita para
/// um app mais novo, e a tabela dela não pode ser cobrada aqui.
const int regrasHorarioVersaoSuportada = 1;

/// "Até [ateMinutos] minutos, cobrar [centavos]".
class DegrauPreco {
  const DegrauPreco({required this.ateMinutos, required this.centavos});

  final int ateMinutos;
  final int centavos;
}

/// Uma regra de horário de uma tabela de preço (coluna `tarifas.regras_horario`).
///
/// Horários e dias são SEMPRE do relógio de Brasília (ver [paraBrasilia]).
class RegraHorario {
  const RegraHorario({
    required this.id,
    required this.nome,
    required this.dias,
    required this.inicioMinutos,
    required this.fimMinutos,
    required this.cobrarDoInicio,
    required this.degraus,
    required this.adicionalMinutos,
    required this.adicionalCentavos,
    this.requer = 1,
  });

  final String id;
  final String nome;

  /// Dias da semana ISO: 1 = segunda … 7 = domingo.
  final Set<int> dias;

  /// Minutos desde 00:00. Fim < início = vira o dia; fim == início = dia todo.
  final int inicioMinutos;
  final int fimMinutos;

  /// Entrada dentro desta regra → ela cobra a estadia inteira.
  final bool cobrarDoInicio;

  /// Ordenados por [DegrauPreco.ateMinutos].
  final List<DegrauPreco> degraus;
  final int adicionalMinutos;
  final int adicionalCentavos;

  /// Versão mínima do app que sabe cobrar esta regra.
  final int requer;

  bool get diaInteiro => inicioMinutos == fimMinutos;

  /// Aceita a lista já decodificada, o texto JSON (como vem do banco local) ou
  /// nulo. Nulo, vazio ou inválido → lista vazia (tabela sem regras = hoje).
  static List<RegraHorario> listaDoJson(Object? raw) {
    Object? valor = raw;
    if (valor is String) {
      if (valor.trim().isEmpty) return const [];
      try {
        valor = jsonDecode(valor);
      } catch (_) {
        return const [];
      }
    }
    if (valor is! List) return const [];
    final out = <RegraHorario>[];
    for (final item in valor) {
      if (item is! Map) continue;
      // Uma regra com tipo inesperado não pode derrubar as tarifas do pátio
      // inteiro (o app ficaria sem cobrar, inclusive offline): só ela some.
      try {
        final regra = _deMapa(item);
        if (regra != null) out.add(regra);
      } catch (_) {}
    }
    return out;
  }

  static RegraHorario? _deMapa(Map m) {
    // `requer` PRIMEIRO: uma regra de versão futura pode ter outro formato, e
    // descartá-la faria a tabela ser cobrada pelo preço base. Ela entra como
    // marcador para `TarifaConfig.exigeAppNovo` tirar a tabela das listas.
    final requer = (m['requer'] as num?)?.toInt() ?? 1;
    if (requer > regrasHorarioVersaoSuportada) {
      return RegraHorario(
        id: '${m['id'] ?? ''}',
        nome: '${m['nome'] ?? 'Regra'}',
        dias: const {},
        inicioMinutos: 0,
        fimMinutos: 0,
        cobrarDoInicio: false,
        degraus: const [DegrauPreco(ateMinutos: 0, centavos: 0)],
        adicionalMinutos: 0,
        adicionalCentavos: 0,
        requer: requer,
      );
    }
    final inicio = _minutos(m['hora_inicio']);
    final fim = _minutos(m['hora_fim']);
    final degraus = <DegrauPreco>[
      for (final d in (m['degraus'] as List? ?? const []))
        if (d is Map && d['ate_minutos'] is num && d['valor'] is num)
          DegrauPreco(
            ateMinutos: (d['ate_minutos'] as num).toInt(),
            centavos: _centavos(d['valor'] as num),
          ),
    ]..sort((a, b) => a.ateMinutos.compareTo(b.ateMinutos));
    final dias = <int>{
      for (final d in (m['dias'] as List? ?? const []))
        if (d is num && d >= 1 && d <= 7) d.toInt(),
    };
    if (inicio == null || fim == null || degraus.isEmpty || dias.isEmpty) {
      return null;
    }
    return RegraHorario(
      id: '${m['id'] ?? ''}',
      nome: '${m['nome'] ?? 'Regra'}',
      dias: dias,
      inicioMinutos: inicio,
      fimMinutos: fim,
      cobrarDoInicio: m['cobrar_do_inicio'] == true,
      degraus: degraus,
      adicionalMinutos: (m['adicional_minutos'] as num?)?.toInt() ?? 0,
      adicionalCentavos: _centavos((m['adicional_valor'] as num?) ?? 0),
      requer: requer,
    );
  }

  static int? _minutos(Object? hhmm) {
    if (hhmm is! String) return null;
    final p = hhmm.split(':');
    if (p.length != 2) return null;
    final h = int.tryParse(p[0]);
    final mi = int.tryParse(p[1]);
    if (h == null || mi == null || h < 0 || h > 24 || mi < 0 || mi > 59) {
      return null;
    }
    if (h == 24 && mi != 0) return null; // só 24:00 (= meia-noite)
    return (h * 60 + mi) % (24 * 60);
  }

  static int _centavos(num reais) => (reais * 100).round();
}

const Duration _brasilia = Duration(hours: 3);

/// O instante [t] no relógio de Brasília (UTC−3 fixo, sem horário de verão
/// desde 2019), como um DateTime UTC cujos campos são a hora de Brasília.
/// Usar SÓ para ler hora/dia; nunca para comparar com instantes reais.
DateTime paraBrasilia(DateTime t) =>
    DateTime.fromMillisecondsSinceEpoch(t.millisecondsSinceEpoch, isUtc: true)
        .subtract(_brasilia);

/// Volta do relógio de Brasília para o instante real (UTC).
DateTime deBrasilia(DateTime relogio) => relogio.add(_brasilia);
