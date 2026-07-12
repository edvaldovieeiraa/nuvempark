import 'dart:io';

import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

/// Reconhecimento de placa a partir de uma foto — 100% on-device (offline)
/// via Google ML Kit. NUNCA é autoritativo: o resultado só pré-preenche o
/// campo para o operador confirmar/corrigir.
///
/// Estratégia:
///  1. Usa a estrutura do ML Kit (blocos → linhas → elementos). Cada token
///     vira um candidato.
///  2. Corrige cada candidato por POSIÇÃO no formato BR (Mercosul LLL-N-L-NN
///     e antiga LLL-NNNN), trocando confusões de OCR (O↔0, I↔1…) só quando a
///     posição exige.
///  3. Escolhe o candidato com MENOS correções; empate → texto MAIOR → mais à
///     esquerda.
class PlacaOcrService {
  PlacaOcrService({TextRecognizer? recognizer})
      : _recognizer =
            recognizer ?? TextRecognizer(script: TextRecognitionScript.latin);

  final TextRecognizer _recognizer;

  // Máscaras de posição: L = letra, N = dígito.
  static const String _mascaraMercosul = 'LLLNLNN';
  static const String _mascaraAntiga = 'LLLNNNN';

  // Teto de correções por candidato. Conservador: só 1 char pode ser corrigido.
  // Uma placa errada pré-preenchida é pior que o operador digitar.
  static const int _maxCorrecoes = 1;

  // Dígito lido como letra (OCR trocou) → letra provável.
  static const Map<String, String> _digitoParaLetra = {
    '0': 'O', '1': 'I', '2': 'Z', '4': 'A', '5': 'S', '6': 'G', '7': 'T', '8': 'B',
  };

  // Letra lida como dígito (OCR trocou) → dígito provável.
  static const Map<String, String> _letraParaDigito = {
    'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2',
    'A': '4', 'S': '5', 'G': '6', 'T': '7', 'B': '8',
  };

  /// Roda o OCR na imagem [file] e retorna a placa reconhecida (7 chars,
  /// maiúscula) ou `null`.
  Future<String?> lerPlaca(File file) async {
    final result = await _recognizer.processImage(InputImage.fromFile(file));

    _Candidato? melhor;
    void considerar(String texto, double altura) {
      final m = _melhorMatch(texto);
      if (m == null) return;
      final c = _Candidato(m.placa, m.correcoes, altura);
      if (melhor == null || c.melhorQue(melhor!)) melhor = c;
    }

    for (final block in result.blocks) {
      for (final line in block.lines) {
        considerar(line.text, line.boundingBox.height);
        for (final el in line.elements) {
          considerar(el.text, el.boundingBox.height);
        }
      }
    }

    return melhor?.placa;
  }

  /// Extrai a placa de um texto livre. Exposto para teste unitário.
  static String? extrairPlaca(String texto) => _melhorMatch(texto)?.placa;

  static _MatchPlaca? _melhorMatch(String texto) {
    final limpo = texto.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    if (limpo.length < 7) return null;

    _MatchPlaca? melhor;
    for (var i = 0; i + 7 <= limpo.length; i++) {
      final janela = limpo.substring(i, i + 7);
      for (final (mascara, mercosul) in const [
        (_mascaraMercosul, true),
        (_mascaraAntiga, false),
      ]) {
        final m = _aplicarMascara(janela, mascara, mercosul);
        if (m == null) continue;
        if (melhor == null || m.melhorQue(melhor)) melhor = m;
      }
    }
    return melhor;
  }

  static _MatchPlaca? _aplicarMascara(
      String janela, String mascara, bool mercosul) {
    final buffer = StringBuffer();
    var correcoes = 0;
    for (var i = 0; i < 7; i++) {
      final c = janela[i];
      final precisaLetra = mascara[i] == 'L';
      final coagido = precisaLetra ? _paraLetra(c) : _paraDigito(c);
      if (coagido == null) return null;
      if (coagido != c) correcoes++;
      buffer.write(coagido);
    }
    if (correcoes > _maxCorrecoes) return null;
    return _MatchPlaca(buffer.toString(), correcoes, mercosul);
  }

  static String? _paraLetra(String c) {
    if (RegExp(r'[A-Z]').hasMatch(c)) return c;
    return _digitoParaLetra[c];
  }

  static String? _paraDigito(String c) {
    if (RegExp(r'[0-9]').hasMatch(c)) return c;
    return _letraParaDigito[c];
  }

  Future<void> dispose() => _recognizer.close();
}

/// Placa candidata + custo de correção + máscara usada.
class _MatchPlaca {
  const _MatchPlaca(this.placa, this.correcoes, this.mercosul);
  final String placa;
  final int correcoes;
  final bool mercosul;

  bool melhorQue(_MatchPlaca other) {
    if (correcoes != other.correcoes) return correcoes < other.correcoes;
    return mercosul && !other.mercosul;
  }
}

/// Candidato vindo do OCR de imagem, com altura do texto para desempate.
class _Candidato {
  const _Candidato(this.placa, this.correcoes, this.altura);
  final String placa;
  final int correcoes;
  final double altura;

  bool melhorQue(_Candidato other) {
    if (correcoes != other.correcoes) return correcoes < other.correcoes;
    return altura > other.altura;
  }
}
