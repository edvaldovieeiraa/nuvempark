import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tarifa/domain/regra_horario.dart';

const _valida = {
  'id': 'r1',
  'nome': 'Noturno',
  'dias': [1, 2, 3, 4, 5, 6, 7],
  'hora_inicio': '18:00',
  'hora_fim': '06:00',
  'cobrar_do_inicio': true,
  'degraus': [
    {'ate_minutos': 720, 'valor': 20.0},
  ],
  'adicional_minutos': 60,
  'adicional_valor': 0,
};

void main() {
  test('regra com tipo inesperado é ignorada sem derrubar as outras', () {
    final regras = RegraHorario.listaDoJson([
      {..._valida, 'id': 'ruim', 'dias': 'todos', 'adicional_minutos': '30'},
      _valida,
    ]);
    expect(regras.map((r) => r.id), ['r1']);
  });

  test('regra de versão futura com formato novo continua marcando a tabela', () {
    // Uma v2 pode não ter degraus/dias do jeito da v1: mesmo assim o app v1
    // precisa saber que ela existe, para não cobrar a tabela pelo preço base.
    final regras = RegraHorario.listaDoJson([
      {'id': 'futura', 'nome': 'Nova', 'requer': 2, 'formato': 'outro'},
    ]);
    expect(regras, hasLength(1));
    expect(regras.single.requer, 2);
  });

  test('só 24:00 é aceito com hora 24', () {
    expect(RegraHorario.listaDoJson([{..._valida, 'hora_fim': '24:00'}]).single.fimMinutos, 0);
    expect(RegraHorario.listaDoJson([{..._valida, 'hora_fim': '24:30'}]), isEmpty);
  });
}
