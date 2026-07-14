import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tickets/domain/ticket_qr.dart';

void main() {
  const id = '8f14e45f-ceea-467a-9575-1a1b2c3d4e5f';

  group('extrairTicketId', () {
    test('id cru — os cupons JÁ IMPRESSOS não podem parar de funcionar', () {
      expect(extrairTicketId(id), id);
    });

    test('URL pública', () {
      expect(extrairTicketId('https://nuvempark.com/t/$id'), id);
    });

    test('URL com barra no fim', () {
      expect(extrairTicketId('https://nuvempark.com/t/$id/'), id);
    });

    test('outro domínio: o id é o que importa (cupom antigo, domínio velho)', () {
      expect(extrairTicketId('https://outro.site.com.br/qualquer/caminho/$id'), id);
    });

    test('http também', () {
      expect(extrairTicketId('http://localhost:3000/t/$id'), id);
    });

    test('espaços em volta são tolerados', () {
      expect(extrairTicketId('  $id  '), id);
    });

    test('maiúsculas normalizam para minúsculas', () {
      expect(extrairTicketId(id.toUpperCase()), id);
    });

    test('URL sem uuid no fim → null', () {
      expect(extrairTicketId('https://nuvempark.com/t/'), isNull);
      expect(extrairTicketId('https://nuvempark.com/'), isNull);
    });

    test('lixo → null', () {
      expect(extrairTicketId('nada disso'), isNull);
      expect(extrairTicketId(''), isNull);
      expect(extrairTicketId(null), isNull);
      expect(extrairTicketId('12345'), isNull);
    });

    test('uuid quase certo (curto demais) → null', () {
      expect(extrairTicketId('8f14e45f-ceea-467a-9575-1a1b2c3d4e'), isNull);
    });
  });
}
