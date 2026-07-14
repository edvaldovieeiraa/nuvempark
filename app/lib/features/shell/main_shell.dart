import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../caixa/presentation/caixa_screen.dart';
import '../home/presentation/home_screen.dart';
import '../menu/presentation/menu_geral_screen.dart';
import '../../core/platform/lock_task.dart';
import '../patio/presentation/patio_tab.dart';
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

    // Fixa o app na tela (bloqueia barra de notificação/status e botões do
    // sistema). Na 1ª vez o Android pede confirmação (sem device owner).
    Future.microtask(LockTask.iniciar);

    // Sincronização contínua (push + pull a cada 30s) enquanto o app está
    // aberto. O operador não clica em nada: cadastros da dashboard chegam
    // sozinhos e a fila local sobe sozinha. Pausa em background.
    Future.microtask(() => ref.read(syncLoopProvider).iniciar());
  }

  @override
  void dispose() {
    ref.read(syncLoopProvider).parar();
    super.dispose();
  }

  void _irPara(int i) => setState(() => _aba = i);

  @override
  Widget build(BuildContext context) {
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
            label: 'Menu Geral',
          ),
        ],
      ),
    );
  }
}
