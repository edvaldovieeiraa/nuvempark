import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tickets/domain/leitura_rapida.dart';

void main() {
  late List<String> ignoradas;
  late LeituraRapida l;

  setUp(() {
    ignoradas = [];
    l = LeituraRapida(ignorar: ignoradas.add);
  });

  test('ciclo completo: trava, conta, registra e volta a ler', () {
    expect(l.travou('ABC1D23'), isTrue);
    expect((l.fase, l.placa), (FaseRapida.contagem, 'ABC1D23'));

    expect(l.contagemTerminou(), isTrue);
    expect(l.fase, FaseRapida.registrando);

    l.registrou(aviso: 'Plano vencido — cobrar avulso');
    expect(l.fase, FaseRapida.lendo);
    expect(l.placa, isNull);
    expect(l.registradas, 1);
    expect(l.ultima?.placa, 'ABC1D23');
    expect(l.ultima?.aviso, 'Plano vencido — cobrar avulso');
    expect(ignoradas, ['ABC1D23'], reason: 'o carro segue na frente da câmera');
  });

  test('Corrigir na contagem volta a ler, conta a correção e não registra', () {
    l.travou('ABC1D28');
    l.corrigir();
    expect(l.fase, FaseRapida.lendo);
    expect(l.corrigidas, 1);
    expect(l.contagemTerminou(), isFalse,
        reason: 'o timer da contagem cancelada não pode registrar');
    expect(l.registradas, 0);
    expect(ignoradas, isEmpty, reason: 'a placa certa pode ser a mesma');
  });

  test('falha ao gravar volta a ler sem ignorar a placa', () {
    l.travou('ABC1D23');
    l.contagemTerminou();
    l.falhou();
    expect(l.fase, FaseRapida.lendo);
    expect(l.registradas, 0);
    expect(ignoradas, isEmpty, reason: 'precisa poder tentar de novo');
  });

  test('segundo plano durante a contagem cancela sem registrar', () {
    l.travou('ABC1D23');
    l.segundoPlano();
    expect(l.fase, FaseRapida.lendo);
    expect(l.contagemTerminou(), isFalse);
    expect(l.registradas, 0);
  });

  test('segundo plano gravando não interrompe a gravação', () {
    l.travou('ABC1D23');
    l.contagemTerminou();
    l.segundoPlano();
    expect(l.fase, FaseRapida.registrando);
    l.registrou();
    expect(l.registradas, 1);
  });

  test('pausa já na contagem, quando a análise volta antes dos 2 s', () {
    l.travou('ABC1D23');
    l.pausou(MotivoPausa.jaNoPatio);
    expect((l.fase, l.motivo, l.placa),
        (FaseRapida.pausado, MotivoPausa.jaNoPatio, 'ABC1D23'));
    expect(l.contagemTerminou(), isFalse);
  });

  test('pausa durante a gravação (hóspede vencido) e saída da pausa', () {
    l.travou('RTO4F21');
    l.contagemTerminou();
    l.pausou(MotivoPausa.hospedeVencido);
    expect(l.fase, FaseRapida.pausado);

    l.sairDaPausa();
    expect(l.fase, FaseRapida.lendo);
    expect(l.motivo, isNull);
    expect(ignoradas, ['RTO4F21'],
        reason: 'resolvida a pausa, o carro na frente não pausa de novo');
    expect(l.registradas, 0);
  });

  test('pausa resolvida com entrada (estadia renovada) conta como registrada',
      () {
    l.travou('RTO4F21');
    l.pausou(MotivoPausa.hospedeVencido);
    l.sairDaPausa(registrou: true);
    expect(l.fase, FaseRapida.lendo);
    expect(l.registradas, 1);
    expect(l.ultima?.placa, 'RTO4F21');
    expect(ignoradas, ['RTO4F21']);
  });

  test('nova trava só é aceita lendo', () {
    l.travou('ABC1D23');
    expect(l.travou('XYZ9K88'), isFalse);
    expect(l.placa, 'ABC1D23');
  });

  test('o contador só sobe com entrada registrada', () {
    for (final p in ['AAA1A11', 'BBB2B22', 'CCC3C33']) {
      l.travou(p);
      l.contagemTerminou();
      l.registrou();
    }
    l.travou('DDD4D44');
    l.corrigir();
    expect((l.registradas, l.corrigidas), (3, 1));
  });
}
