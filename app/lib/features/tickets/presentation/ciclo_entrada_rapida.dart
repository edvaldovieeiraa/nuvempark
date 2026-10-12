import 'dart:async';

import '../data/entrada_service.dart';
import '../domain/leitura_rapida.dart';

/// O ciclo de UMA placa no modo rápido, sem tela: trava → foto e checagem em
/// paralelo com a contagem → grava (ou pausa) → volta a ler.
///
/// Mora fora da `EntradaRapidaScreen` porque é onde estão as corridas — timer
/// da contagem, checagem que pode pedir pausa antes dos 2 s, foto ainda sendo
/// tirada, Corrigir no último instante, segundo plano, tela fechando — e elas
/// precisam de teste. A tela só fornece os efeitos (câmera, serviço, folha,
/// avisos) e redesenha em [mudou].
///
/// Garantias:
/// - placa corrigida, pausada ou com a contagem cancelada nunca é gravada;
/// - a foto de uma contagem que não virou entrada é apagada; a de uma entrada
///   gravada nunca;
/// - toda saída de uma placa (gravou, falhou, pausa resolvida) religa a
///   leitura — a câmera não fica parada esperando;
/// - nada depois de gravar desfaz a entrada: a placa é ignorada antes de
///   qualquer efeito que possa falhar.
class CicloEntradaRapida {
  CicloEntradaRapida({
    required this.leitura,
    required this.capturarFoto,
    required this.analisar,
    required this.registrar,
    required this.aposRegistrar,
    required this.resolverPausa,
    required this.retomarLeitura,
    required this.apagarFoto,
    required this.avisarFalha,
    required this.mudou,
    this.contagem = const Duration(seconds: 2),
    Timer Function(Duration, void Function())? iniciarTimer,
  }) : _iniciarTimer = iniciarTimer ?? Timer.new;

  static const avisoSemFoto = 'Entrou sem foto: a câmera falhou';

  final LeituraRapida leitura;

  /// Foto da placa travada; null se falhou. Não deve lançar.
  final Future<String?> Function() capturarFoto;
  final Future<AnaliseEntrada> Function(String placa) analisar;
  final Future<EntradaRegistrada> Function(EntradaLiberada analise, String? foto)
      registrar;

  /// Depois de gravar: listas, sync, cupom, vibração. Melhor esforço — erro
  /// aqui é engolido.
  final FutureOr<void> Function(
      EntradaRegistrada registro, EntradaLiberada analise, String? foto)
      aposRegistrar;

  /// Mostra a decisão (folha) e executa a escolha. Devolve se a resolução
  /// registrou a entrada (renovação da estadia). Pode lançar.
  final Future<bool> Function(AnaliseEntrada analise, Future<String?> foto)
      resolverPausa;
  final void Function() retomarLeitura;
  final void Function(String caminho) apagarFoto;
  final void Function(String mensagem) avisarFalha;
  final void Function() mudou;
  final Duration contagem;
  final Timer Function(Duration, void Function()) _iniciarTimer;

  Timer? _timer;
  Future<String?>? _foto;
  Future<AnaliseEntrada>? _analise;
  bool _encerrado = false;

  /// A câmera travou [placa].
  void travou(String placa) {
    if (_encerrado || !leitura.travou(placa)) return;
    mudou();
    _foto = capturarFoto();
    final analise = analisar(placa);
    _analise = analise;
    // Placa que pede decisão não espera a contagem acabar. Só vale para ESTA
    // contagem — uma checagem atrasada de placa já corrigida não pausa nada.
    analise.then((a) {
      if (identical(_analise, analise) &&
          leitura.fase == FaseRapida.contagem) {
        _pausarSePrecisa(a);
      }
    }, onError: (Object _) {});
    _timer = _iniciarTimer(contagem, () => unawaited(_fimDaContagem()));
  }

  void corrigir() {
    if (!leitura.corrigir()) return; // fora da contagem: o toque chegou tarde
    _timer?.cancel();
    _descartarFoto();
    mudou();
    retomarLeitura();
  }

  /// App foi para o segundo plano. A câmera religa sozinha na volta.
  void segundoPlano() {
    if (leitura.fase != FaseRapida.contagem) return;
    _timer?.cancel();
    _descartarFoto();
    leitura.segundoPlano();
    mudou();
  }

  /// A tela saiu. Uma gravação já em curso termina (é local); uma contagem
  /// é cancelada.
  void encerrar() {
    _encerrado = true;
    _timer?.cancel();
    if (leitura.fase == FaseRapida.contagem) _descartarFoto();
  }

  Future<void> _fimDaContagem() async {
    if (_encerrado || !leitura.contagemTerminou()) return;
    mudou();
    final placa = leitura.placa!;
    final fotoFutura = _foto ?? Future<String?>.value(null);

    final AnaliseEntrada analise;
    try {
      analise = await _analise!;
    } catch (_) {
      _descartarFoto();
      return _falhar('Não consegui verificar a placa $placa.');
    }
    if (_pausarSePrecisa(analise)) return;
    final liberada = analise as EntradaLiberada;

    final foto = await fotoFutura.catchError((Object _) => null);
    final EntradaRegistrada registro;
    try {
      registro = await registrar(liberada, foto);
    } catch (_) {
      _foto = null;
      _analise = null;
      if (foto != null) apagarFoto(foto);
      return _falhar('Erro ao registrar a entrada de $placa.');
    }

    // GRAVADA. Primeiro o que impede entrada dupla (ignorar a placa, voltar a
    // ler); depois os efeitos que podem falhar sem desfazer nada.
    _foto = null;
    _analise = null;
    leitura.registrou(aviso: registro.aviso ?? (foto == null ? avisoSemFoto : null));
    mudou();
    retomarLeitura();
    try {
      await aposRegistrar(registro, liberada, foto);
    } catch (_) {/* cupom/sync falham sozinhos; a entrada está gravada */}
  }

  /// Devolve se a análise pediu decisão (e então a folha já foi aberta).
  bool _pausarSePrecisa(AnaliseEntrada a) {
    final motivo = switch (a) {
      EntradaJaNoPatio() => MotivoPausa.jaNoPatio,
      EntradaHospedeVencido() => MotivoPausa.hospedeVencido,
      EntradaLiberada() => null,
    };
    if (motivo == null) return false;
    if (leitura.fase == FaseRapida.pausado) return true; // folha já aberta
    _timer?.cancel();
    leitura.pausou(motivo);
    mudou();
    unawaited(_resolver(a));
    return true;
  }

  Future<void> _resolver(AnaliseEntrada a) async {
    var registrou = false;
    try {
      registrou =
          await resolverPausa(a, _foto ?? Future<String?>.value(null));
    } catch (_) {
      // Navegação ou renovação falhou: volta a ler mesmo assim.
    } finally {
      if (registrou) {
        _foto = null; // virou a foto da entrada renovada
        _analise = null;
      } else {
        _descartarFoto();
      }
      leitura.sairDaPausa(registrou: registrou);
      mudou();
      retomarLeitura();
    }
  }

  void _falhar(String mensagem) {
    leitura.falhou();
    avisarFalha(mensagem);
    mudou();
    retomarLeitura();
  }

  /// A foto da contagem não vai virar entrada: apaga quando existir (a
  /// captura pode ainda estar em curso).
  void _descartarFoto() {
    final f = _foto;
    _foto = null;
    _analise = null;
    if (f == null) return;
    f.then((caminho) {
      if (caminho != null) apagarFoto(caminho);
    }, onError: (Object _) {});
  }
}
