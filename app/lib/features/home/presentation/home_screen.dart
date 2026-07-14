import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/presentation/providers/auth_provider.dart';
import '../../caixa/domain/caixa_model.dart';
import '../../caixa/presentation/providers/caixa_provider.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../../tickets/data/foto_entrada_service.dart';
import '../../tickets/data/placa_ocr_service.dart';
import '../../tickets/presentation/providers/ticket_provider.dart';
import '../../tickets/domain/ticket_qr.dart';
import '../../tickets/presentation/placa_formatter.dart';
import '../../tickets/presentation/qr_scanner_screen.dart';

/// Aba Início: ocupação, status do caixa e as duas grandes ações
/// (entrada/saída). A lista de veículos vive na aba Pátio.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key, this.onVerPatio, this.onVerCaixa});

  /// Callbacks do shell para trocar de aba (Pátio / Caixa).
  final VoidCallback? onVerPatio;
  final VoidCallback? onVerCaixa;

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with WidgetsBindingObserver {
  static final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
  static final _hora = DateFormat('HH:mm');

  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Sincroniza a config do pátio ao abrir.
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
    // Mudanças feitas no painel web chegam sozinhas — sem fechar o app.
    _refreshTimer = Timer.periodic(
      const Duration(minutes: 2),
      (_) => _refresh(),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refreshTimer?.cancel();
    super.dispose();
  }

  /// App voltou ao primeiro plano → atualiza tudo do servidor.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  void _refresh() {
    if (!mounted) return;
    ref.read(patioNotifierProvider.notifier).bootstrap();
    ref.invalidate(ticketsAbertosProvider);
    ref.invalidate(caixaSessaoNotifierProvider);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final assinatura = auth is AuthLoggedIn ? auth.assinaturaEstado : 'ativa';
    final operadorNome = auth is AuthLoggedIn ? auth.user.nome : '';
    final patio = ref.watch(patioNotifierProvider).value;
    final abertos = ref.watch(ticketsAbertosProvider).value ?? const [];
    final caixa = ref.watch(caixaSessaoNotifierProvider).value;
    final printer = ref.watch(printerNotifierProvider).value;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(patio?.nome ?? 'NuvemPark',
                style: const TextStyle(fontSize: 17)),
            if (operadorNome.isNotEmpty)
              Text(operadorNome,
                  style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: AppColors.onSurfaceVariant)),
          ],
        ),
        actions: [_iconeImpressora(printer)],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(patioNotifierProvider.notifier).bootstrap();
          ref.invalidate(ticketsAbertosProvider);
          ref.invalidate(caixaSessaoNotifierProvider);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            if (assinatura != 'ativa') _bannerAssinatura(assinatura),

            // Ocupação em destaque (toca → aba Pátio)
            InkWell(
              onTap: widget.onVerPatio,
              borderRadius: BorderRadius.circular(16),
              child: _cardOcupacao(abertos.length, patio?.qtdVagas ?? 0),
            ),
            const SizedBox(height: 10),
            _cardCaixa(caixa),
            const SizedBox(height: 16),

            // Ações principais
            Row(
              children: [
                Expanded(
                  child: _acao(
                    'ENTRADA',
                    Icons.add_circle_outline,
                    destaque: true,
                    onTap: () => context.push(Routes.entrada),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _acao(
                    'SAÍDA',
                    Icons.qr_code_scanner,
                    cor: AppColors.saida,
                    bg: AppColors.saidaBg,
                    onTap: () => _abrirSaida(abertos.isEmpty),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // ---------- widgets ----------

  /// Ícone da impressora no AppBar com badge de status:
  /// verde = conectada · vermelho = configurada mas caiu · cinza = nenhuma.
  Widget _iconeImpressora(PrinterState? printer) {
    final Color cor;
    final String tip;
    if (printer == null || printer.connectedMac == null) {
      cor = AppColors.outline;
      tip = 'Nenhuma impressora';
    } else if (printer.isConnected) {
      cor = AppColors.success;
      tip = 'Impressora conectada';
    } else {
      cor = AppColors.danger;
      tip = 'Impressora desconectada';
    }
    return IconButton(
      tooltip: tip,
      onPressed: () => context.push(Routes.impressora),
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          const Icon(Icons.print_outlined),
          Positioned(
            right: -1,
            bottom: -1,
            child: Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(
                color: cor,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.surface, width: 1.5),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _cardOcupacao(int ocupadas, int vagas) {
    final pct = vagas > 0 ? (ocupadas / vagas).clamp(0.0, 1.0) : 0.0;
    final cheio = pct >= 0.9;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: AppColors.gradient),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text('OCUPAÇÃO',
                  style: TextStyle(
                      fontSize: 11,
                      letterSpacing: 1,
                      fontWeight: FontWeight.w700,
                      color: Colors.white70)),
              const Spacer(),
              Text('$ocupadas',
                  style: const TextStyle(
                      fontSize: 32,
                      height: 1,
                      fontWeight: FontWeight.w800,
                      color: Colors.white)),
              if (vagas > 0)
                Padding(
                  padding: const EdgeInsets.only(bottom: 3),
                  child: Text(' / $vagas',
                      style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Colors.white70)),
                ),
            ],
          ),
          if (vagas > 0) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: pct,
                minHeight: 8,
                backgroundColor: Colors.white24,
                valueColor: AlwaysStoppedAnimation(
                    cheio ? const Color(0xFFFFD180) : Colors.white),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${vagas - ocupadas} ${vagas - ocupadas == 1 ? 'vaga livre' : 'vagas livres'} · toque para ver o pátio',
              style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.white70),
            ),
          ],
        ],
      ),
    );
  }

  /// Card de destaque do caixa — mesma geometria do card de ocupação (padding
  /// 18, raio 16) e o valor na mesma escala do número da ocupação (32px). Não
  /// repete o gradiente de propósito: dois gradientes lado a lado brigariam
  /// pela atenção; o peso vem do tamanho do número e do bloco de cor.
  ///
  /// Zero lógica nova: o saldo continua vindo de `caixa.saldoCalculado` e o
  /// "abrir caixa" continua sendo a tela de Caixa que já existe.
  Widget _cardCaixa(CaixaModel? caixa) {
    final aberto = caixa != null;
    final cor = aberto ? AppColors.entrada : AppColors.onSurfaceVariant;
    final abrirCaixa = widget.onVerCaixa ?? () => context.push(Routes.caixa);

    return InkWell(
      onTap: abrirCaixa,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: aberto ? AppColors.entradaBg : AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: aberto
                ? AppColors.entrada.withValues(alpha: 0.35)
                : AppColors.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('CAIXA',
                    style: TextStyle(
                        fontSize: 11,
                        letterSpacing: 1,
                        fontWeight: FontWeight.w700,
                        color: cor)),
                const SizedBox(width: 8),
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: aberto ? AppColors.success : AppColors.outline,
                    shape: BoxShape.circle,
                  ),
                ),
                const Spacer(),
                Icon(Icons.chevron_right, size: 20, color: cor),
              ],
            ),
            const SizedBox(height: 8),
            if (aberto) ...[
              // O valor é o elemento dominante. FittedBox: um saldo de seis
              // dígitos não pode estourar a largura num aparelho de 360dp.
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  _moeda.format(caixa.saldoCalculado),
                  style: const TextStyle(
                      fontSize: 32,
                      height: 1,
                      fontWeight: FontWeight.w800,
                      color: AppColors.entrada),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Saldo esperado · aberto por ${caixa.operadorNome} às ${_hora.format(caixa.abertura)}',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurfaceVariant),
              ),
            ] else ...[
              const FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text('Caixa fechado',
                    style: TextStyle(
                        fontSize: 32,
                        height: 1,
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface)),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: abrirCaixa,
                  icon: const Icon(Icons.lock_open, size: 18),
                  label: const Text('Abrir caixa'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _acao(
    String label,
    IconData icon, {
    bool destaque = false,
    Color? cor,
    Color? bg,
    required VoidCallback onTap,
  }) {
    if (destaque) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 96,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: AppColors.gradient),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.35),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 28),
              const SizedBox(height: 8),
              Text(label,
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                      letterSpacing: 0.5)),
            ],
          ),
        ),
      );
    }
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 96,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: cor!.withValues(alpha: 0.35), width: 1.5),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: cor, size: 28),
            const SizedBox(height: 8),
            Text(label,
                style: TextStyle(
                    color: cor,
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    letterSpacing: 0.5)),
          ],
        ),
      ),
    );
  }

  Widget _bannerAssinatura(String estado) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.saidaBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.saida.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: AppColors.saida),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                estado == 'atrasada'
                    ? 'Assinatura atrasada — regularize para manter o acesso completo.'
                    : 'Assinatura suspensa — modo restrito.',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      );

  // ---------- ações ----------

  Future<void> _abrirSaida(bool vazio) async {
    final messenger = ScaffoldMessenger.of(context);
    if (vazio) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Nenhum veículo no pátio para dar saída.')),
      );
      return;
    }
    // Menu: escolher como localizar o veículo (QR do cupom ou foto da placa).
    final metodo = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Text('Registrar saída',
                  style:
                      TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            ),
            ListTile(
              leading: const Icon(Icons.qr_code_scanner,
                  color: AppColors.primary),
              title: const Text('Ler QR do cupom'),
              subtitle: const Text('Escaneia o código do ticket de entrada'),
              onTap: () => Navigator.pop(ctx, 'qr'),
            ),
            ListTile(
              leading:
                  const Icon(Icons.photo_camera_outlined, color: AppColors.primary),
              title: const Text('Fotografar a placa'),
              subtitle: const Text('A câmera lê a placa e encontra o veículo'),
              onTap: () => Navigator.pop(ctx, 'foto'),
            ),
            ListTile(
              leading:
                  const Icon(Icons.keyboard_alt_outlined, color: AppColors.primary),
              title: const Text('Digitar a placa'),
              subtitle: const Text('Quando o cupom sumiu e a câmera não ajuda'),
              onTap: () => Navigator.pop(ctx, 'digitar'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (metodo == null || !mounted) return;

    switch (metodo) {
      case 'qr':
        await _saidaPorQr(messenger);
      case 'foto':
        await _saidaPorFoto(messenger);
      case 'digitar':
        await _saidaPorPlacaDigitada(messenger);
    }
  }

  /// Saída digitando a placa — a rede de segurança quando o cupom se perdeu e a
  /// câmera não colabora (placa suja, chuva, veículo encostado na parede).
  Future<void> _saidaPorPlacaDigitada(ScaffoldMessengerState messenger) async {
    final placa = await showDialog<String>(
      context: context,
      builder: (_) => const _DialogDigitarPlaca(),
    );
    if (placa == null || !mounted) return;

    final patioId = await ref.read(tokenStorageProvider).readPatioId();
    if (patioId == null || !mounted) return;
    final ticket = await ref
        .read(ticketRepositoryProvider)
        .ticketAbertoPorPlaca(patioId, placa);
    if (!mounted) return;
    if (ticket == null) {
      messenger.showSnackBar(
        SnackBar(content: Text('Nenhum veículo aberto com a placa $placa.')),
      );
      return;
    }
    context.push(Routes.saidaDetalhe(ticket.id));
  }

  Future<void> _saidaPorQr(ScaffoldMessengerState messenger) async {
    final lido = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const QrScannerScreen()),
    );
    if (lido == null || lido.isEmpty) return; // cancelou

    // O QR pode ser o id cru (cupons já impressos) ou a URL pública (cupons
    // novos). O mesmo papel serve ao cliente pagar e ao operador dar saída.
    final ticketId = extrairTicketId(lido);
    if (!mounted) return;
    if (ticketId == null) {
      messenger.showSnackBar(const SnackBar(
          content: Text('QR não reconhecido. Use a aba Pátio.')));
      return;
    }

    final ticket = await ref.read(ticketRepositoryProvider).getById(ticketId);
    if (!mounted) return;
    if (ticket == null) {
      messenger.showSnackBar(const SnackBar(
          content: Text('Ticket não encontrado. Use a aba Pátio.')));
      return;
    }
    context.push(Routes.saidaDetalhe(ticket.id));
  }

  /// Saída por foto: câmera → OCR da placa → acha o ticket aberto dessa placa.
  Future<void> _saidaPorFoto(ScaffoldMessengerState messenger) async {
    final fotoService = FotoEntradaService();
    final ocrService = PlacaOcrService();
    try {
      final path = await fotoService.capturar();
      if (path == null || !mounted) return;
      final placa = await ocrService.lerPlaca(File(path));
      if (!mounted) return;
      if (placa == null) {
        messenger.showSnackBar(const SnackBar(
            content:
                Text('Não consegui ler a placa. Tente o QR ou a aba Pátio.')));
        return;
      }
      final patioId = await ref.read(tokenStorageProvider).readPatioId();
      if (patioId == null || !mounted) return;
      final ticket = await ref
          .read(ticketRepositoryProvider)
          .ticketAbertoPorPlaca(patioId, placa);
      if (!mounted) return;
      if (ticket == null) {
        messenger.showSnackBar(SnackBar(
            content: Text('Nenhum veículo aberto com a placa $placa.')));
        return;
      }
      context.push(Routes.saidaDetalhe(ticket.id));
    } on FotoPermissaoNegadaException {
      if (mounted) {
        messenger.showSnackBar(const SnackBar(
            content: Text('Permissão de câmera negada.')));
      }
    } catch (_) {
      if (mounted) {
        messenger.showSnackBar(const SnackBar(
            content: Text('Erro ao ler a placa. Tente novamente.')));
      }
    } finally {
      ocrService.dispose();
    }
  }
}

