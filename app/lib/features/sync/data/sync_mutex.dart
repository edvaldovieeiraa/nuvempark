import 'dart:async';

/// Fila de exclusão mútua entre o ENVIO da outbox e a LEITURA dos veículos no
/// pátio.
///
/// A leitura apaga do Drift o ticket aberto e já sincronizado que o servidor
/// não lista mais (saiu por outro aparelho). Se um envio marcasse um ticket
/// recém-criado como sincronizado enquanto a leitura estava no ar, a lista do
/// servidor — tirada antes — não o teria, e ele sumiria da tela do próprio
/// aparelho que o registrou. Rodando um de cada vez, isso não acontece.
class SyncMutex {
  Future<void> _ultimo = Future.value();

  Future<T> exclusivo<T>(Future<T> Function() acao) {
    final anterior = _ultimo;
    final vez = Completer<void>();
    _ultimo = vez.future;
    return anterior.then((_) => acao()).whenComplete(vez.complete);
  }
}
