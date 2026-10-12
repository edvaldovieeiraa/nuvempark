import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../domain/leitura_rapida.dart';

/// Peças da tela do modo rápido. Ficam por cima do preview da câmera, então
/// usam fundo escuro translúcido e texto branco — o mesmo idioma visual da
/// leitura ao vivo da `CameraPlacaScreen`.

const _fundo = Color(0xCC000000);

/// Placa travada + contagem até entrar sozinha. "Corrigir" é a única ação.
class PainelContagemRapida extends StatelessWidget {
  const PainelContagemRapida({
    super.key,
    required this.placa,
    required this.duracao,
    required this.onCorrigir,
  });

  final String placa;
  final Duration duracao;
  final VoidCallback onCorrigir;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
      decoration: BoxDecoration(
        color: _fundo,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.primaryFill,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white, width: 2),
            ),
            child: Text(
              placa,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 34,
                fontWeight: FontWeight.w800,
                letterSpacing: 3,
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Chave pela placa: uma placa nova recomeça a barra do zero.
          TweenAnimationBuilder<double>(
            key: ValueKey(placa),
            tween: Tween(begin: 1, end: 0),
            duration: duracao,
            builder: (_, resta, _) => ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: resta,
                minHeight: 6,
                backgroundColor: Colors.white24,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Entrando… toque em Corrigir se a placa estiver errada',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: OutlinedButton.icon(
              onPressed: onCorrigir,
              icon: const Icon(Icons.refresh, size: 22),
              label: const Text('Corrigir',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: Colors.white70, width: 1.5),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Contagem acabou; a entrada está sendo gravada (foto e checagem quase
/// sempre já prontas — isto dura milissegundos).
class PainelRegistrandoRapida extends StatelessWidget {
  const PainelRegistrandoRapida({super.key, required this.placa});

  final String placa;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: _fundo,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Text('Registrando $placa…',
              style: const TextStyle(
                  color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

/// Última entrada registrada. Verde; âmbar quando o mensalista entrou como
/// avulso (ou sem foto) — o motivo aparece embaixo, para o operador avisar o
/// cliente.
class FaixaUltimaEntrada extends StatelessWidget {
  const FaixaUltimaEntrada({super.key, required this.placa, this.aviso});

  final String placa;
  final String? aviso;

  @override
  Widget build(BuildContext context) {
    final alerta = aviso != null;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: alerta ? AppColors.warningBg : AppColors.entradaBg,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(alerta ? Icons.info_outline : Icons.check_circle,
              color: alerta ? AppColors.warning : AppColors.entrada, size: 22),
          const SizedBox(width: 10),
          Flexible(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$placa registrada',
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface)),
                if (alerta)
                  Text(aviso!,
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.warning)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Entradas da sessão (e quantas leituras foram corrigidas, quando houver).
class ContadorRapido extends StatelessWidget {
  const ContadorRapido({
    super.key,
    required this.registradas,
    required this.corrigidas,
  });

  final int registradas;
  final int corrigidas;

  @override
  Widget build(BuildContext context) {
    final entradas = '$registradas ${registradas == 1 ? 'entrada' : 'entradas'}';
    final texto = corrigidas == 0
        ? entradas
        : '$entradas · $corrigidas ${corrigidas == 1 ? 'corrigida' : 'corrigidas'}';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _fundo,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(texto,
          style: const TextStyle(
              color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
    );
  }
}

enum AcaoPausa { irParaSaida, renovar, pular }

/// Placa que pede decisão. Fechar a folha sem escolher conta como "Pular".
Future<AcaoPausa> mostrarPausaRapida(
  BuildContext context, {
  required String placa,
  required MotivoPausa motivo,
}) async {
  final escolha = await showModalBottomSheet<AcaoPausa>(
    context: context,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => FolhaPausaRapida(placa: placa, motivo: motivo),
  );
  return escolha ?? AcaoPausa.pular;
}

class FolhaPausaRapida extends StatelessWidget {
  const FolhaPausaRapida({super.key, required this.placa, required this.motivo});

  final String placa;
  final MotivoPausa motivo;

  @override
  Widget build(BuildContext context) {
    final (titulo, texto, rotulo, acao, icone) = switch (motivo) {
      MotivoPausa.jaNoPatio => (
          '$placa já está no pátio',
          'Esta placa tem uma entrada aberta. Registre a saída antes de uma '
              'nova entrada.',
          'Ir para a saída',
          AcaoPausa.irParaSaida,
          Icons.logout,
        ),
      MotivoPausa.hospedeVencido => (
          'Estadia de $placa venceu',
          'Renove a estadia para registrar a entrada do hóspede.',
          'Renovar estadia',
          AcaoPausa.renovar,
          Icons.event_repeat,
        ),
    };
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(titulo,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(texto,
              style: const TextStyle(
                  fontSize: 14, color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 18),
          SizedBox(
            height: 52,
            child: FilledButton.icon(
              onPressed: () => Navigator.pop(context, acao),
              icon: Icon(icone),
              label: Text(rotulo,
                  style:
                      const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 52,
            child: OutlinedButton(
              onPressed: () => Navigator.pop(context, AcaoPausa.pular),
              child: const Text('Pular',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }
}
