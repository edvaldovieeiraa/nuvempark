import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../caixa/presentation/caixa_screen.dart';
import '../home/presentation/home_screen.dart';
import '../menu/presentation/menu_geral_screen.dart';
import '../../core/heartbeat/heartbeat_service.dart';
import '../../core/platform/lock_task.dart';
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
  }

  @override
  void dispose() {
    ref.read(syncLoopProvider).parar();
    ref.read(heartbeatServiceProvider).parar();
    super.dispose();
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
      body: Column(
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
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _aba,
        onDestinationSelected: _irPara,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Início',
          ),
          NavigationDestination(
            icon: Icon(Icons.directions_car_outlined),
            selectedIcon: Icon(Icons.directions_car),
            label: 'Pátio',
          ),
          NavigationDestination(
            icon: Icon(Icons.point_of_sale_outlined),
            selectedIcon: Icon(Icons.point_of_sale),
            label: 'Caixa',
          ),
          NavigationDestination(
            icon: Icon(Icons.apps_outlined),
            selectedIcon: Icon(Icons.apps),
            label: 'Menu',
          ),
        ],
      ),
    );
  }
}
