import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/assinatura/domain/assinatura_status.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';

import '../../support/fakes.dart';

void main() {
  group('AssinaturaStatus.fromJson', () {
    test('objeto completo é lido fielmente', () {
      final s = AssinaturaStatus.fromJson({
        'estado': 'suspensa',
        'libera': false,
        'bloqueia': true,
        'trial_dias_restantes': null,
      });
      expect(s.estado, 'suspensa');
      expect(s.libera, false);
      expect(s.bloqueia, true);
      expect(s.trialDiasRestantes, isNull);
    });

    test('trial vigente traz os dias restantes', () {
      final s = AssinaturaStatus.fromJson({
        'estado': 'trial',
        'libera': true,
        'bloqueia': false,
        'trial_dias_restantes': 7,
      });
      expect(s.estado, 'trial');
      expect(s.bloqueia, false);
      expect(s.trialDiasRestantes, 7);
    });

    test('campos ausentes (API antiga) caem em defaults seguros', () {
      final s = AssinaturaStatus.fromJson({'estado': 'ativa'});
      expect(s.estado, 'ativa');
      expect(s.libera, true); // não bloqueia à toa
      expect(s.bloqueia, false);
    });
  });

  group('AssinaturaStatus.comHeaders (interceptor)', () {
    test('ativa → suspensa flipa o bloqueio', () {
      final novo = AssinaturaStatus.ativa
          .comHeaders(estado: 'suspensa', bloqueia: true);
      expect(novo.estado, 'suspensa');
      expect(novo.bloqueia, true);
      expect(novo.libera, false);
    });

    test('preserva os dias de trial enquanto continua trial', () {
      const base = AssinaturaStatus(
        estado: 'trial',
        libera: true,
        bloqueia: false,
        trialDiasRestantes: 5,
      );
      final novo = base.comHeaders(estado: 'trial', bloqueia: false);
      expect(novo.trialDiasRestantes, 5);
    });

    test('ao sair do trial, zera os dias de trial', () {
      const base = AssinaturaStatus(
        estado: 'trial',
        libera: true,
        bloqueia: false,
        trialDiasRestantes: 5,
      );
      final novo = base.comHeaders(estado: 'atrasada', bloqueia: false);
      expect(novo.estado, 'atrasada');
      expect(novo.bloqueia, false); // atrasada = banner, não bloqueia
      expect(novo.trialDiasRestantes, isNull);
    });

    test('desbloqueio: suspensa → ativa volta bloqueia=false', () {
      const base = AssinaturaStatus(
        estado: 'suspensa',
        libera: false,
        bloqueia: true,
      );
      final novo = base.comHeaders(estado: 'ativa', bloqueia: false);
      expect(novo.bloqueia, false);
      expect(novo.libera, true);
    });
  });

  group('TokenStorage — snapshot do gate', () {
    test('round-trip: salva e lê estado + bloqueia', () async {
      final s = TokenStorage(MemSecureStorage());
      await s.saveAssinatura(estado: 'suspensa', bloqueia: true);
      final snap = await s.readAssinatura();
      expect(snap, isNotNull);
      expect(snap!.estado, 'suspensa');
      expect(snap.bloqueia, true);
      expect(snap.carimbo, isNotNull);
    });

    test('sem nada salvo → null (fail-open no splash)', () async {
      final s = TokenStorage(MemSecureStorage());
      expect(await s.readAssinatura(), isNull);
    });

    test('clearAll apaga o snapshot do gate', () async {
      final s = TokenStorage(MemSecureStorage());
      await s.saveAssinatura(estado: 'suspensa', bloqueia: true);
      await s.clearAll();
      expect(await s.readAssinatura(), isNull);
    });
  });
}
