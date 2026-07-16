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

  /// Só o sync PEDIDO pelo operador acende o spinner do cabeçalho. O refresh
  /// automático (timer de 2min / volta do background) roda calado — um ícone
  /// girando sozinho a cada 2 minutos vira ruído, não informação.
  bool _sincronizando = false;

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
    unawaited(_puxarDoServidor());
  }

  /// Baixa a config do pátio e revalida tickets/caixa. Best-effort: um erro de
  /// rede não pode derrubar a tela nem o spinner.
  Future<void> _puxarDoServidor() async {
    try {
      await ref.read(patioNotifierProvider.notifier).bootstrap();
    } catch (_) {
      // offline: o cache do Drift segue servindo.
    }
    if (!mounted) return;
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

    // O Brisa não tem AppBar: o cabeçalho é conteúdo, rola junto com a lista.
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _sincronizar,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              _header(operadorNome, patio?.nome, printer),
              const SizedBox(height: 16),

              if (assinatura != 'ativa') _bannerAssinatura(assinatura),

              // Ocupação em destaque (toca → aba Pátio)
              _cardOcupacao(abertos.length, patio?.qtdVagas ?? 0),
              const SizedBox(height: 12),
              _cardCaixa(caixa),
              const SizedBox(height: 16),

              // Ações principais
              Row(
                children: [
                  Expanded(
                    child: _acao(
                      titulo: 'Entrada',
                      sub: 'fotografe a placa',
                      icone: Icons.add,
                      destaque: true,
                      onTap: () => context.push(Routes.entrada),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _acao(
                      titulo: 'Saída',
                      sub: 'QR, foto ou placa',
                      icone: Icons.qr_code_scanner,
                      onTap: () => _abrirSaida(abertos.isEmpty),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// O mesmo que o "puxar para atualizar" faz — o Brisa põe isso também num
  /// botão no cabeçalho, porque num tablet fixo ninguém pensa em puxar a lista.
  Future<void> _sincronizar() async {
    if (_sincronizando) return;
    setState(() => _sincronizando = true);
    try {
      await _puxarDoServidor();
    } finally {
      if (mounted) setState(() => _sincronizando = false);
    }
  }

  /// Cabeçalho Brisa: avatar + saudação, e as duas ações de aparelho à direita.
  Widget _header(String operadorNome, String? patioNome, PrinterState? printer) {
    final agora = DateTime.now().hour;
    final saudacao = agora < 12
        ? 'Bom dia'
        : agora < 18
            ? 'Boa tarde'
            : 'Boa noite';
    final primeiro = operadorNome.trim().split(' ').first;

    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: const BoxDecoration(
            color: AppColors.primaryFill,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            _iniciais(operadorNome),
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                primeiro.isEmpty ? saudacao : '$saudacao, $primeiro',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 19,
                  height: 1.2,
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
              Text(
                patioNome ?? 'NuvemPark',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  height: 1.3,
                  fontWeight: FontWeight.w500,
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        _botaoAparelho(
          onTap: _sincronizando ? null : _sincronizar,
          tooltip: 'Sincronizar agora',
          child: _sincronizando
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: AppColors.primaryFill,
                    backgroundColor: AppColors.surfaceContainerHigh,
                  ),
                )
              : const Icon(Icons.sync, size: 20, color: AppColors.primaryFill),
        ),
        const SizedBox(width: 8),
        _iconeImpressora(printer),
      ],
    );
  }

  /// Botão-chip 40×40 do cabeçalho: card branco, raio 14, sombra do Brisa.
  Widget _botaoAparelho({
    required Widget child,
    required VoidCallback? onTap,
    required String tooltip,
    Widget? badge,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            boxShadow: const [
              BoxShadow(
                color: AppColors.shadow,
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [child, ?badge],
          ),
        ),
      ),
    );
  }

  /// Iniciais do avatar. Ignora pedaços só-numéricos: operador aqui costuma se
  /// chamar "Operador 01", e o ingênuo primeira+última letra daria "O0" — um
  /// "O" e um zero, que no avatar viram rabisco.
  static String _iniciais(String nome) {
    final partes = nome
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty && !RegExp(r'^\d+$').hasMatch(p))
        .toList();
    if (partes.isEmpty) return '?';
    if (partes.length == 1) {
      return partes.first.characters.take(2).toString().toUpperCase();
    }
    return (partes.first.characters.first + partes.last.characters.first)
        .toUpperCase();
  }

  // ---------- widgets ----------

  /// Chip da impressora com badge de status:
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
    return _botaoAparelho(
      tooltip: tip,
      onTap: () => context.push(Routes.impressora),
      child: const Icon(Icons.print_outlined,
          size: 20, color: AppColors.primaryFill),
      badge: Positioned(
        right: 6,
        top: 6,
        child: Container(
          width: 11,
          height: 11,
          decoration: BoxDecoration(
            color: cor,
            shape: BoxShape.circle,
            // Borda na cor do FUNDO da tela (não do card): é o recorte do
            // Brisa, que faz o badge "furar" a superfície.
            border: Border.all(color: AppColors.background, width: 2),
          ),
        ),
      ),
    );
  }

  /// Ocupação do Brisa: card branco com uma ROSCA à esquerda.
  ///
  /// A rosca é um `CircularProgressIndicator` de traço 12 num quadrado de 96 —
  /// que é exatamente a geometria do `conic-gradient` 96/72 do protótipo (96
  /// externo, miolo de 72 ⇒ anel de 12). Sem CustomPainter para isso.
  Widget _cardOcupacao(int ocupadas, int vagas) {
    final pct = vagas > 0 ? (ocupadas / vagas).clamp(0.0, 1.0) : 0.0;
    final pctLabel = (pct * 100).round();
    final livres = (vagas - ocupadas).clamp(0, vagas);
    final cheio = pct >= 0.9;

    return _cardBrisa(
      onTap: widget.onVerPatio,
      padding: const EdgeInsets.all(18),
      radius: 24,
      child: Row(
        children: [
          SizedBox(
            width: 96,
            height: 96,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox.expand(
                  child: CircularProgressIndicator(
                    value: vagas > 0 ? pct : 0,
                    strokeWidth: 12,
                    strokeCap: StrokeCap.butt,
                    backgroundColor: AppColors.surfaceContainerHigh,
                    valueColor: AlwaysStoppedAnimation(
                        cheio ? AppColors.saida : AppColors.primaryFill),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('$ocupadas',
                        style: const TextStyle(
                            fontSize: 24,
                            height: 1,
                            fontWeight: FontWeight.w800,
                            color: AppColors.onSurface)),
                    if (vagas > 0)
                      Text('de $vagas',
                          style: const TextStyle(
                              fontSize: 10,
                              height: 1.4,
                              fontWeight: FontWeight.w600,
                              color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  vagas > 0 ? 'Pátio a $pctLabel%' : 'Pátio',
                  style: const TextStyle(
                      fontSize: 15,
                      height: 1.3,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface),
                ),
                const SizedBox(height: 2),
                Text(
                  vagas > 0
                      ? '$livres ${livres == 1 ? 'vaga livre agora' : 'vagas livres agora'}'
                      : '$ocupadas no pátio agora',
                  style: const TextStyle(
                      fontSize: 12,
                      height: 1.4,
                      fontWeight: FontWeight.w500,
                      color: AppColors.onSurfaceVariant),
                ),
                const SizedBox(height: 8),
                _pilula(
                  texto: 'ver pátio',
                  bg: AppColors.primaryContainer,
                  fg: AppColors.primary,
                  icone: Icons.arrow_forward,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Card branco do Brisa: raio grande + a sombra suave `rgba(18,59,42,.06)`.
  Widget _cardBrisa({
    required Widget child,
    VoidCallback? onTap,
    EdgeInsets padding = const EdgeInsets.all(18),
    double radius = 24,
  }) {
    final corpo = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(radius),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 16,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
    if (onTap == null) return corpo;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(radius),
      child: corpo,
    );
  }

  /// Pílula de status do Brisa (os tripletes bg/fg da paleta).
  Widget _pilula({
    required String texto,
    required Color bg,
    required Color fg,
    IconData? icone,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(texto,
              style: TextStyle(
                  fontSize: 12,
                  height: 1,
                  fontWeight: FontWeight.w700,
                  color: fg)),
          if (icone != null) ...[
            const SizedBox(width: 5),
            Icon(icone, size: 14, color: fg),
          ],
        ],
      ),
    );
  }

  /// Caixa no Brisa: linha compacta — chip de ícone, rótulo + saldo, pílula de
  /// estado. Deixou de competir com a ocupação: o número grande agora é só o
  /// da rosca, e o caixa vira um atalho de status.
  ///
  /// Zero lógica nova: o saldo continua vindo de `caixa.saldoCalculado` e
  /// "abrir" continua levando à tela de Caixa que já existe.
  Widget _cardCaixa(CaixaModel? caixa) {
    final aberto = caixa != null;
    final abrirCaixa = widget.onVerCaixa ?? () => context.push(Routes.caixa);

    return _cardBrisa(
      onTap: abrirCaixa,
      radius: 24,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.primaryContainer,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.account_balance_wallet,
                size: 21, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  aberto
                      ? 'Caixa · aberto às ${_hora.format(caixa.abertura)}'
                      : 'Caixa',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 12,
                      height: 1.2,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurfaceVariant),
                ),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    aberto ? _moeda.format(caixa.saldoCalculado) : 'Fechado',
                    style: const TextStyle(
                        fontSize: 19,
                        height: 1.25,
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _pilula(
            texto: aberto ? 'aberto' : 'abrir',
            bg: aberto ? AppColors.primaryContainer : AppColors.dangerBg,
            fg: aberto ? AppColors.primary : AppColors.danger,
          ),
        ],
      ),
    );
  }

  /// Cards de ação do Brisa (116px): chip de ícone em cima, título + legenda
  /// embaixo. Entrada é o CTA preenchido; Saída é contorno laranja — a
  /// hierarquia é intencional, entrada é a ação repetida do dia.
  Widget _acao({
    required String titulo,
    required String sub,
    required IconData icone,
    required VoidCallback onTap,
    bool destaque = false,
  }) {
    final fg = destaque ? Colors.white : AppColors.saida;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        height: 116,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: destaque ? AppColors.primaryFill : AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          border: destaque
              ? null
              : Border.all(color: const Color(0xFFFCE1D2), width: 2),
          boxShadow: [
            BoxShadow(
              color: destaque
                  ? AppColors.primaryFill.withValues(alpha: 0.3)
                  : AppColors.saida.withValues(alpha: 0.1),
              blurRadius: destaque ? 20 : 16,
              offset: Offset(0, destaque ? 8 : 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: destaque
                    ? Colors.white.withValues(alpha: 0.2)
                    : AppColors.saidaBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icone, size: 20, color: fg),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(titulo,
                    style: TextStyle(
                        fontSize: 17,
                        height: 1.2,
                        fontWeight: FontWeight.w800,
                        color: fg)),
                Text(
                  sub,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    height: 1.3,
                    fontWeight: FontWeight.w500,
                    color: destaque
                        ? Colors.white.withValues(alpha: 0.75)
                        : const Color(0xFFB98A6E),
                  ),
                ),
              ],
            ),
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
