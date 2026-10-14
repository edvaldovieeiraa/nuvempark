import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tarifa/domain/contrato/contrato_engine.dart';

/// Bateria golden única (`golden/tarifa-contrato.json`), lida também pela API
/// e pelo painel. Os valores vieram do simulador do CloudPark — ver
/// `golden/README.md`. Nunca ajuste um valor esperado para o teste passar.
void main() {
  // `flutter test` roda com o diretório do pacote (app/) como atual.
  final golden = jsonDecode(File('../golden/tarifa-contrato.json').readAsStringSync())
      as Map<String, dynamic>;
  final fuso = golden['fuso'] as String;
  final contratos = golden['contratos'] as Map<String, dynamic>;
  final casos = (golden['casos'] as List).cast<Map<String, dynamic>>();

  group('contrato — golden do CloudPark', () {
    test('lê os 45 casos e os 8 contratos', () {
      expect(casos, hasLength(45));
      expect(contratos, hasLength(8));
    });

    for (final MapEntry(key: nome, value: json) in contratos.entries) {
      test('$nome é válido', () {
        expect(validar(lerContrato(json)), isEmpty);
      });
    }

    for (final caso in casos) {
      test('${caso['id']} ${caso['contrato']} — ${caso['objetivo']}', () {
        final r = calcular(
          entrada: DateTime.parse(caso['entrada'] as String),
          saida: DateTime.parse(caso['saida'] as String),
          contrato: lerContrato(contratos[caso['contrato']]),
          fuso: fuso,
        );
        final fatias = [
          for (final f in r.fatias)
            switch (f) {
              FatiaDiarias() => {'diarias': f.quantidade, 'valor_centavos': f.valorCentavos},
              FatiaRegra() => {'regra': f.regra, 'valor_centavos': f.valorCentavos},
            },
        ];
        expect(
          {'total': r.totalCentavos, 'restantes': r.minutosRestantes, 'fatias': fatias},
          {
            'total': caso['total_centavos'],
            'restantes': caso['minutos_restantes'],
            'fatias': caso['fatias'],
          },
          reason: caso['memoria_cloudpark'] as String,
        );
      });
    }
  });
}
