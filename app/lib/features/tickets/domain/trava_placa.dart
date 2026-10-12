/// O que uma leitura ao vivo significou para a trava.
enum EstadoLeitura {
  /// Placa ignorada (acabou de entrar): não conta.
  ignorada,

  /// Ainda sem confiança — a tela mostra a placa em cinza.
  lendo,

  /// Repetiu o bastante: esta é a placa.
  travou,
}

/// Decide quando a leitura ao vivo "acertou" uma placa.
///
/// Uma leitura só oscila entre quadros. Exigir a MESMA placa algumas vezes
/// dentro de uma janela curta é o que separa "achou algo" de "leu direito". A
/// janela é curta de propósito: ao mover a câmera para outro carro, as
/// leituras antigas saem rápido e não contaminam a placa nova.
///
/// No modo rápido, a placa recém-registrada fica IGNORADA: o carro que acabou
/// de entrar continua na frente da câmera e travaria de novo. Ela volta a
/// valer quando outra placa trava ou depois de [ignorarPor] — o mesmo carro
/// pode voltar horas depois sem nenhum outro no meio.
class TravaPlaca {
  TravaPlaca({
    DateTime Function()? agora,
    this.repeticoes = 3,
    this.janela = 5,
    this.ignorarPor = const Duration(minutes: 2),
  }) : _agora = agora ?? DateTime.now;

  final DateTime Function() _agora;
  final int repeticoes;
  final int janela;
  final Duration ignorarPor;

  final List<String> _historico = [];
  String? _ignorada;
  DateTime? _ignoradaDesde;
  Duration _ignoradaPor = Duration.zero;

  EstadoLeitura ler(String placa) {
    if (_ignorando(placa)) return EstadoLeitura.ignorada;

    _historico.add(placa);
    if (_historico.length > janela) _historico.removeAt(0);
    if (_historico.where((p) => p == placa).length < repeticoes) {
      return EstadoLeitura.lendo;
    }
    // A próxima trava pede leituras novas; e outra placa travar libera a que
    // estava ignorada.
    _historico.clear();
    _ignorada = null;
    return EstadoLeitura.travou;
  }

  /// Descarta o histórico (Corrigir, volta do segundo plano). A placa
  /// ignorada continua ignorada.
  void limpar() => _historico.clear();

  /// [por]: quanto tempo, no máximo ([ignorarPor] se omitido). Outra placa
  /// travar libera antes.
  void ignorar(String placa, {Duration? por}) {
    _ignorada = placa;
    _ignoradaDesde = _agora();
    _ignoradaPor = por ?? ignorarPor;
  }

  bool _ignorando(String placa) {
    final desde = _ignoradaDesde;
    if (_ignorada != placa || desde == null) return false;
    if (_agora().difference(desde) >= _ignoradaPor) {
      _ignorada = null;
      return false;
    }
    return true;
  }
}
