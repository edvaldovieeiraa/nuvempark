import 'package:flutter/services.dart';

/// Formatter de placa: força maiúsculas e valida char por posição
/// (Mercosul LLLNLNN + antiga LLLNNNN convivem: pos5 aceita letra ou dígito).
///
/// Compartilhado entre registrar entrada e dar saída digitando a placa — as
/// duas telas precisam aceitar exatamente as mesmas placas.
class PlacaFormatter extends TextInputFormatter {
  const PlacaFormatter();

  /// Placa completa tem 7 caracteres.
  static const int tamanho = 7;

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final t = newValue.text.toUpperCase();
    final buf = StringBuffer();
    for (var i = 0; i < t.length && i < tamanho; i++) {
      final c = t[i];
      final ok = switch (i) {
        0 || 1 || 2 => RegExp(r'[A-Z]').hasMatch(c),
        3 => RegExp(r'[0-9]').hasMatch(c),
        4 => RegExp(r'[A-Z0-9]').hasMatch(c),
        _ => RegExp(r'[0-9]').hasMatch(c),
      };
      if (ok) buf.write(c);
    }
    final s = buf.toString();
    return TextEditingValue(
      text: s,
      selection: TextSelection.collapsed(offset: s.length),
    );
  }
}
