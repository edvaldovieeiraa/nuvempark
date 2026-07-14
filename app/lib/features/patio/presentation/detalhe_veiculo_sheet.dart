import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../tickets/domain/ticket_model.dart';

/// Detalhe do veículo no pátio: placa, entrada, permanência e a foto tirada
/// no registro — sem rede. A foto vive no filesystem do aparelho
/// (`ticket.fotoEntradaPath`); a API mobile só tem upload (`POST /foto`), não
/// tem download. Então uma entrada feita em OUTRO aparelho tem o caminho no
/// banco mas não tem o arquivo aqui: é o estado "não disponível neste
/// dispositivo", não um erro.
Future<void> mostrarDetalheVeiculo(BuildContext context, TicketModel t) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _DetalheVeiculo(ticket: t),
  );
}

class _DetalheVeiculo extends StatelessWidget {
  const _DetalheVeiculo({required this.ticket});

  final TicketModel ticket;

  static final _dataHora = DateFormat("dd/MM 'às' HH:mm");

  @override
  Widget build(BuildContext context) {
    final temFoto = ticket.fotoEntradaPath != null;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(
                  ticket.tipoVeiculo == 'moto'
                      ? Icons.two_wheeler_outlined
                      : Icons.directions_car_outlined,
                  size: 26,
                  color: AppColors.onSurfaceVariant,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticket.placa,
                        style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 2),
                      ),
                      Text(
                        ticket.tipoVeiculo,
                        style: const TextStyle(
                            fontSize: 13, color: AppColors.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.entradaBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _permanencia(ticket.entrada),
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.entrada),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Entrou ${_dataHora.format(ticket.entrada)}',
              style: const TextStyle(
                  fontSize: 13, color: AppColors.onSurfaceVariant),
            ),

            // Ticket sem foto não rende área nenhuma — nada de placeholder
            // vazio ocupando espaço à toa.
            if (temFoto) ...[
              const SizedBox(height: 16),
              _FotoEntrada(path: ticket.fotoEntradaPath!, placa: ticket.placa),
            ],

            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () {
                Navigator.pop(context);
                context.push(Routes.saidaDetalhe(ticket.id));
              },
              icon: const Icon(Icons.logout, size: 20),
              label: const Text('Registrar saída'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.saida,
                minimumSize: const Size.fromHeight(52),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _permanencia(DateTime entrada) {
    final min = DateTime.now().difference(entrada).inMinutes;
    if (min < 60) return '${min}min';
    final h = min ~/ 60;
    if (h < 24) return '${h}h${(min % 60).toString().padLeft(2, '0')}';
    return '${h ~/ 24}d ${h % 24}h';
  }
}

/// Foto de entrada. Não checa `existsSync()` antes: o `errorBuilder` do
/// [Image.file] cobre num golpe só o arquivo ausente (entrada feita em outro
/// aparelho) e o corrompido — sem crash e sem IO síncrono no build.
class _FotoEntrada extends StatelessWidget {
  const _FotoEntrada({required this.path, required this.placa});

  final String path;
  final String placa;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Image.file(
        File(path),
        height: 200,
        width: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => _indisponivel(),
        frameBuilder: (context, child, frame, syncLoaded) {
          if (frame == null && !syncLoaded) {
            return Container(
              height: 200,
              color: AppColors.surfaceContainer,
              child: const Center(
                child: SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.5),
                ),
              ),
            );
          }
          // Só a imagem que carregou de fato abre em tela cheia.
          return InkWell(
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => _FotoAmpliada(path: path, placa: placa),
              ),
            ),
            child: child,
          );
        },
      ),
    );
  }

  Widget _indisponivel() => Container(
        height: 130,
        decoration: BoxDecoration(
          color: AppColors.surfaceContainer,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.image_not_supported_outlined,
                size: 28, color: AppColors.onSurfaceVariant),
            SizedBox(height: 8),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'Foto não disponível neste dispositivo',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 13, color: AppColors.onSurfaceVariant),
              ),
            ),
          ],
        ),
      );
}

/// Foto em tela cheia, com zoom por pinça.
class _FotoAmpliada extends StatelessWidget {
  const _FotoAmpliada({required this.path, required this.placa});

  final String path;
  final String placa;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(placa, style: const TextStyle(letterSpacing: 2)),
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 1,
          maxScale: 5,
          child: Image.file(
            File(path),
            fit: BoxFit.contain,
            errorBuilder: (_, _, _) => const Text(
              'Foto não disponível neste dispositivo',
              style: TextStyle(color: Colors.white70),
            ),
          ),
        ),
      ),
    );
  }
}
