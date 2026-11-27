/// Como um recibo sai depois da operação gravada. Parametrização do painel,
/// por pátio (Configurações → Parametrização → Impressão de recibos).
///
/// Reimprimir pela tela vale em qualquer modo: o modo só decide o que acontece
/// SOZINHO depois de gravar.
enum ModoImpressao {
  /// Imprime sem perguntar (o comportamento de sempre).
  automatica,

  /// Grava e mostra um aviso com o botão "Imprimir".
  perguntar,

  /// Não imprime.
  desativada;

  /// Valor do bootstrap. Ausente ou desconhecido = [automatica]: API antiga e
  /// cache de antes do campo continuam imprimindo como sempre.
  static ModoImpressao parse(Object? v) => switch (v) {
        'perguntar' => ModoImpressao.perguntar,
        'desativada' => ModoImpressao.desativada,
        _ => ModoImpressao.automatica,
      };
}
