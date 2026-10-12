import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';

/// Da entrada ("Veículo já no pátio") para a saída: a saída toma o lugar da
/// entrada, por cima da home.
///
/// Nunca `go`. As rotas do app estão todas no mesmo nível, então um `go`
/// deixava a saída sozinha na pilha: o `pop` do fim da saída lançava (e virava
/// "Erro ao registrar saída" com a saída já gravada), o voltar não fazia nada
/// e a home — a MainShell, que segura sincronização e heartbeat — era
/// descartada.
void abrirSaidaNoLugarDaEntrada(BuildContext context, String ticketId) =>
    context.pushReplacement(Routes.saidaDetalhe(ticketId));

/// Sai da tela de saída. Sem tela embaixo, vai para a home em vez de lançar —
/// a saída já foi gravada, falhar aqui só confundiria o operador.
void fecharSaida(BuildContext context) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(Routes.home);
  }
}
