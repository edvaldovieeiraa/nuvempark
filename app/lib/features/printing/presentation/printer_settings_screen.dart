import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nuvempark_core/nuvempark_core.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../core/theme/app_colors.dart';
import '../data/print_templates.dart';
import 'providers/printer_provider.dart';

enum _PermState { checking, granted, denied, permanentlyDenied }

class PrinterSettingsScreen extends ConsumerStatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  ConsumerState<PrinterSettingsScreen> createState() =>
      _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends ConsumerState<PrinterSettingsScreen>
    with WidgetsBindingObserver {
  _PermState _perm = _PermState.checking;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPerms();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _perm == _PermState.permanentlyDenied) {
      _checkPerms();
    }
  }

  Future<void> _checkPerms() async {
    final scan = await Permission.bluetoothScan.status;
    final connect = await Permission.bluetoothConnect.status;
    setState(() {
      if (scan.isGranted && connect.isGranted) {
        _perm = _PermState.granted;
      } else if (scan.isPermanentlyDenied || connect.isPermanentlyDenied) {
        _perm = _PermState.permanentlyDenied;
      } else {
        _perm = _PermState.denied;
      }
    });
    if (_perm == _PermState.granted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(printerNotifierProvider.notifier).scan();
      });
    }
  }

  Future<void> _requestPerms() async {
    final res = await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
    ].request();
    final granted = res.values.every((s) => s.isGranted);
    if (granted) {
      setState(() => _perm = _PermState.granted);
      ref.read(printerNotifierProvider.notifier).scan();
    } else if (res.values.any((s) => s.isPermanentlyDenied)) {
      setState(() => _perm = _PermState.permanentlyDenied);
    } else {
      setState(() => _perm = _PermState.denied);
    }
  }

  @override
  Widget build(BuildContext context) {
    final printerAsync = ref.watch(printerNotifierProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Impressora Bluetooth')),
      body: switch (_perm) {
        _PermState.checking =>
          const Center(child: CircularProgressIndicator()),
        _PermState.denied || _PermState.permanentlyDenied =>
          _permissionCard(),
        _PermState.granted => printerAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ErrorState(
              mensagem: 'Erro ao carregar a impressora.',
              onRetry: () => ref.invalidate(printerNotifierProvider),
            ),
            data: (printer) => _lista(printer),
          ),
      },
    );
  }

  Widget _permissionCard() => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.bluetooth_disabled, size: 56, color: AppColors.outline),
              const SizedBox(height: 16),
              const Text('Permissão de Bluetooth necessária',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              const Text('Para conectar à impressora, permita o acesso ao Bluetooth.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.onSurfaceVariant)),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _perm == _PermState.permanentlyDenied
                    ? openAppSettings
                    : _requestPerms,
                child: Text(_perm == _PermState.permanentlyDenied
                    ? 'Abrir configurações'
                    : 'Permitir Bluetooth'),
              ),
            ],
          ),
        ),
      );

  Widget _lista(PrinterState printer) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Status
          Card(
            child: ListTile(
              leading: Icon(
                printer.isConnected ? Icons.print : Icons.print_disabled,
                color: printer.isConnected ? AppColors.success : AppColors.outline,
              ),
              title: Text(printer.connectedName ?? 'Nenhuma impressora'),
              subtitle: Text(printer.isConnected
                  ? 'Conectada'
                  : (printer.connectedMac != null ? 'Salva (desconectada)' : 'Não configurada')),
              trailing: printer.connectedMac != null
                  ? TextButton(
                      onPressed: () async {
                        final ok = await ref
                            .read(printerNotifierProvider.notifier)
                            .disconnect();
                        if (!mounted) return;
                        ok
                            ? AppToast.info(context, 'Impressora desconectada')
                            : AppToast.error(context, 'Falha ao desconectar');
                      },
                      child: const Text('Remover'),
                    )
                  : null,
            ),
          ),
          const SizedBox(height: 16),

          // Largura do papel
          const Text('Largura do papel', style: _labelStyle),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: const Text('58mm'),
                selected: printer.cols == PrintTemplates.cols58mm,
                onSelected: (_) => ref
                    .read(printerNotifierProvider.notifier)
                    .setCols(PrintTemplates.cols58mm),
              ),
              ChoiceChip(
                label: const Text('80mm'),
                selected: printer.cols == PrintTemplates.cols80mm,
                onSelected: (_) => ref
                    .read(printerNotifierProvider.notifier)
                    .setCols(PrintTemplates.cols80mm),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Avanço final
          const Text('Avanço no fim do cupom', style: _labelStyle),
          const SizedBox(height: 8),
          Row(
            children: [
              IconButton.outlined(
                onPressed: () => ref
                    .read(printerNotifierProvider.notifier)
                    .setAvancoFinal(printer.avancoFinal - 1),
                icon: const Icon(Icons.remove),
              ),
              Expanded(
                child: Center(
                  child: Text('${printer.avancoFinal} linhas',
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              IconButton.outlined(
                onPressed: () => ref
                    .read(printerNotifierProvider.notifier)
                    .setAvancoFinal(printer.avancoFinal + 1),
                icon: const Icon(Icons.add),
              ),
            ],
          ),
          const SizedBox(height: 8),

          if (printer.connectedMac != null)
            OutlinedButton.icon(
              onPressed: () async {
                final bytes = PrintTemplates.testeImpressao(
                  agora: DateTime.now(),
                  cols: printer.cols,
                  avancoFinal: printer.avancoFinal,
                  impressoraNome: printer.connectedName,
                );
                final ok =
                    await ref.read(printerNotifierProvider.notifier).print(bytes);
                if (!mounted) return;
                ok
                    ? AppToast.success(context, 'Teste enviado à impressora')
                    : AppToast.error(context, 'Falha ao imprimir o teste');
              },
              icon: const Icon(Icons.receipt_long),
              label: const Text('Imprimir página de teste'),
            ),

          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Dispositivos pareados', style: _labelStyle),
              TextButton.icon(
                onPressed: printer.isScanning
                    ? null
                    : () => ref.read(printerNotifierProvider.notifier).scan(),
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Atualizar'),
              ),
            ],
          ),
          if (printer.isScanning)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (printer.devices.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('Nenhum dispositivo pareado. Pareie a impressora nas configurações de Bluetooth do Android.',
                  style: TextStyle(color: AppColors.onSurfaceVariant)),
            )
          else
            ...printer.devices.map((d) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.bluetooth),
                    title: Text(d.name),
                    subtitle: Text(d.macAdress),
                    trailing: printer.connectedMac == d.macAdress
                        ? const Text('Conectada',
                            style: TextStyle(color: AppColors.success, fontWeight: FontWeight.w600))
                        : TextButton(
                            onPressed: () async {
                              final ok = await ref
                                  .read(printerNotifierProvider.notifier)
                                  .connect(d);
                              if (mounted && !ok) {
                                AppToast.error(context,
                                    'Não foi possível conectar à ${d.name}. Verifique se está ligada e no alcance.');
                              }
                            },
                            child: const Text('Conectar'),
                          ),
                  ),
                )),
        ],
      );

  static const _labelStyle = TextStyle(
      fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant);
}
