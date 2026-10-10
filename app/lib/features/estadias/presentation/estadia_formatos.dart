import 'package:intl/intl.dart';

final _hora = DateFormat('HH:mm');
final _dia = DateFormat('dd/MM');
final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: r'R$');

bool _perto(DateTime d, DateTime agora) => d.difference(agora).inDays.abs() <= 6;

// Tabela fixa: o app não inicializa os dados de locale do intl
// (initializeDateFormatting), e DateFormat('EEE', 'pt_BR') lançaria.
const _dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
String _diaSemana(DateTime d) => _dias[d.weekday - 1];

/// "dom 11/10 às 14:30" — validade por extenso (faixas, ficha, resumo).
String fmtValidade(DateTime d, DateTime agora) =>
    '${_perto(d, agora) ? '${_diaSemana(d)} ' : ''}${_dia.format(d)} às ${_hora.format(d)}';

/// "dom 14:30" perto de hoje; "30/10 12:00" longe — pílulas de uma linha.
String fmtValidadeCurta(DateTime d, DateTime agora) =>
    '${_perto(d, agora) ? _diaSemana(d) : _dia.format(d)} ${_hora.format(d)}';

/// "2 dias e 4 h", "19 h", "40 min".
String fmtDuracaoLonga(Duration d) {
  final dias = d.inDays;
  final horas = d.inHours % 24;
  if (dias > 0) {
    final txtDias = '$dias ${dias == 1 ? 'dia' : 'dias'}';
    return horas > 0 ? '$txtDias e $horas h' : txtDias;
  }
  if (d.inHours > 0) return '${d.inHours} h';
  return '${d.inMinutes} min';
}

String fmtReais(double v) => _moeda.format(v).replaceAll(' ', ' ');