/// Diálogo de digitação da placa. Devolve a placa normalizada (7 chars,
/// maiúsculas) ou `null` se o operador cancelar.
class _DialogDigitarPlaca extends StatefulWidget {
  const _DialogDigitarPlaca();

  @override
  State<_DialogDigitarPlaca> createState() => _DialogDigitarPlacaState();
}

class _DialogDigitarPlacaState extends State<_DialogDigitarPlaca> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  bool get _completa => _ctrl.text.length == PlacaFormatter.tamanho;

  void _confirmar() {
    if (!_completa) return;
    Navigator.pop(context, _ctrl.text.toUpperCase());
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Digitar a placa'),
      content: TextField(
        controller: _ctrl,
        autofocus: true,
        textCapitalization: TextCapitalization.characters,
        keyboardType: TextInputType.visiblePassword,
        textAlign: TextAlign.center,
        // Mesmo formatter da entrada: as duas telas aceitam exatamente as
        // mesmas placas (Mercosul e antiga).
        inputFormatters: const [PlacaFormatter()],
        style: const TextStyle(
            fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: 3),
        decoration: const InputDecoration(hintText: 'ABC1D23'),
        onChanged: (_) => setState(() {}),
        onSubmitted: (_) => _confirmar(),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _completa ? _confirmar : null,
          child: const Text('Buscar veículo'),
        ),
      ],
    );
  }
}
