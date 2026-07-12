import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tickets/data/placa_ocr_service.dart';

void main() {
  group('PlacaOcrService.extrairPlaca — casos limpos', () {
    test('reconhece placa Mercosul', () {
      expect(PlacaOcrService.extrairPlaca('ABC1D23'), 'ABC1D23');
    });

    test('reconhece placa antiga', () {
      expect(PlacaOcrService.extrairPlaca('ABC1234'), 'ABC1234');
    });

    test('extrai a placa de texto com ruído (badges, moldura)', () {
      const texto = 'HONDA CIVIC\nBRA2E19\nCONCESSIONARIA XPTO';
      expect(PlacaOcrService.extrairPlaca(texto), 'BRA2E19');
    });

    test('normaliza minúsculas, hífen e espaços', () {
      expect(PlacaOcrService.extrairPlaca('abc-1234'), 'ABC1234');
      expect(PlacaOcrService.extrairPlaca('a b c 1 d 2 3'), 'ABC1D23');
    });

    test('prefere Mercosul quando dois candidatos empatam sem correção', () {
      expect(PlacaOcrService.extrairPlaca('XYZ9876 ABC1D23'), 'ABC1D23');
    });

    test('retorna null quando não há placa', () {
      expect(PlacaOcrService.extrairPlaca('SEM PLACA AQUI 12'), isNull);
      expect(PlacaOcrService.extrairPlaca(''), isNull);
      expect(PlacaOcrService.extrairPlaca('ABC12'), isNull);
    });
  });

  group('PlacaOcrService.extrairPlaca — correção por posição (confusões OCR)', () {
    test('corrige letra lida no lugar de dígito (pos 4): I→1', () {
      expect(PlacaOcrService.extrairPlaca('ABCID23'), 'ABC1D23');
    });

    test('corrige dígito lido no lugar de letra (pos 1): 0→O', () {
      expect(PlacaOcrService.extrairPlaca('0BC1D23'), 'OBC1D23');
    });

    test('corrige confusão comum em placa antiga: S→5', () {
      expect(PlacaOcrService.extrairPlaca('ABC82S4'), 'ABC8254');
    });

    test('rejeita candidato que exige 2+ correções (evita falso positivo)', () {
      expect(PlacaOcrService.extrairPlaca('ABCB2S4'), isNull);
    });

    test('escolhe a janela com MENOS correções', () {
      expect(PlacaOcrService.extrairPlaca('PARK BRA2E19 SAIDA'), 'BRA2E19');
    });

    test('não inventa placa a partir de palavra comum', () {
      expect(PlacaOcrService.extrairPlaca('MERCADO LIVRE'), isNull);
    });

    test('placa dentro de token maior é extraída', () {
      expect(PlacaOcrService.extrairPlaca('ABC1D23BR'), 'ABC1D23');
    });
  });
}
