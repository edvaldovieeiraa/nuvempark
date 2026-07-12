import 'dart:convert';

/// Construtor de bytes ESC/POS para impressoras térmicas 58mm/80mm.
class EscPosBuilder {
  final List<int> _bytes = [];

  EscPosBuilder reset() {
    _bytes
      ..addAll([0x1B, 0x40]) // Initialize printer
      ..addAll([0x1B, 0x74, 0x02]); // Code page CP850 (Western European)
    return this;
  }

  EscPosBuilder centerAlign() {
    _bytes.addAll([0x1B, 0x61, 0x01]);
    return this;
  }

  EscPosBuilder leftAlign() {
    _bytes.addAll([0x1B, 0x61, 0x00]);
    return this;
  }

  EscPosBuilder boldOn() {
    _bytes.addAll([0x1B, 0x45, 0x01]);
    return this;
  }

  EscPosBuilder boldOff() {
    _bytes.addAll([0x1B, 0x45, 0x00]);
    return this;
  }

  EscPosBuilder text(String s) {
    _bytes.addAll(latin1.encode(_normalize(s)));
    return this;
  }

  EscPosBuilder line(String s) => text('$s\n');

  EscPosBuilder feed([int n = 1]) {
    for (var i = 0; i < n; i++) {
      _bytes.add(0x0A);
    }
    return this;
  }

  EscPosBuilder separator({int width = 32, String char = '-'}) =>
      line(char * width);

  /// Imprime um QR code nativo (ESC/POS `GS ( k`, model 2).
  /// Impressoras sem suporte ignoram o comando (o resto ainda sai).
  EscPosBuilder qrCode(String data, {int moduleSize = 6}) {
    final payload = latin1.encode(data);
    final len = payload.length + 3;
    final pL = len % 256;
    final pH = len ~/ 256;
    _bytes
      ..addAll([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]) // model 2
      ..addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, moduleSize]) // module size
      ..addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]) // EC level M
      ..addAll([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]) // store data
      ..addAll(payload)
      ..addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]); // print
    return this;
  }

  /// Finaliza o cupom com [feedLines] linhas de avanço (via motor, ESC J — o
  /// firmware descarta LFs vazios no fim; comando de motor não é filtrado) e,
  /// quando [cutter] true, o corte parcial (GS V).
  EscPosBuilder cut({int feedLines = 10, bool cutter = false}) {
    // 1 "linha" ≈ 30 pontos. ESC J aceita até 255 pontos por comando.
    var restante = feedLines * 30;
    while (restante > 0) {
      final n = restante > 255 ? 255 : restante;
      _bytes.addAll([0x1B, 0x4A, n]);
      restante -= n;
    }
    if (cutter) {
      _bytes.addAll([0x1D, 0x56, 0x41, 0x00]);
    }
    return this;
  }

  List<int> build() => List.unmodifiable(_bytes);

  /// Troca acentos por ASCII para impressoras sem charset estendido.
  static String _normalize(String s) => s
      // NBSP (NumberFormat pt_BR insere entre "R$" e valor) vira 0xA0 em latin1,
      // que na CP850 é "á" — troca por espaço comum.
      .replaceAll('\u{00A0}', ' ')
      .replaceAll('\u{202F}', ' ')
      .replaceAll(RegExp('[ãâàáä]'), 'a')
      .replaceAll(RegExp('[ÃÂÀÁÄ]'), 'A')
      .replaceAll(RegExp('[éêèë]'), 'e')
      .replaceAll(RegExp('[ÉÊÈË]'), 'E')
      .replaceAll(RegExp('[íîìï]'), 'i')
      .replaceAll(RegExp('[ÍÎÌÏ]'), 'I')
      .replaceAll(RegExp('[õôòóö]'), 'o')
      .replaceAll(RegExp('[ÕÔÒÓÖ]'), 'O')
      .replaceAll(RegExp('[úûùü]'), 'u')
      .replaceAll(RegExp('[ÚÛÙÜ]'), 'U')
      .replaceAll('ç', 'c')
      .replaceAll('Ç', 'C')
      .replaceAll('ñ', 'n')
      .replaceAll('Ñ', 'N');
}
