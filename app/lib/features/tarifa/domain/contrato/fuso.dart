import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

/// Hora de parede no fuso do pátio. PORT de `api/src/lib/contrato/fuso.ts`.
/// Sempre IANA, nunca offset fixo. A conta de [instanteLocal] é feita à mão,
/// igual à do TypeScript, em vez de usar a regra do pacote para hora que não
/// existe — senão as cópias divergiriam na troca de horário de verão.
class PartesLocais {
  const PartesLocais({
    required this.ano,
    required this.mes,
    required this.dia,
    required this.diaSemana,
    required this.minutoDoDia,
  });

  final int ano;
  final int mes;
  final int dia;

  /// ISO: 1 = segunda … 7 = domingo.
  final int diaSemana;
  final int minutoDoDia;

  @override
  bool operator ==(Object other) =>
      other is PartesLocais &&
      other.ano == ano &&
      other.mes == mes &&
      other.dia == dia &&
      other.diaSemana == diaSemana &&
      other.minutoDoDia == minutoDoDia;

  @override
  int get hashCode => Object.hash(ano, mes, dia, diaSemana, minutoDoDia);

  @override
  String toString() => '$ano-$mes-$dia (dia $diaSemana) +${minutoDoDia}min';
}

var _iniciado = false;

tz.Location _local(String fuso) {
  if (!_iniciado) {
    tzdata.initializeTimeZones();
    _iniciado = true;
  }
  return tz.getLocation(fuso);
}

const _msMinuto = 60000;

/// Diferença (local − UTC), em minutos, no instante dado.
int _offsetMinutos(int ms, tz.Location local) =>
    local.timeZone(ms).offset.inMinutes;

PartesLocais partesLocais(DateTime instante, String fuso) {
  final local = _local(fuso);
  final ms = instante.millisecondsSinceEpoch;
  final l = DateTime.fromMillisecondsSinceEpoch(
    ms + _offsetMinutos(ms, local) * _msMinuto,
    isUtc: true,
  );
  return PartesLocais(
    ano: l.year,
    mes: l.month,
    dia: l.day,
    diaSemana: l.weekday,
    minutoDoDia: l.hour * 60 + l.minute,
  );
}

/// O instante em que o relógio do fuso marca `ano-mes-dia` + [minutoDoDia].
/// Na hora que não existe volta uma hora; na hora repetida, fica com a
/// primeira (igual ao TypeScript).
DateTime instanteLocal(int ano, int mes, int dia, int minutoDoDia, String fuso) {
  final local = _local(fuso);
  final comoUtc = DateTime.utc(ano, mes, dia).millisecondsSinceEpoch + minutoDoDia * _msMinuto;
  final antes = _offsetMinutos(comoUtc, local);
  var ms = comoUtc - antes * _msMinuto;
  final depois = _offsetMinutos(ms, local);
  if (depois != antes) ms = comoUtc - depois * _msMinuto;
  return DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true);
}

({int ano, int mes, int dia}) somarDias(int ano, int mes, int dia, int dias) {
  final d = DateTime.utc(ano, mes, dia + dias);
  return (ano: d.year, mes: d.month, dia: d.day);
}
