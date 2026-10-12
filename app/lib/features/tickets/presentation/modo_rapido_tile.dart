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
class ModoRapidoTile extends ConsumerWidget {
  const ModoRapidoTile({super.key, required this.patio});

  final PatioModel patio;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final motivo = patio.motivoModoRapidoIndisponivel;
    final ligado = ref.watch(modoRapidoLigadoProvider).value ?? false;
    return _ChavePreferencia(
      icone: Icons.bolt,
      titulo: 'Modo rápido de entrada',
      legenda: motivo ?? 'câmera aberta, cada placa entra sozinha',
      valor: ligado && motivo == null,
      travada: motivo != null,
      erro: 'Não consegui salvar o modo rápido.',
      salvar: (container, ligar) async {
        await container.read(tokenStorageProvider).saveModoRapido(ligar);
        // A Home lê este provider para decidir qual entrada o botão abre.
        container.invalidate(modoRapidoLigadoProvider);
      },
    );
  }
}

/// Imprimir ou não o cupom de entrada no modo rápido — escolha de CADA
/// aparelho, porque a impressora é do aparelho (antes era do pátio, no
/// painel). Só vale com o modo rápido ligado e disponível; fora disso fica
/// travada, mostrando a escolha guardada.
class ImprimeRapidoTile extends ConsumerWidget {
  const ImprimeRapidoTile({super.key, required this.patio});

  final PatioModel patio;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rapidoValendo =
        (ref.watch(modoRapidoLigadoProvider).value ?? false) &&
        patio.motivoModoRapidoIndisponivel == null;
    final imprime = ref.watch(modoRapidoImprimeProvider).value ?? true;
    return _ChavePreferencia(
      icone: Icons.receipt_long_outlined,
      titulo: 'Imprimir cupom no modo rápido',
      legenda: rapidoValendo
          ? 'na impressora deste celular'
          : 'vale com o modo rápido ligado',
      valor: imprime,
      travada: !rapidoValendo,
      erro: 'Não consegui salvar a impressão do cupom.',
      salvar: (container, ligar) async {
        await container.read(tokenStorageProvider).saveModoRapidoImprime(ligar);
        // A câmera do modo rápido lê este provider a cada cupom.
        container.invalidate(modoRapidoImprimeProvider);
      },
    );
  }
}

/// Linha de chave do Menu (mesmo desenho do `SincronizacaoTile`) que grava
/// uma preferência do aparelho: ignora toques enquanto grava, avisa se o
/// aparelho recusar e, travada, não aceita toque nenhum.
class _ChavePreferencia extends StatefulWidget {
  const _ChavePreferencia({
    required this.icone,
    required this.titulo,
    required this.legenda,
    required this.valor,
    required this.travada,
    required this.erro,
    required this.salvar,
  });

  final IconData icone;
  final String titulo;
  final String legenda;
  final bool valor;
  final bool travada;
  final String erro;

  /// Grava e invalida o provider da preferência. Recebe o container, não o
  /// `ref`: se o pátio sincronizar no meio e o item sumir do Menu, a
  /// preferência gravada ainda precisa chegar a quem a lê.
  final Future<void> Function(ProviderContainer container, bool valor) salvar;

  @override
  State<_ChavePreferencia> createState() => _ChavePreferenciaState();
}

class _ChavePreferenciaState extends State<_ChavePreferencia> {
  /// Gravando a preferência: toques nesse meio-tempo são ignorados (o valor
  /// na tela ainda é o antigo, e o segundo toque repetiria o primeiro).
  bool _gravando = false;

  Future<void> _alternar(bool valor) async {
    if (_gravando) return;
    setState(() => _gravando = true);
    final container = ProviderScope.containerOf(context, listen: false);
    try {
      await widget.salvar(container, valor);
    } catch (_) {
      if (mounted) {
        AppToast.error(context, widget.erro);
      }
    } finally {
      if (mounted) setState(() => _gravando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final travada = widget.travada;
    return MergeSemantics(
      child: InkWell(
        onTap: travada ? null : () => _alternar(!widget.valor),
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
                child: Icon(widget.icone, size: 20, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.titulo,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.3,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                      ),
                    ),
                    Text(
                      widget.legenda,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11.5,
                        height: 1.3,
                        fontWeight: FontWeight.w500,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Switch(
                value: widget.valor,
                onChanged: travada ? null : _alternar,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
