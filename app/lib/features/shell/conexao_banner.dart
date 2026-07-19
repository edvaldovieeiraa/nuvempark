import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../printing/presentation/providers/printer_provider.dart';

/// Banner retrátil de status: avisa quando o aparelho está OFFLINE e/ou a
/// impressora Bluetooth configurada está DESCONECTADA. Fica acima do bottom
/// nav; colapsa num badge fino de ícones (toque para expandir de novo).
class ConexaoBanner extends ConsumerStatefulWidget {
  const ConexaoBanner({super.key});

  @override
  ConsumerState<ConexaoBanner> createState() => _ConexaoBannerState();
}

class _ConexaoBannerState extends ConsumerState<ConexaoBanner> {
  StreamSubscription<List<ConnectivityResult>>? _sub;
  bool _offline = false;
  bool _expandido = true;
  bool _reconectando = false;

  @override
  void initState() {
    super.initState();
    final conn = Connectivity();
    conn.checkConnectivity().then(_atualizar);
    _sub = conn.onConnectivityChanged.listen(_atualizar);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  void _atualizar(List<ConnectivityResult> r) {
    final offline = r.isEmpty || r.every((c) => c == ConnectivityResult.none);
    if (offline != _offline && mounted) {
      setState(() {
        _offline = offline;
        // Problema novo → reabre o banner mesmo se estava colapsado.
        if (offline) _expandido = true;
      });
    }
  }

  Future<void> _reconectarImpressora() async {
    if (_reconectando) return;
    setState(() => _reconectando = true);
    await ref.read(printerNotifierProvider.notifier).reconectar();
    if (mounted) setState(() => _reconectando = false);
  }

  @override
  Widget build(BuildContext context) {
    final printer = ref.watch(printerNotifierProvider).value;
    // Só alerta de impressora quando HÁ uma configurada e ela caiu.
    final impressoraCaiu =
        printer != null && printer.connectedMac != null && !printer.isConnected;

    if (!_offline && !impressoraCaiu) return const SizedBox.shrink();

    // ── Colapsado: badge fino só com os ícones ──
    if (!_expandido) {
      return _flutuante(Material(
        color: AppColors.surface,
        child: InkWell(
          onTap: () => setState(() => _expandido = true),
          child: Container(
            height: 30,
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (_offline) ...[
                  const Icon(Icons.wifi_off, size: 15, color: AppColors.saida),
                  const SizedBox(width: 4),
                  const Text('offline',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.saida)),
                  const SizedBox(width: 12),
                ],
                if (impressoraCaiu) ...[
                  const Icon(Icons.print_disabled,
                      size: 15, color: AppColors.danger),
                  const SizedBox(width: 4),
                  const Text('impressora',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.danger)),
                ],
                const SizedBox(width: 8),
                const Icon(Icons.keyboard_arrow_up,
                    size: 16, color: AppColors.onSurfaceVariant),
              ],
            ),
          ),
        ),
      ));
    }

    // ── Expandido: barras com mensagem e ação ──
    return _flutuante(Material(
      color: AppColors.surface,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_offline)
            _barra(
              cor: AppColors.saida,
              bg: AppColors.saidaBg,
              icone: Icons.wifi_off,
              texto:
                  'Sem internet — pode operar normal, tudo sincroniza depois.',
            ),
          if (impressoraCaiu)
            _barra(
              cor: AppColors.danger,
              bg: const Color(0xFFFDECEC),
              icone: Icons.print_disabled,
              texto: 'Impressora desconectada.',
              acao: _reconectando
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : TextButton(
                      onPressed: _reconectarImpressora,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        minimumSize: const Size(0, 30),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text('Reconectar',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.w800)),
                    ),
            ),
        ],
      ),
    ));
  }

  /// A nav virou vidro flutuante; o banner flutua junto, com o mesmo recuo
  /// lateral e cantos arredondados. Encostado nela — e em largura total — ele
  /// lia como erro de layout, uma faixa opaca brotando debaixo da pílula.
  ///
  /// O envelope mora aqui, e não no shell, porque quando não há o que avisar
  /// este widget devolve `SizedBox.shrink()`: um Padding lá fora reservaria
  /// espaço de um banner que não existe, empurrando a nav para cima à toa.
  Widget _flutuante(Widget filho) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: filho,
        ),
      );

  Widget _barra({
    required Color cor,
    required Color bg,
    required IconData icone,
    required String texto,
    Widget? acao,
  }) =>
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          border: Border(top: BorderSide(color: cor.withValues(alpha: 0.25))),
        ),
        child: Row(
          children: [
            Icon(icone, size: 16, color: cor),
            const SizedBox(width: 8),
            Expanded(
              child: Text(texto,
                  style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600, color: cor)),
            ),
            ?acao,
            IconButton(
              icon: const Icon(Icons.keyboard_arrow_down, size: 18),
              color: cor,
              padding: EdgeInsets.zero,
              constraints:
                  const BoxConstraints(minWidth: 30, minHeight: 30),
              tooltip: 'Recolher',
              onPressed: () => setState(() => _expandido = false),
            ),
          ],
        ),
      );
}
