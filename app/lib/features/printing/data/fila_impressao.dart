import 'dart:async';

/// Impressões em fila: cada uma espera a anterior terminar.
///
/// `PrinterNotifier.print` RECUSA (devolve `false`) quando já há uma impressão
/// em curso — é a trava que impede dois prints de intercalarem bytes. Sozinha,
/// ela fazia o segundo cupom de uma sequência rápida falhar ("Falha ao
/// imprimir o ticket"). No modo rápido os cupons saem em rajada, então cada
/// trabalho entra aqui e só começa quando o anterior soltar a impressora.
///
/// A fila não sabe o que é impressora: o trabalho lê o estado, monta os bytes
/// e imprime. Ela só garante a ordem e que a falha de um não contamine o
/// próximo. Vive em memória — fechar o app descarta o que não saiu (o carro já
/// entrou; o cupom é o que se perde).
class FilaImpressao {
  FilaImpressao({this.limite = const Duration(seconds: 60)});

  /// Teto de cada trabalho. Uma impressão pendurada no Bluetooth não pode
  /// segurar todos os cupons seguintes — inclusive os da entrada normal, que
  /// também passam por aqui. Folgado: reconectar e imprimir foto leva
  /// segundos, não minutos.
  final Duration limite;

  Future<void> _cauda = Future<void>.value();
  int _pendentes = 0;

  /// Trabalhos na fila, contando o que está imprimindo.
  int get pendentes => _pendentes;

  /// Roda [trabalho] depois de todos os anteriores. Devolve se imprimiu; erro
  /// do trabalho (síncrono ou não) ou estouro do [limite] vira `false` — nunca
  /// lança.
  Future<bool> enfileirar(FutureOr<bool> Function() trabalho) {
    _pendentes++;
    final este = _cauda
        .then((_) => Future.sync(trabalho).timeout(limite))
        .then((ok) => ok, onError: (Object _) => false)
        .whenComplete(() => _pendentes--);
    _cauda = este.then((_) {});
    return este;
  }
}
