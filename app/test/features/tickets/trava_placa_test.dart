import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tickets/domain/trava_placa.dart';

void main() {
  late DateTime agora;
  late TravaPlaca trava;

  setUp(() {
    agora = DateTime(2026, 10, 12, 9);
    trava = TravaPlaca(agora: () => agora);
  });

  List<EstadoLeitura> ler(List<String> placas) => [for (final p in placas) trava.ler(p)];

  test('trava na 3ª leitura igual', () {
    expect(ler(['ABC1D23', 'ABC1D23', 'ABC1D23']),
        [EstadoLeitura.lendo, EstadoLeitura.lendo, EstadoLeitura.travou]);
  });

  test('3 iguais entre as últimas 5 também travam (OCR oscila entre quadros)',
      () {
    expect(ler(['ABC1D23', 'ABC1D28', 'ABC1D23', 'ABC1D28', 'ABC1D23']).last,
        EstadoLeitura.travou);
  });

  test('iguais espalhadas além da janela de 5 não travam', () {
    expect(ler(['A', 'B', 'C', 'D', 'A', 'E', 'F', 'A']).last,
        EstadoLeitura.lendo);
  });

  test('depois de travar, a próxima trava pede 3 leituras novas', () {
    ler(['ABC1D23', 'ABC1D23', 'ABC1D23']);
    expect(trava.ler('ABC1D23'), EstadoLeitura.lendo);
  });

  test('limpar descarta o histórico (Corrigir, segundo plano)', () {
    ler(['ABC1D23', 'ABC1D23']);
    trava.limpar();
    expect(trava.ler('ABC1D23'), EstadoLeitura.lendo);
  });

  group('placa ignorada (o carro que acabou de entrar segue na frente)', () {
    test('não conta nem trava', () {
      trava.ignorar('ABC1D23');
      expect(ler(List.filled(5, 'ABC1D23')),
          List.filled(5, EstadoLeitura.ignorada));
    });

    test('outra placa travar libera a ignorada', () {
      trava.ignorar('ABC1D23');
      expect(ler(['XYZ9K88', 'XYZ9K88', 'XYZ9K88']).last, EstadoLeitura.travou);
      expect(ler(['ABC1D23', 'ABC1D23', 'ABC1D23']).last, EstadoLeitura.travou);
    });

    test('volta a valer depois de 2 minutos sem outra placa', () {
      trava.ignorar('ABC1D23');
      agora = agora.add(const Duration(minutes: 1, seconds: 59));
      expect(trava.ler('ABC1D23'), EstadoLeitura.ignorada);
      agora = agora.add(const Duration(seconds: 2));
      expect(ler(['ABC1D23', 'ABC1D23', 'ABC1D23']).last, EstadoLeitura.travou);
    });

    test('limpar não esquece a ignorada', () {
      trava.ignorar('ABC1D23');
      trava.limpar();
      expect(trava.ler('ABC1D23'), EstadoLeitura.ignorada);
    });
  });
}
