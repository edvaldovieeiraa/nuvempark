import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:uuid/uuid.dart';

/// Captura e persistência da foto de entrada do veículo.
/// Usa a câmera do sistema (image_picker) com downscale + compressão. Funciona
/// offline; a foto é copiada para o diretório de documentos do app (persistente).
class FotoEntradaService {
  FotoEntradaService({ImagePicker? picker}) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  /// Abre a câmera e retorna o caminho da foto, ou `null` se cancelado.
  /// Lança [FotoPermissaoNegadaException] se a permissão for negada.
  ///
  /// [persistir] true (padrão) copia p/ o diretório do app (foto de entrada que
  /// precisa sincronizar). false devolve o arquivo temporário — usado na saída
  /// só para ler a placa (OCR), sem ocupar armazenamento permanente.
  Future<String?> capturar({bool persistir = true}) async {
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      throw const FotoPermissaoNegadaException();
    }

    final shot = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1600,
      imageQuality: 85,
      preferredCameraDevice: CameraDevice.rear,
    );
    if (shot == null) return null;
    if (!persistir) return shot.path;

    final dir = await getApplicationDocumentsDirectory();
    final fotosDir = Directory(p.join(dir.path, 'fotos_entrada'));
    if (!await fotosDir.exists()) {
      await fotosDir.create(recursive: true);
    }
    final dest = p.join(fotosDir.path, '${const Uuid().v4()}.jpg');
    await File(shot.path).copy(dest);
    return dest;
  }
}

/// Lançada quando o operador nega a permissão de câmera.
class FotoPermissaoNegadaException implements Exception {
  const FotoPermissaoNegadaException();
}
