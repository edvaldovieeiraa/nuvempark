import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../caixa/presentation/caixa_screen.dart';
import '../home/presentation/home_screen.dart';
import '../menu/presentation/menu_geral_screen.dart';
import '../../core/heartbeat/heartbeat_service.dart';
import '../../core/platform/lock_task.dart';
import '../../core/platform/operacao_background.dart';
import '../../core/theme/app_colors.dart';
import '../patio/domain/patio_model.dart';
import '../patio/presentation/patio_tab.dart';
import '../patio/presentation/providers/patio_provider.dart';
import '../printing/presentation/providers/printer_provider.dart';
import '../sync/data/sync_loop.dart';
import 'conexao_banner.dart';

/// Casco principal do app: bottom nav com Início / Pátio / Caixa / Menu Geral.
/// As abas vivem num IndexedStack (estado preservado ao trocar).
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _aba = 0;

  @override
  void initState() {
    super.initState();
    // Warm-up da impressora: conecta ao MAC salvo já no login, em background.
    // Sem isto a 1ª impressão do dia via ref.read() via o provider ainda
    // carregando e PULAVA o print (sintoma: "só funciona depois de abrir a
    // tela de configuração").
    Future.microtask(
      () => ref.read(printerNotifierProvider.future).catchError(
            (_) => const PrinterState(),
          ),
    );

    // Modo quiosque (Lock Task): fixa o app na tela, conforme a parametrização
    // do pátio (default ligado). Na 1ª vez o Android pede confirmação.
    Future.microtask(() async {
      final patio = await ref.read(patioNotifierProvider.future);
      await _aplicarQuiosque(patio);
    });

    // Sincronização contínua (push + pull a cada 30s) enquanto o app está
    // aberto. O operador não clica em nada: cadastros da dashboard chegam
    // sozinhos e a fila local sobe sozinha. Pausa em background.
    Future.microtask(() => ref.read(syncLoopProvider).iniciar());

    // Heartbeat (60s): diz ao painel do gestor que este app está vivo mesmo
    // sem movimentação. Mecanismo à parte do sync — ver HeartbeatService.
    Future.microtask(() => ref.read(heartbeatServiceProvider).iniciar());

    // Operação em segundo plano: sem isto, os dois timers acima param assim
    // que a tela apaga (o Android congela o processo). Duas camadas — ver
    // OperacaoBackground.
    Future.microtask(_manterVivoEmBackground);
  }

  @override
  void dispose() {
    ref.read(syncLoopProvider).parar();
    ref.read(heartbeatServiceProvider).parar();
    OperacaoBackground.parar();
    super.dispose();
  }

  /// Camada 1 (tablet na tomada): tela nunca dorme — só em Device Owner.
  /// Camada 2 (aparelho que dorme): foreground service segura o processo.
  ///
  /// As duas juntas de propósito: a 1ª não vale em aparelho não provisionado e
  /// a 2ª não vale se o Doze bloquear a rede. Cada uma cobre o furo da outra.
  Future<void> _manterVivoEmBackground() async {
    await OperacaoBackground.iniciar();
    await OperacaoBackground.manterTelaLigada(true);
  }

  void _irPara(int i) => setState(() => _aba = i);

  /// Liga/desliga o quiosque conforme a config do pátio (default ligado).
  Future<void> _aplicarQuiosque(PatioModel? patio) async {
    if (patio?.modoQuiosque ?? true) {
      await LockTask.iniciar();
    } else {
      await LockTask.parar();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Reage a mudanças da config (o gestor troca o modo → app re-sincroniza).
    ref.listen(patioNotifierProvider, (_, next) {
      _aplicarQuiosque(next.value);
    });
    return Scaffold(
      // A nav do Brisa FLUTUA sobre o conteúdo — por isso Stack, e não
      // bottomNavigationBar: aquele reserva altura e empurraria as telas.
      // O padding de baixo das telas (24) + os 78 daqui é o que impede a
      // última linha de lista de ficar debaixo da pílula.
      body: Stack(
        children: [
          Column(
            children: [
              Expanded(
                child: IndexedStack(
                  index: _aba,
                  children: [
                    HomeScreen(
                      onVerPatio: () => _irPara(1),
                      onVerCaixa: () => _irPara(2),
                    ),
                    const PatioTab(),
                    const CaixaScreen(),
                    const MenuGeralScreen(),
                  ],
                ),
              ),
              // Alerta global: offline / impressora desconectada (retrátil)
              const ConexaoBanner(),
              // Reserva o espaço da pílula flutuante.
              const SizedBox(height: 78),
            ],
          ),
          Positioned(left: 20, right: 20, bottom: 16, child: _navBrisa()),
        ],
      ),
    );
  }

  /// Barra inferior do Brisa: pílula escura flutuante. O item ativo vira uma
  /// pílula verde COM rótulo; os inativos são só ícone — o rótulo aparece
  /// onde você está, não onde você poderia ir.
  Widget _navBrisa() {
    const itens = [
      (Icons.home, 'Início'),
      (Icons.directions_car, 'Pátio'),
      (Icons.account_balance_wallet, 'Caixa'),
      (Icons.menu, 'Menu'),
    ];
    return Container(
      height: 62,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceInverse,
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: AppColors.surfaceInverse.withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          for (var i = 0; i < itens.length; i++)
            Expanded(
              child: InkWell(
                onTap: () => _irPara(i),
                borderRadius: BorderRadius.circular(999),
                child: Center(
                  child: _aba == i
                      ? AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 9),
                          decoration: BoxDecoration(
                            color: AppColors.primaryFill,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(itens[i].$1, size: 20, color: Colors.white),
                              const SizedBox(width: 7),
                              Text(
                                itens[i].$2,
                                style: const TextStyle(
                                  fontSize: 13,
                                  height: 1,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        )
                      : Icon(itens[i].$1,
                          size: 22, color: AppColors.secondaryFixed),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
