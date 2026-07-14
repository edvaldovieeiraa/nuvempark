import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:uuid/uuid.dart';

/// Perfil de captura: o downscale + a compressão JPEG são feitos pelo
/// image_picker na camada nativa, no momento do clique. O arquivo que fica no
/// device JÁ é o otimizado — o upload só lê o que está aqui.
enum PerfilFoto {
  /// Placa/veículo. O ML Kit lê ESTE arquivo depois de salvo (não o frame da
  /// câmera): `capturar()` → `lerPlaca(File(path))`. Os números estão
  /// congelados de propósito — baixar a qualidade aqui é degradar o OCR, que
  /// hoje funciona. Só `maxWidth` (sem `maxHeight`) para preservar o
  /// comportamento histórico em foto retrato.
  entrada(maxWidth: 1600, maxHeight: null, qualidade: 85),

  /// Dano no veículo. Nunca passa por OCR — o consumidor é o olho do gestor,
  /// dando zoom numa perícia. Vale mais nitidez, mesmo custando alguns KB:
  /// `maxWidth` E `maxHeight` limitam o LADO MAIOR a 1920 em qualquer
  /// orientação.
  avaria(maxWidth: 1920, maxHeight: 1920, qualidade: 80);

  const PerfilFoto({
    required this.maxWidth,
    required this.maxHeight,
    required this.qualidade,
  });

  final double maxWidth;
  final double? maxHeight;
  final int qualidade;
}

/// Captura e persistência das fotos do veículo.
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
  ///
  /// [perfil] escolhe resolução/qualidade. Ver [PerfilFoto].
  Future<String?> capturar({
    bool persistir = true,
    PerfilFoto perfil = PerfilFoto.entrada,
  }) async {
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      throw const FotoPermissaoNegadaException();
    }

    final shot = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: perfil.maxWidth,
      maxHeight: perfil.maxHeight,
      imageQuality: perfil.qualidade,
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
