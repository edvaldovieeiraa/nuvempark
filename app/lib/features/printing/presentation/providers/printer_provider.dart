import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

import '../../../../core/di/providers.dart';
import '../../data/print_templates.dart';

// ── State ────────────────────────────────────────────────────────────────────
class PrinterState {
  const PrinterState({
    this.isConnected = false,
    this.connectedMac,
    this.connectedName,
    this.isScanning = false,
    this.isPrinting = false,
    this.devices = const [],
    this.cols = PrintTemplates.cols58mm,
    this.avancoFinal = avancoPadrao,
  });

  /// Avanço padrão no fim do cupom (linhas). Calibrável em Ajustes.
  static const int avancoPadrao = 6;

  final bool isConnected;
  final String? connectedMac;
  final String? connectedName;
  final bool isScanning;
  final bool isPrinting;
  final List<BluetoothInfo> devices;

  /// Largura do papel em colunas (32 = 58mm, 48 = 80mm).
  final int cols;

  /// Linhas em branco no fim do cupom (calibra a posição de rasgo).
  final int avancoFinal;

  /// Há impressora configurada (conectada agora OU com MAC salvo — o print()
  /// reconecta sozinho). Use para decidir se imprime automaticamente.
  bool get temImpressora => isConnected || connectedMac != null;

  PrinterState copyWith({
    bool? isConnected,
    String? connectedMac,
    String? connectedName,
    bool? isScanning,
    bool? isPrinting,
    List<BluetoothInfo>? devices,
    int? cols,
    int? avancoFinal,
    bool clearMac = false,
    bool clearName = false,
  }) =>
      PrinterState(
        isConnected: isConnected ?? this.isConnected,
        connectedMac: clearMac ? null : connectedMac ?? this.connectedMac,
        connectedName: clearName ? null : connectedName ?? this.connectedName,
        isScanning: isScanning ?? this.isScanning,
        isPrinting: isPrinting ?? this.isPrinting,
        devices: devices ?? this.devices,
        cols: cols ?? this.cols,
        avancoFinal: avancoFinal ?? this.avancoFinal,
      );
}

// ── Notifier ─────────────────────────────────────────────────────────────────
class PrinterNotifier extends AsyncNotifier<PrinterState> {
  @override
  Future<PrinterState> build() async {
    final storage = ref.read(printerStorageProvider);
    final mac = await storage.readMac();
    final name = await storage.readName();
    final cols = await storage.readCols() ?? PrintTemplates.cols58mm;
    final avanco = await storage.readAvanco() ?? PrinterState.avancoPadrao;
    if (mac != null) {
      // connect() pode lançar (Bluetooth desligado no boot). Sem try/catch, o
      // provider caía em AsyncError e escondia o MAC salvo.
      var ok = false;
      try {
        ok = await ref.read(printerServiceProvider).connect(mac);
      } catch (_) {
        ok = false;
      }
      // Mesmo sem conectar agora, mantém o MAC: print() reconecta na hora.
      return PrinterState(
        isConnected: ok,
        connectedMac: mac,
        connectedName: name,
        cols: cols,
        avancoFinal: avanco,
      );
    }
    return PrinterState(cols: cols, avancoFinal: avanco);
  }

  Future<void> setCols(int cols) async {
    await ref.read(printerStorageProvider).saveCols(cols);
    state = AsyncData(_current.copyWith(cols: cols));
  }

  Future<void> setAvancoFinal(int linhas) async {
    final v = linhas.clamp(4, 20);
    await ref.read(printerStorageProvider).saveAvanco(v);
    state = AsyncData(_current.copyWith(avancoFinal: v));
  }

  Future<void> scan() async {
    final current = _current;
    state = AsyncData(current.copyWith(isScanning: true));
    try {
      final devices = await ref.read(printerServiceProvider).pairedDevices();
      state = AsyncData(current.copyWith(isScanning: false, devices: devices));
    } catch (_) {
      state = AsyncData(current.copyWith(isScanning: false));
    }
  }

  /// Retorna se conectou (a tela avisa o operador em caso de falha).
  Future<bool> connect(BluetoothInfo device) async {
    state = AsyncData(_current.copyWith(isScanning: true));
    try {
      final ok = await ref.read(printerServiceProvider).connect(device.macAdress);
      if (ok) {
        await ref.read(printerStorageProvider).save(
              mac: device.macAdress,
              name: device.name,
            );
        state = AsyncData(_current.copyWith(
          isScanning: false,
          isConnected: true,
          connectedMac: device.macAdress,
          connectedName: device.name,
        ));
      } else {
        state = AsyncData(_current.copyWith(isScanning: false));
      }
      return ok;
    } catch (_) {
      state = AsyncData(_current.copyWith(isScanning: false));
      return false;
    }
  }

  Future<bool> disconnect() async {
    try {
      await ref.read(printerServiceProvider).disconnect();
    } catch (_) {
      return false;
    }
    await ref.read(printerStorageProvider).clear();
    state = AsyncData(_current.copyWith(
      isConnected: false,
      clearMac: true,
      clearName: true,
    ));
    return true;
  }

  /// Imprime com conexão blindada: garante conexão antes de escrever
  /// (reconectando ao MAC salvo se preciso) e, se a escrita falhar, derruba,
  /// reconecta e tenta mais uma vez.
  Future<bool> print(List<int> bytes) async {
    if (_current.connectedMac == null) return false;
    // Mutex simples: evita dois prints concorrentes intercalarem bytes.
    if (_current.isPrinting) return false;
    state = AsyncData(_current.copyWith(isPrinting: true));
    try {
      final service = ref.read(printerServiceProvider);

      var ok = false;
      if (await service.isConnected) {
        ok = await service.printBytes(bytes);
      }
      if (!ok) {
        ok = await _reconectar() && await service.printBytes(bytes);
      }

      state = AsyncData(_current.copyWith(isPrinting: false, isConnected: ok));
      return ok;
    } catch (_) {
      state = AsyncData(_current.copyWith(isPrinting: false));
      return false;
    }
  }

  /// Tenta reconectar à impressora salva (usado pelo banner de conexão).
  Future<bool> reconectar() => _reconectar();

  Future<bool> _reconectar() async {
    final mac = _current.connectedMac;
    if (mac == null) return false;
    final service = ref.read(printerServiceProvider);
    try {
      await service.disconnect();
    } catch (_) {
      // best-effort — o socket pode já estar morto.
    }
    await Future<void>.delayed(const Duration(milliseconds: 400));
    final ok = await service.connect(mac);
    state = AsyncData(_current.copyWith(isConnected: ok));
    return ok;
  }

  PrinterState get _current => switch (state) {
        AsyncData(:final value) => value,
        _ => const PrinterState(),
      };
}

// ── Provider ─────────────────────────────────────────────────────────────────
final printerNotifierProvider =
    AsyncNotifierProvider<PrinterNotifier, PrinterState>(PrinterNotifier.new);
