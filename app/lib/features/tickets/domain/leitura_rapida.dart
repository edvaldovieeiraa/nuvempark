/// Em que ponto o modo rápido está com a placa da vez.
enum FaseRapida {
  /// Câmera lendo; nenhuma placa travada.
  lendo,

  /// Placa travada, contagem de 2 s na tela ("Corrigir" ainda vale).
  contagem,

  /// Contagem acabou: gravando a entrada.
  registrando,

  /// A placa pede decisão do operador (ver [MotivoPausa]).
  pausado,
}

enum MotivoPausa { jaNoPatio, hospedeVencido }

/// Máquina de estados do modo rápido de entrada, sem câmera, tela ou relógio.
///
/// A tela faz os efeitos (timer da contagem, foto, gravação, navegação) e
/// avisa aqui o que aconteceu; daqui sai o que mostrar e se o efeito ainda
/// vale — um timer de contagem cancelada não pode registrar nada.
///
/// [ignorar] é chamado com a placa que a câmera deve passar a ignorar, e por
/// quanto tempo: a que acabou de entrar e a de uma pausa resolvida (o carro
/// continua na frente da câmera e travaria de novo), e a leitura corrigida.
class LeituraRapida {
  LeituraRapida({required this.ignorar});

  final void Function(String placa, Duration por) ignorar;

  /// Placa que entrou (ou cuja pausa foi resolvida): até outra placa travar.
  static const ignorarRegistrada = Duration(minutes: 2);

  /// Leitura que o operador corrigiu: com o carro parado, a MESMA leitura
  /// errada travaria de novo em ~1 s. Pouco tempo — dá para reenquadrar.
  static const ignorarCorrigida = Duration(seconds: 10);

  FaseRapida _fase = FaseRapida.lendo;
  String? _placa;
  MotivoPausa? _motivo;
  ({String placa, String? aviso})? _ultima;
  int _registradas = 0;
  int _corrigidas = 0;

  FaseRapida get fase => _fase;

  /// Placa da vez (contagem, gravação ou pausa); null lendo.
  String? get placa => _placa;

  MotivoPausa? get motivo => _motivo;

  /// Última entrada registrada, para a faixa "✓ ABC1D23 registrada".
  ({String placa, String? aviso})? get ultima => _ultima;

  int get registradas => _registradas;

  /// Contagens abortadas em "Corrigir" — medem a precisão da leitura em campo.
  int get corrigidas => _corrigidas;

  /// A câmera travou [placa]. Só vale lendo; devolve se começou a contagem.
  bool travou(String placa) {
    if (_fase != FaseRapida.lendo) return false;
    _fase = FaseRapida.contagem;
    _placa = placa;
    return true;
  }

  /// Devolve se valeu — fora da contagem (o toque chegou no fim dos 2 s) não
  /// faz nada, e a tela não pode descartar a foto nem religar a leitura.
  bool corrigir() {
    final p = _placa;
    if (_fase != FaseRapida.contagem || p == null) return false;
    _corrigidas++;
    ignorar(p, ignorarCorrigida);
    _voltarALer();
    return true;
  }

  /// O timer da contagem disparou. Devolve se é para gravar — `false` quando a
  /// contagem já foi cancelada (Corrigir, segundo plano) ou virou pausa.
  bool contagemTerminou() {
    if (_fase != FaseRapida.contagem) return false;
    _fase = FaseRapida.registrando;
    return true;
  }

  void registrou({String? aviso}) {
    final p = _placa;
    if (_fase != FaseRapida.registrando || p == null) return;
    _registradas++;
    _ultima = (placa: p, aviso: aviso);
    ignorar(p, ignorarRegistrada);
    _voltarALer();
  }

  /// A gravação falhou: volta a ler SEM ignorar a placa, para tentar de novo.
  void falhou() {
    if (_fase != FaseRapida.registrando) return;
    _voltarALer();
  }

  /// A análise pediu decisão. Pode chegar ainda na contagem (a análise
  /// começa junto com ela) ou já gravando.
  void pausou(MotivoPausa motivo) {
    if (_fase != FaseRapida.contagem && _fase != FaseRapida.registrando) return;
    _fase = FaseRapida.pausado;
    _motivo = motivo;
  }

  /// Operador resolveu a pausa (pulou, foi à saída, renovou) e voltou.
  /// [registrou]: a resolução já registrou a entrada (renovar a estadia de
  /// hóspede vencido registra) — conta no contador e vira a última.
  void sairDaPausa({bool registrou = false}) {
    final p = _placa;
    if (_fase != FaseRapida.pausado || p == null) return;
    if (registrou) {
      _registradas++;
      _ultima = (placa: p, aviso: null);
    }
    ignorar(p, ignorarRegistrada);
    _voltarALer();
  }

  /// App foi para o segundo plano: a contagem cancela. Uma gravação já em
  /// curso não é interrompida — ela é local e termina em milissegundos.
  void segundoPlano() {
    if (_fase == FaseRapida.contagem) _voltarALer();
  }

  void _voltarALer() {
    _fase = FaseRapida.lendo;
    _placa = null;
    _motivo = null;
  }
}
