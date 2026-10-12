import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/estadias/data/estadia_repository.dart';
import 'package:nuvempark_app/features/tickets/data/entrada_service.dart';
import 'package:nuvempark_app/features/tickets/domain/leitura_rapida.dart';
import 'package:nuvempark_app/features/tickets/presentation/ciclo_entrada_rapida.dart';

/// Timer que só dispara quando o teste manda.
class _Timer implements Timer {
  _Timer(this._acao);
  final void Function() _acao;
  bool _ativo = true;

  void disparar() {
    if (!_ativo) return;
    _ativo = false;
    _acao();
  }

  @override
  void cancel() => _ativo = false;
  @override
  bool get isActive => _ativo;
  @override
  int get tick => 0;
}

Future<void> _escoar() async {
  for (var i = 0; i < 20; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}

Ticket _ticketAberto() => const Ticket(
      id: 't-aberto',
      operacaoId: 'p1',
      placa: 'ABC1D23',
      tipoVeiculo: 'carro',
      entradaEpoch: 1,
      operadorId: 'op1',
      status: 'aberto',
      origem: 'avulso',
      fotoEntradaEnviada: false,
      syncStatus: 'sincronizado',
      criadoEm: 1,
      atualizadoEm: 1,
    );

EntradaHospedeVencido _vencido(String placa) => EntradaHospedeVencido(
      placa,
      ReconhecimentoHospede(
        estadia: Estadia(
          id: 'e1',
          operacaoId: 'p1',
          placa: placa,
          tipoVeiculo: 'carro',
          tarifaId: 'tar-hosp',
          diariaValor: 30,
          diariaHoras: 24,
          inicioEpoch: 1,
          validaAteEpoch: 2,
          diarias: 1,
          valorTotal: 30,
          syncStatus: 'sincronizado',
          criadoEm: 1,
          atualizadoEm: 1,
        ),
        situacao: SituacaoHospede.vencidaRecente,
      ),
    );

/// Tudo que o ciclo toca, controlável pelo teste.
class _Mundo {
  final ignoradas = <String>[];
  late final leitura =
      LeituraRapida(ignorar: (placa, _) => ignoradas.add(placa));
  final timers = <_Timer>[];
  var foto = Completer<String?>();
  var analise = Completer<AnaliseEntrada>();
  var registro = Completer<EntradaRegistrada>();
  var pausa = Completer<bool>();
  final registrados = <(String placa, String? foto)>[];
  final pausasAbertas = <AnaliseEntrada>[];
  final apagadas = <String>[];
  final falhas = <String>[];
  var retomadas = 0;
  var depoisDeGravar = 0;
  Object? erroDepoisDeGravar;

  late final ciclo = CicloEntradaRapida(
    leitura: leitura,
    capturarFoto: () => foto.future,
    analisar: (_) => analise.future,
    registrar: (a, f) {
      registrados.add((a.placa, f));
      return registro.future;
    },
    aposRegistrar: (_, _, _) {
      depoisDeGravar++;
      final e = erroDepoisDeGravar;
      if (e != null) throw e;
    },
    resolverPausa: (a, _) {
      pausasAbertas.add(a);
      return pausa.future;
    },
    retomarLeitura: () => retomadas++,
    apagarFoto: apagadas.add,
    avisarFalha: falhas.add,
    mudou: () {},
    iniciarTimer: (_, acao) {
      final t = _Timer(acao);
      timers.add(t);
      return t;
    },
  );

  _Timer get timer => timers.last;
}

const _liberada = EntradaLiberada('ABC1D23');
const _gravada = EntradaRegistrada(ticketId: 't1', origem: 'avulso');

void main() {
  late _Mundo m;
  setUp(() => m = _Mundo());

  test('caminho feliz: foto e checagem começam na trava; no fim, grava e volta '
      'a ler', () async {
    m.ciclo.travou('ABC1D23');
    expect(m.leitura.fase, FaseRapida.contagem);
    m.foto.complete('/f/1.jpg');
    m.analise.complete(_liberada);
    await _escoar();
    expect(m.registrados, isEmpty, reason: 'só depois dos 2 s');

    m.timer.disparar();
    await _escoar();
    expect(m.registrados, [('ABC1D23', '/f/1.jpg')]);
    m.registro.complete(_gravada);
    await _escoar();

    expect(m.leitura.fase, FaseRapida.lendo);
    expect(m.leitura.registradas, 1);
    expect(m.ignoradas, ['ABC1D23']);
    expect(m.retomadas, 1);
    expect(m.depoisDeGravar, 1);
    expect(m.apagadas, isEmpty);
  });

  test('Corrigir na contagem: não grava, apaga a foto e volta a ler', () async {
    m.ciclo.travou('ABC1D28');
    m.ciclo.corrigir();
    m.foto.complete('/f/errada.jpg');
    m.analise.complete(const EntradaLiberada('ABC1D28'));
    m.timer.disparar(); // cancelado: não faz nada
    await _escoar();

    expect(m.registrados, isEmpty);
    expect(m.apagadas, ['/f/errada.jpg']);
    expect(m.retomadas, 1);
    expect(m.leitura.corrigidas, 1);
  });

  test('Corrigir no fim dos 2 s (já gravando) não descarta a foto', () async {
    m.ciclo.travou('ABC1D23');
    m.foto.complete('/f/1.jpg');
    m.analise.complete(_liberada);
    m.timer.disparar();
    m.ciclo.corrigir(); // toque que chegou atrasado
    await _escoar();
    m.registro.complete(_gravada);
    await _escoar();

    expect(m.registrados, [('ABC1D23', '/f/1.jpg')],
        reason: 'antes, o toque apagava a foto e a entrada saía "sem foto"');
    expect(m.apagadas, isEmpty);
    expect(m.leitura.corrigidas, 0);
    expect(m.retomadas, 1, reason: 'religa uma vez só, depois de gravar');
  });

  test('já no pátio antes dos 2 s: pausa na hora, uma folha só', () async {
    m.ciclo.travou('ABC1D23');
    m.analise.complete(EntradaJaNoPatio('ABC1D23', _ticketAberto()));
    m.foto.complete('/f/1.jpg');
    await _escoar();

    expect(m.leitura.fase, FaseRapida.pausado);
    expect(m.pausasAbertas, hasLength(1));
    m.timer.disparar(); // cancelado pela pausa
    await _escoar();
    expect(m.pausasAbertas, hasLength(1));
    expect(m.registrados, isEmpty);

    m.pausa.complete(false); // pulou / foi à saída
    await _escoar();
    expect(m.leitura.fase, FaseRapida.lendo);
    expect(m.apagadas, ['/f/1.jpg']);
    expect(m.ignoradas, ['ABC1D23']);
    expect(m.retomadas, 1);
  });

  test('pausa descoberta só no fim da contagem: também uma folha só', () async {
    m.ciclo.travou('RTO4F21');
    m.foto.complete('/f/1.jpg');
    m.timer.disparar();
    await _escoar();
    m.analise.complete(_vencido('RTO4F21'));
    await _escoar();

    expect(m.pausasAbertas, hasLength(1));
    expect(m.registrados, isEmpty);
  });

  test('renovação na pausa registrou: foto fica, contador sobe', () async {
    m.ciclo.travou('RTO4F21');
    m.foto.complete('/f/1.jpg');
    m.analise.complete(_vencido('RTO4F21'));
    await _escoar();
    m.pausa.complete(true);
    await _escoar();

    expect(m.apagadas, isEmpty, reason: 'a foto virou a da entrada renovada');
    expect(m.leitura.registradas, 1);
    expect(m.leitura.fase, FaseRapida.lendo);
  });

  test('a folha falhou (navegação, renovação): volta a ler mesmo assim',
      () async {
    m.ciclo.travou('ABC1D23');
    m.foto.complete('/f/1.jpg');
    m.analise.complete(EntradaJaNoPatio('ABC1D23', _ticketAberto()));
    await _escoar();
    m.pausa.completeError(StateError('rota'));
    await _escoar();

    expect(m.leitura.fase, FaseRapida.lendo,
        reason: 'antes ficava pausado para sempre, com a câmera parada');
    expect(m.retomadas, 1);
    expect(m.apagadas, ['/f/1.jpg']);
  });

  test('falha ao gravar: apaga a foto, avisa e não ignora a placa', () async {
    m.ciclo.travou('ABC1D23');
    m.foto.complete('/f/1.jpg');
    m.analise.complete(_liberada);
    m.timer.disparar();
    await _escoar();
    m.registro.completeError(StateError('drift'));
    await _escoar();

    expect(m.apagadas, ['/f/1.jpg']);
    expect(m.falhas, hasLength(1));
    expect(m.ignoradas, isEmpty, reason: 'precisa poder tentar de novo');
    expect(m.leitura.fase, FaseRapida.lendo);
    expect(m.retomadas, 1);
  });

  test('erro DEPOIS de gravar não desfaz nada: foto fica, placa ignorada',
      () async {
    m.erroDepoisDeGravar = StateError('impressora');
    m.ciclo.travou('ABC1D23');
    m.foto.complete('/f/1.jpg');
    m.analise.complete(_liberada);
    m.timer.disparar();
    await _escoar();
    m.registro.complete(_gravada);
    await _escoar();

    expect(m.apagadas, isEmpty,
        reason: 'a foto é de um ticket que já existe');
    expect(m.ignoradas, ['ABC1D23'],
        reason: 'senão o mesmo carro trava de novo e entra duas vezes');
    expect(m.falhas, isEmpty);
    expect(m.leitura.registradas, 1);
  });

  test('foto falhou: entra sem foto, com o aviso', () async {
    m.ciclo.travou('ABC1D23');
    m.foto.complete(null);
    m.analise.complete(_liberada);
    m.timer.disparar();
    await _escoar();
    m.registro.complete(_gravada);
    await _escoar();

    expect(m.registrados, [('ABC1D23', null)]);
    expect(m.leitura.ultima?.aviso, CicloEntradaRapida.avisoSemFoto);
  });

  test('checagem falhou: apaga a foto e avisa, sem gravar', () async {
    m.ciclo.travou('ABC1D23');
    m.foto.complete('/f/1.jpg');
    m.analise.completeError(StateError('drift'));
    m.timer.disparar();
    await _escoar();

    expect(m.registrados, isEmpty);
    expect(m.apagadas, ['/f/1.jpg']);
    expect(m.falhas, hasLength(1));
    expect(m.leitura.fase, FaseRapida.lendo);
  });

  test('segundo plano na contagem cancela e apaga a foto', () async {
    m.ciclo.travou('ABC1D23');
    m.ciclo.segundoPlano();
    m.foto.complete('/f/1.jpg');
    m.analise.complete(_liberada);
    m.timer.disparar();
    await _escoar();

    expect(m.registrados, isEmpty);
    expect(m.apagadas, ['/f/1.jpg']);
    expect(m.leitura.fase, FaseRapida.lendo);
  });

  test('sair da tela na contagem cancela e apaga a foto', () async {
    m.ciclo.travou('ABC1D23');
    m.ciclo.encerrar();
    m.foto.complete('/f/1.jpg');
    m.timer.disparar();
    await _escoar();

    expect(m.registrados, isEmpty);
    expect(m.apagadas, ['/f/1.jpg']);
  });

  test('nova placa depois de registrar começa um ciclo novo', () async {
    m.ciclo.travou('ABC1D23');
    m.foto.complete('/f/1.jpg');
    m.analise.complete(_liberada);
    m.timer.disparar();
    await _escoar();
    m.registro.complete(_gravada);
    await _escoar();

    m.foto = Completer();
    m.analise = Completer();
    m.registro = Completer();
    m.ciclo.travou('XYZ9K88');
    expect(m.leitura.fase, FaseRapida.contagem);
    expect(m.timers, hasLength(2));
  });
}
