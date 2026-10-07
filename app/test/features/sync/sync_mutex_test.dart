import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/sync/data/sync_mutex.dart';

void main() {
  test('uma falha não trava quem vem depois', () async {
    final mutex = SyncMutex();
    final primeira = mutex.exclusivo<void>(() async => throw StateError('x'));
    final segunda = mutex.exclusivo(() async => 42);

    await expectLater(primeira, throwsStateError);
    expect(await segunda, 42);
  });
}
