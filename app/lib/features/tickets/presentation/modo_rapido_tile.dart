import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../patio/domain/patio_model.dart';
import 'providers/ticket_provider.dart';

/// Chave do modo rápido de entrada no Menu → Configurações. É o ÚNICO lugar
/// que liga e desliga: as telas de entrada só obedecem (o botão "Entrada" da
/// Home segue `rotaDeEntrada`). Ligar aqui não abre a câmera — o operador
/// pode estar no meio de outra coisa.
///
/// Quem decide se o item aparece é o Menu (pátio liberado no painel). Liberado
/// mas sem tipo ou tabela padrão, a chave fica travada e desligada, com o
/// motivo no lugar da legenda.
class ModoRapidoTile extends ConsumerStatefulWidget {
  const ModoRapidoTile({super.key, required this.patio});

  final PatioModel patio;

  @override
  ConsumerState<ModoRapidoTile> createState() => _ModoRapidoTileState();
}

class _ModoRapidoTileState extends ConsumerState<ModoRapidoTile> {
  /// Gravando a preferência: toques nesse meio-tempo são ignorados (o valor
  /// na tela ainda é o antigo, e o segundo toque repetiria o primeiro).
  bool _gravando = false;

  Future<void> _alternar(bool ligar) async {
    if (_gravando) return;
    setState(() => _gravando = true);
    // Lido antes do await: se o pátio sincronizar no meio e o item sumir do
    // Menu, a preferência gravada ainda precisa chegar à Home.
    final container = ProviderScope.containerOf(context, listen: false);
    try {
      await container.read(tokenStorageProvider).saveModoRapido(ligar);
      // A Home lê este provider para decidir qual entrada o botão abre.
      container.invalidate(modoRapidoLigadoProvider);
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não consegui salvar o modo rápido.');
    } finally {
      if (mounted) setState(() => _gravando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final motivo = widget.patio.motivoModoRapidoIndisponivel;
    final ligado = ref.watch(modoRapidoLigadoProvider).value ?? false;
    final valor = ligado && motivo == null;
    final travada = motivo != null;

    return MergeSemantics(
      child: InkWell(
        onTap: travada ? null : () => _alternar(!valor),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.bolt, size: 20, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Modo rápido de entrada',
                        style: TextStyle(
                            fontSize: 14,
                            height: 1.3,
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSurface)),
                    Text(motivo ?? 'câmera aberta, cada placa entra sozinha',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 11.5,
                            height: 1.3,
                            fontWeight: FontWeight.w500,
                            color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Switch(
                value: valor,
                onChanged: travada ? null : _alternar,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
