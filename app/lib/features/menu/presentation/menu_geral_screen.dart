import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/brisa.dart';
import '../../auth/presentation/providers/auth_provider.dart';
import '../../caixa/presentation/providers/caixa_provider.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../../sync/presentation/sync_info_provider.dart';

/// Aba "Menu": porta única para o que não mora na barra inferior, em três
/// seções — Operação / Aparelho / Informações. Regra de ouro: cada conceito
/// tem UM lugar só (a antiga tela de Configurações foi dissolvida aqui: o
/// card de sync virou o item vivo, o bloco "Conexão" foi para o Sobre e o
/// Sair subiu para o fim do menu).
class MenuGeralScreen extends ConsumerStatefulWidget {
  const MenuGeralScreen({super.key});

  @override
  ConsumerState<MenuGeralScreen> createState() => _MenuGeralScreenState();
}

class _MenuGeralScreenState extends ConsumerState<MenuGeralScreen> {
  static final _hora = DateFormat('HH:mm');
  static final _diaHora = DateFormat('dd/MM HH:mm');

  bool _sincronizando = false;

  @override
  Widget build(BuildContext context) {
    // Brisa: sem AppBar — o perfil abre a tela no lugar do título "Menu".
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24 + alturaNavBrisa),
          children: [
            _cardPerfil(),

            _secao('Operação'),
            _grupo([
              _item(
                icone: Icons.badge_outlined,
                titulo: 'Mensalistas',
                subtitulo: 'clientes e mensalidades',
                onTap: () => context.push(Routes.mensalistas),
              ),
              _item(
                icone: Icons.receipt_long_outlined,
                titulo: 'Movimentos do pátio',
                subtitulo: 'histórico de entradas e saídas',
                onTap: () => context.push(Routes.movimentos),
              ),
            ]),

            _secao('Aparelho'),
            _grupo([
              _itemImpressora(),
              _itemSync(),
            ]),

            // Aqui os itens NÃO têm subtítulo — é assim no protótipo, e faz
            // sentido: "Sobre" e "Sair" se explicam sozinhos, e a legenda só
            // adicionaria ruído ao pé da tela.
            _secao('Informações'),
            _grupo([
              _item(
                icone: Icons.info_outline,
                titulo: 'Sobre o pátio e o app',
                neutro: true,
                onTap: () => context.push(Routes.sobre),
              ),
              _item(
                icone: Icons.logout,
                titulo: 'Sair do app',
                cor: AppColors.danger,
                semChevron: true,
                onTap: _confirmarLogout,
              ),
            ]),

            // Logo da marca no pé do menu, abaixo do "Sair do app".
            const SizedBox(height: 28),
            Center(
              child: Image.asset(
                'assets/images/nuvempark-logo-principal.png',
                width: 210,
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  /// Card de perfil do Brisa — abre a tela no lugar do título.
  ///
  /// A pílula de turno usa a ABERTURA DO CAIXA, não um campo de turno: o app
  /// não tem esse conceito, e o operador de pátio abre o caixa ao começar o
  /// expediente. Some quando não há caixa aberto — inventar um horário aqui
  /// seria pior que não mostrar nada.
  Widget _cardPerfil() {
    final auth = ref.watch(authControllerProvider);
    final nome = auth is AuthLoggedIn ? auth.user.nome : '';
    final patio = ref.watch(patioNotifierProvider).value;
    final caixa = ref.watch(caixaSessaoNotifierProvider).value;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
              color: AppColors.shadow, blurRadius: 10, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              color: AppColors.primaryFill,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              _iniciais(nome),
              style: const TextStyle(
                  fontSize: 16,
                  height: 1,
                  fontWeight: FontWeight.w800,
                  color: Colors.white),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  nome.isEmpty ? 'Operador' : nome,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 16,
                      height: 1.25,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface),
                ),
                Text(
                  'operador${patio?.nome != null ? ' · ${patio!.nome}' : ''}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 12,
                      height: 1.3,
                      fontWeight: FontWeight.w500,
                      color: AppColors.onSurfaceVariant),
                ),
              ],
            ),
          ),
          if (caixa != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.primaryContainer,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                'turno ${_hora.format(caixa.abertura)}',
                style: const TextStyle(
                    fontSize: 11,
                    height: 1,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Agrupa itens num ÚNICO card com divisórias — no Brisa a seção é o card,
  /// não cada linha. Antes era um card por item, o que picotava a tela.
  Widget _grupo(List<Widget> itens) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
              color: AppColors.shadow, blurRadius: 10, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          for (var i = 0; i < itens.length; i++) ...[
            itens[i],
            if (i < itens.length - 1)
              const Divider(
                  height: 1, thickness: 1, color: AppColors.surfaceContainer),
          ],
        ],
      ),
    );
  }

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

  /// Impressora como item VIVO: o subtítulo diz o estado real e a bolinha o
  /// repete em cor — no protótipo ela substitui o chevron. Antes o subtítulo
  /// era estático ("parear, testar…"), o que obrigava a entrar na tela só
  /// para descobrir se a impressora estava de pé.
  Widget _itemImpressora() {
    final printer = ref.watch(printerNotifierProvider).value;

    final Color cor;
    final String sub;
    if (printer == null || printer.connectedMac == null) {
      cor = AppColors.outline;
      sub = 'nenhuma configurada';
    } else if (printer.isConnected) {
      cor = AppColors.primaryFill;
      sub = 'conectada${printer.connectedName != null ? ' · ${printer.connectedName}' : ''}';
    } else {
      cor = AppColors.danger;
      sub = 'desconectada · toque para reconectar';
    }

    return _item(
      icone: Icons.print_outlined,
      titulo: 'Impressora Bluetooth',
      subtitulo: sub,
      onTap: () => context.push(Routes.impressora),
      trailing: Container(
        width: 9,
        height: 9,
        decoration: BoxDecoration(color: cor, shape: BoxShape.circle),
      ),
    );
  }

  // ── Sincronização: item VIVO (status + ação, sem fingir navegação) ──────

  /// Bolinha de status + última sincronização no subtítulo; o toque dispara a
  /// MESMA drenagem que o loop automático usa — só que na hora.
  Widget _itemSync() {
    final syncAsync = ref.watch(syncInfoProvider);
    final info = syncAsync.value;

    final Color cor;
    final String subtitulo;
    if (_sincronizando) {
      cor = AppColors.warning;
      subtitulo = 'Sincronizando…';
    } else if (info == null) {
      cor = AppColors.outline;
      subtitulo = 'Verificando…';
    } else if (info.falhos > 0) {
      cor = AppColors.danger;
      subtitulo =
          '${info.falhos} ${info.falhos == 1 ? 'item falhou' : 'itens falharam'} · toque para reenviar';
    } else if (info.pendentes > 0) {
      cor = AppColors.warning;
      subtitulo =
          '${info.pendentes} aguardando envio · ${_fmtUltimo(info.ultimoSync)}';
    } else {
      cor = AppColors.success;
      subtitulo = 'Tudo em dia · ${_fmtUltimo(info.ultimoSync)}';
    }

    return InkWell(
      onTap: _sincronizando ? null : _sincronizarAgora,
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
              child: const Icon(Icons.sync, size: 20, color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('Sincronização',
                          style: TextStyle(
                              fontSize: 14,
                              height: 1.3,
                              fontWeight: FontWeight.w700,
                              color: AppColors.onSurface)),
                      const SizedBox(width: 7),
                      Container(
                        width: 9,
                        height: 9,
                        decoration:
                            BoxDecoration(color: cor, shape: BoxShape.circle),
                      ),
                    ],
                  ),
                  Text(subtitulo,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 11.5,
                          height: 1.3,
                          fontWeight: FontWeight.w500,
                          // O estado "tudo em dia" fala em verde; os demais
                          // ficam neutros para o verde significar só uma coisa.
                          color: cor == AppColors.success
                              ? AppColors.primary
                              : AppColors.onSurfaceVariant)),
                ],
              ),
            ),
            if (_sincronizando)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: AppColors.primaryFill,
                  backgroundColor: AppColors.surfaceContainerHigh,
                ),
              )
            else
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text('sincronizar',
                    style: TextStyle(
                        fontSize: 11,
                        height: 1,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary)),
              ),
          ],
        ),
      ),
    );
  }

  String _fmtUltimo(DateTime? d) {
    if (d == null) return 'nenhuma ainda';
    final agora = DateTime.now();
    final hoje = d.year == agora.year &&
        d.month == agora.month &&
        d.day == agora.day;
    return hoje
        ? 'última às ${_hora.format(d)}'
        : 'última em ${_diaHora.format(d)}';
  }

  /// Dispara a MESMA drenagem que o loop de sync usa — só que na hora, a
  /// pedido do operador. O engine não muda: só é invocado.
  Future<void> _sincronizarAgora() async {
    if (_sincronizando) return;
    setState(() => _sincronizando = true);
    try {
      final r = await ref.read(syncEngineProvider).drain();
      ref.invalidate(syncInfoProvider);
      if (!mounted) return;
      if (r.failed > 0) {
        AppToast.error(context,
            '${r.synced} enviados, ${r.failed} falharam. Vou reintentar.');
      } else if (r.synced > 0) {
        AppToast.success(
            context,
            '${r.synced} ${r.synced == 1 ? 'item enviado' : 'itens enviados'} '
            'para a dashboard.');
      } else {
        AppToast.info(context, 'Nada pendente — tudo em dia.');
      }
    } catch (_) {
      if (mounted) {
        AppToast.error(context, 'Não consegui sincronizar agora.');
      }
    } finally {
      if (mounted) setState(() => _sincronizando = false);
    }
  }

  // ── Sair (subiu das Configurações; mesma confirmação) ───────────────────

  Future<void> _confirmarLogout() async {
    final sair = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sair do app?'),
        content: const Text(
            'Você vai precisar do código do pátio, usuário e senha para entrar de novo.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Sair')),
        ],
      ),
    );
    if (sair == true) {
      ref.read(authControllerProvider.notifier).logout();
    }
  }

  // ── Auxiliares de layout ────────────────────────────────────────────────

  Widget _secao(String t) => Padding(
        padding: const EdgeInsets.fromLTRB(6, 14, 6, 7),
        child: Text(t.toUpperCase(),
            style: const TextStyle(
                fontSize: 11,
                height: 1,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.88,
                color: AppColors.outline)),
      );

  /// Linha de menu do Brisa. Vive DENTRO de um [_grupo] — por isso não tem
  /// card, sombra nem margem própria: quem desenha a superfície é o grupo.
  Widget _item({
    required IconData icone,
    required String titulo,
    required VoidCallback onTap,
    String? subtitulo,
    Color? cor,
    bool semChevron = false,
    bool neutro = false,
    Widget? trailing,
  }) {
    final corIcone = cor ?? (neutro ? AppColors.onSurfaceVariant : AppColors.primary);
    final corFundo = cor != null
        ? cor.withValues(alpha: 0.1)
        : (neutro ? AppColors.surfaceContainer : AppColors.primaryContainer);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: corFundo,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icone, size: 20, color: corIcone),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(titulo,
                      style: TextStyle(
                          fontSize: 14,
                          height: 1.3,
                          fontWeight: FontWeight.w700,
                          color: cor ?? AppColors.onSurface)),
                  if (subtitulo != null)
                    Text(subtitulo,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 11.5,
                            height: 1.3,
                            fontWeight: FontWeight.w500,
                            color: AppColors.onSurfaceVariant)),
                ],
              ),
            ),
            if (trailing != null)
              trailing
            else if (!semChevron)
              const Icon(Icons.chevron_right, size: 20, color: AppColors.outline),
          ],
        ),
      ),
    );
  }
}
