import 'package:nuvempark_core/nuvempark_core.dart';

class PrinterStorage {
  PrinterStorage(this._secure);

  final SecureStorage _secure;

  static const _keyMac = 'nuvempark_printer_mac';
  static const _keyName = 'nuvempark_printer_name';
  static const _keyCols = 'nuvempark_printer_cols';
  static const _keyAvanco = 'nuvempark_printer_avanco';

  Future<String?> readMac() => _secure.read(_keyMac);
  Future<String?> readName() => _secure.read(_keyName);

  /// Largura do papel em colunas (32 = 58mm, 48 = 80mm). Null = nunca configurado.
  Future<int?> readCols() async {
    final raw = await _secure.read(_keyCols);
    return raw == null ? null : int.tryParse(raw);
  }

  /// Avanço (linhas) no fim do cupom. Null = nunca configurado.
  Future<int?> readAvanco() async {
    final raw = await _secure.read(_keyAvanco);
    return raw == null ? null : int.tryParse(raw);
  }

  Future<void> saveAvanco(int linhas) => _secure.write(_keyAvanco, '$linhas');

  Future<void> save({required String mac, required String name}) async {
    await _secure.write(_keyMac, mac);
    await _secure.write(_keyName, name);
  }

  Future<void> saveCols(int cols) => _secure.write(_keyCols, '$cols');

  Future<void> clear() async {
    await _secure.delete(_keyMac);
    await _secure.delete(_keyName);
    // A largura do papel é da impressora física — mantém ao desconectar.
  }
}
