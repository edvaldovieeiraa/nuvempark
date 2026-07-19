import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/brisa.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../printing/data/print_templates.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../domain/caixa_model.dart';
import '../domain/resumo_fechamento.dart';
import 'providers/caixa_provider.dart';

/// Caixa: abre sessão (fundo), mostra saldo e permite fechar (conferência).
class CaixaScreen extends ConsumerWidget {
  const CaixaScreen({super.key});

  static final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
  static final _hora = DateFormat('HH:mm');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessaoAsync = ref.watch(caixaSessaoNotifierProvider);

    final temCaixaAberto = sessaoAsync.value != null;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24 + alturaNavBrisa),
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text('Caixa',
                      style: TextStyle(
                          fontSize: 24,
                          height: 1.15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface)),
                ),
                if (temCaixaAberto)
                  _chipBotao(
                    icone: Icons.receipt_long_outlined,
                    tooltip: 'Movimentos do caixa',
                    onTap: () => context.push(Routes.caixaMovimentos),
                  ),
              ],
            ),
            sessaoAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.only(top: 60),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => const Padding(
                padding: EdgeInsets.only(top: 40),
                child: ErrorState(mensagem: 'Erro ao carregar o caixa.'),
              ),
              data: (sessao) => sessao == null
                  ? _semCaixa(context, ref)
                  : _comCaixa(context, ref, sessao),
            ),
          ],
        ),
      ),
    );
  }

  /// Chip 40×40 do cabeçalho (mesmo do Início).
  Widget _chipBotao({
    required IconData icone,
    required String tooltip,
    required VoidCallback onTap,
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
                  color: AppColors.shadow, blurRadius: 8, offset: Offset(0, 2)),
            ],
          ),
          child: Icon(icone, size: 20, color: AppColors.primaryFill),
        ),
      ),
    );
  }

  Widget _semCaixa(BuildContext context, WidgetRef ref) => Container(
        margin: const EdgeInsets.only(top: 14),
        padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(28),
          boxShadow: const [
            BoxShadow(
                color: AppColors.shadow, blurRadius: 10, offset: Offset(0, 2)),
          ],
        ),
        child: Column(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: AppColors.surfaceContainer,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.point_of_sale_outlined,
                  size: 30, color: AppColors.onSurfaceVariant),
            ),
            const SizedBox(height: 12),
            const Text('Nenhum caixa aberto',
                style: TextStyle(
                    fontSize: 17,
                    height: 1.3,
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface)),
            const SizedBox(height: 4),
            const Text('abra o caixa informando o fundo inicial',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 13,
                    height: 1.4,
                    fontWeight: FontWeight.w500,
                    color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => _dialogAbrir(context, ref),
                icon: const Icon(Icons.lock_open_outlined, size: 20),
                label: const Text('Abrir caixa'),
              ),
            ),
            const SizedBox(height: 12),
            // Os dois atalhos do fechamento anterior viram links de texto: são
            // exceção (conferir/reimprimir o turno passado), não a ação da tela.
            TextButton(
              onPressed: () => _verDetalheUltimo(context, ref),
              child: const Text('detalhamento do último fechamento',
                  style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary)),
            ),
            TextButton(
              onPressed: () => _reimprimirUltimoFechamento(context, ref),
              child: const Text('reimprimir último fechamento',
                  style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary)),
            ),
          ],
        ),
      );

  Widget _comCaixa(BuildContext context, WidgetRef ref, CaixaModel s) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Hero ESCURO: o saldo é o único número grande da tela. Primeiro uso
          // do surfaceInverse do Brisa — o contraste com os cards brancos é o
          // que faz o valor pesar sem precisar de gradiente.
          Container(
            margin: const EdgeInsets.only(top: 14),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surfaceInverse,
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: AppColors.surfaceInverse.withValues(alpha: 0.3),
                  blurRadius: 28,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text('Saldo esperado',
                          style: TextStyle(
                              fontSize: 12,
                              height: 1,
                              fontWeight: FontWeight.w600,
                              color: AppColors.secondaryFixed)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.primaryFill,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Text('aberto',
                          style: TextStyle(
                              fontSize: 11,
                              height: 1,
                              fontWeight: FontWeight.w700,
                              color: Colors.white)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(_moeda.format(s.saldoCalculado),
                      style: const TextStyle(
                          fontSize: 38,
                          height: 1,
                          fontWeight: FontWeight.w800,
                          color: Colors.white)),
                ),
                const SizedBox(height: 10),
                Text('aberto às ${_hora.format(s.abertura)} por ${s.operadorNome}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 12,
                        height: 1.3,
                        fontWeight: FontWeight.w500,
                        color: AppColors.secondaryFixed)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Composição do saldo. Sinal e cor dizem a direção do dinheiro antes
          // de o operador ler o rótulo.
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(24),
              boxShadow: const [
                BoxShadow(
                    color: AppColors.shadow,
                    blurRadius: 10,
                    offset: Offset(0, 2)),
              ],
            ),
            child: Column(
              children: [
                _linha(
                  icone: Icons.account_balance_wallet_outlined,
                  chipBg: AppColors.surfaceContainer,
                  chipFg: AppColors.onSurfaceVariant,
                  rotulo: 'Fundo inicial',
                  valor: _moeda.format(s.fundoCaixa),
                  valorCor: AppColors.onSurface,
                ),
                const Divider(
                    height: 1, thickness: 1, color: AppColors.surfaceContainer),
                _linha(
                  icone: Icons.arrow_downward,
                  chipBg: AppColors.primaryContainer,
                  chipFg: AppColors.primary,
                  rotulo: 'Entradas',
                  valor: '+ ${_moeda.format(s.totalEntradas)}',
                  valorCor: AppColors.primary,
                ),
                const Divider(
                    height: 1, thickness: 1, color: AppColors.surfaceContainer),
                _linha(
                  icone: Icons.arrow_upward,
                  chipBg: AppColors.saidaBg,
                  chipFg: AppColors.saida,
                  rotulo: 'Sangrias',
                  valor: '− ${_moeda.format(s.totalSangrias)}',
                  valorCor: AppColors.saida,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _atalho(
                  icone: Icons.receipt_long_outlined,
                  rotulo: 'Movimentos',
                  onTap: () => context.push(Routes.caixaMovimentos),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _atalho(
                  icone: Icons.swap_vert_rounded,
                  rotulo: 'Lançar',
                  onTap: () => _dialogLancamento(context, ref),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _atalho(
                  icone: Icons.lock_outline,
                  rotulo: 'Fechar',
                  cor: AppColors.saida,
                  bg: AppColors.saidaBg,
                  onTap: () => _dialogFechar(context, ref, s),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Detalhamento continua acessível — só deixou de ser botão de peso
          // igual ao de fechar o caixa, que é irreversível.
          TextButton(
            onPressed: () => context.push(Routes.caixaDetalhe, extra: s),
            child: const Text('ver detalhamento do fechamento',
                style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary)),
          ),
        ],
      );

  Widget _linha({
    required IconData icone,
    required Color chipBg,
    required Color chipFg,
    required String rotulo,
    required String valor,
    required Color valorCor,
  }) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 11),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: chipBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icone, size: 17, color: chipFg),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(rotulo,
                  style: const TextStyle(
                      fontSize: 13,
                      height: 1.3,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurfaceVariant)),
            ),
            Text(valor,
                style: TextStyle(
                    fontSize: 14,
                    height: 1.3,
                    fontWeight: FontWeight.w700,
                    color: valorCor)),
          ],
        ),
      );

  Widget _atalho({
    required IconData icone,
    required String rotulo,
    required VoidCallback onTap,
    Color? cor,
    Color? bg,
  }) =>
      InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          height: 76,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(
                  color: AppColors.shadow, blurRadius: 10, offset: Offset(0, 2)),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: bg ?? AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icone, size: 16, color: cor ?? AppColors.primary),
              ),
              const SizedBox(height: 6),
              Text(rotulo,
                  style: TextStyle(
                      fontSize: 12,
                      height: 1,
                      fontWeight: FontWeight.w700,
                      color: cor ?? AppColors.onSurface)),
            ],
          ),
        ),
      );

  Future<void> _dialogAbrir(BuildContext context, WidgetRef ref) async {
    // Fundo já vem 0,00 — na maioria dos casos o operador só confirma.
    final ctrl = TextEditingController(text: '0,00');
    ctrl.selection =
        TextSelection(baseOffset: 0, extentOffset: ctrl.text.length);
    final ok = await _dialogValor(context, 'Abrir caixa', 'Fundo inicial (R\$)', ctrl);
    if (ok != true) return;
    final fundo = _parseValor(ctrl.text);
    await ref.read(caixaSessaoNotifierProvider.notifier).abrir(fundo);
    if (context.mounted) AppToast.success(context, 'Caixa aberto!');
  }

  /// Lançamento manual: Receita (entra) ou Despesa (sai), com descrição.
  Future<void> _dialogLancamento(BuildContext context, WidgetRef ref) async {
    final valorCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    var receita = true;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Lançar no caixa'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: _chipTipo(
                      'Receita',
                      Icons.arrow_downward_rounded,
                      selecionado: receita,
                      cor: AppColors.entrada,
                      bg: AppColors.entradaBg,
                      onTap: () => setState(() => receita = true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _chipTipo(
                      'Despesa',
                      Icons.arrow_upward_rounded,
                      selecionado: !receita,
                      cor: AppColors.danger,
                      bg: const Color(0xFFFDECEC),
                      onTap: () => setState(() => receita = false),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: valorCtrl,
                autofocus: true,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9,]'))
                ],
                decoration: const InputDecoration(labelText: 'Valor (R\$)'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Descrição',
                  hintText: 'Ex.: venda de água / compra de bobina',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancelar')),
            FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Lançar')),
          ],
        ),
      ),
    );
    if (ok != true) return;

    final valor = _parseValor(valorCtrl.text);
    final descricao = descCtrl.text.trim();
    if (valor <= 0) {
      if (context.mounted) AppToast.error(context, 'Informe um valor maior que zero.');
      return;
    }
    if (descricao.isEmpty) {
      if (context.mounted) AppToast.error(context, 'Informe a descrição do lançamento.');
      return;
    }

    final sessao = ref.read(caixaSessaoNotifierProvider).value;
    if (sessao == null) return;
    await ref.read(caixaRepositoryProvider).registrarLancamentoManual(
          caixaSessaoId: sessao.id,
          receita: receita,
          valor: valor,
          descricao: descricao,
        );
    ref.invalidate(caixaSessaoNotifierProvider);
    ref.invalidate(caixaMovimentosProvider(sessao.id));
    if (context.mounted) {
      AppToast.success(
          context, receita ? 'Receita lançada.' : 'Despesa lançada.');
    }
  }

  Widget _chipTipo(
    String label,
    IconData icon, {
    required bool selecionado,
    required Color cor,
    required Color bg,
    required VoidCallback onTap,
  }) =>
      InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selecionado ? bg : AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selecionado ? cor : AppColors.border,
              width: selecionado ? 1.6 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, size: 20, color: selecionado ? cor : AppColors.outline),
              const SizedBox(height: 4),
              Text(label,
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: selecionado ? cor : AppColors.onSurfaceVariant)),
            ],
          ),
        ),
      );

  Future<void> _dialogFechar(BuildContext context, WidgetRef ref, CaixaModel s) async {
    // Blindagem 100x: prefill com VÍRGULA. O parser BR remove pontos, então um
    // prefill "150.50" (toStringAsFixed) fechado sem edição viraria 15050.
    final ctrl = TextEditingController(
        text: s.saldoCalculado.toStringAsFixed(2).replaceAll('.', ','));
    final obsCtrl = TextEditingController();
    final divergencia = ValueNotifier<double>(0);
    void recalc() =>
        divergencia.value = _parseValor(ctrl.text) - s.saldoCalculado;
    ctrl.addListener(recalc);
    recalc();

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Fechar caixa'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _confLinha('Saldo esperado', _moeda.format(s.saldoCalculado)),
              const SizedBox(height: 4),
              _confLinhaFraca('Fundo', _moeda.format(s.fundoCaixa)),
              _confLinhaFraca('Entradas', _moeda.format(s.totalEntradas)),
              _confLinhaFraca('Sangrias', '- ${_moeda.format(s.totalSangrias)}'),
              const Divider(height: 24),
              TextField(
                controller: ctrl,
                autofocus: true,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9,]'))
                ],
                decoration:
                    const InputDecoration(labelText: 'Valor contado (R\$)'),
              ),
              const SizedBox(height: 12),
              ValueListenableBuilder<double>(
                valueListenable: divergencia,
                builder: (_, d, _) => _divergenciaBanner(d),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: obsCtrl,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Observação (opcional)',
                  hintText: 'Ex.: sangria feita sem registro',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Fechar caixa')),
        ],
      ),
    );
    ctrl.removeListener(recalc);
    if (ok != true) return;

    final contado = _parseValor(ctrl.text);
    final obs = obsCtrl.text.trim();
    final fechamento = DateTime.now();
    final res = await ref
        .read(caixaSessaoNotifierProvider.notifier)
        .fechar(contado, obs: obs.isEmpty ? null : obs);
    if (res == null) return;

    // Imprime o relatório (se houver impressora). Mesmo helper da reimpressão.
    // Falha de impressão NÃO invalida o fechamento — ele já está gravado; o
    // operador reimprime pelo botão da tela de caixa fechado.
    final impresso = await _imprimirFechamento(ref, s, res, fechamento);
    if (context.mounted && impresso == false) {
      AppToast.error(context,
          'Caixa fechado, mas o cupom não saiu. Use "Reimprimir último fechamento".');
    }

    // Conferência PERSISTENTE — fica na tela até o operador confirmar. Antes era
    // só um toast que sumia em ~2s ("as validações não apareciam").
    if (context.mounted) await _dialogResultado(context, res);
  }

  /// Monta e envia o cupom de fechamento. Reutilizado no fechamento e na
  /// reimpressão.
  ///
  /// `null` = não há impressora configurada · `true` = saiu · `false` = falhou.
  /// Antes devolvia `true` sem olhar o resultado de `print()`, então a falha era
  /// invisível: a reimpressão dizia "Fechamento reimpresso" sem sair papel.
  Future<bool?> _imprimirFechamento(
    WidgetRef ref,
    CaixaModel s,
    FechamentoResult res,
    DateTime fechamento,
  ) async {
    final printer = await ref
        .read(printerNotifierProvider.future)
        .catchError((_) => const PrinterState());
    if (!printer.temImpressora) return null;

    final patioNome = ref.read(patioNotifierProvider).value?.nome ?? 'Patio';
    final hora = DateFormat('HH:mm');
    final movs = await ref.read(caixaRepositoryProvider).getMovimentos(s.id);
    final porForma = resumoPorForma(movs)
        .map((r) => ResumoFormaCupom(
              rotulo: rotuloFormaPagamento(r.forma),
              valor: r.total,
            ))
        .toList();
    final bytes = PrintTemplates.fechamentoCaixa(
      operadorNome: s.operadorNome,
      operacaoNome: patioNome,
      abertura: s.abertura,
      fechamento: fechamento,
      fundoCaixa: s.fundoCaixa,
      totalEntradas: s.totalEntradas,
      totalSangrias: s.totalSangrias,
      totalCalculado: res.totalCalculado,
      totalContado: res.totalContado,
      divergencia: res.divergencia,
      movimentos: movs
          .map((m) => MovimentoCupom(
                hora: hora.format(m.criadoEm),
                descricao: m.descricao,
                valor:
                    '${m.tipo == 'sangria' ? '-' : '+'}${_moeda.format(m.valor)}',
              ))
          .toList(),
      porForma: porForma,
      cols: printer.cols,
      avancoFinal: printer.avancoFinal,
    );
    return ref.read(printerNotifierProvider.notifier).print(bytes);
  }

  /// Abre o detalhamento do último fechamento (o mesmo do cupom, na tela).
  Future<void> _verDetalheUltimo(BuildContext context, WidgetRef ref) async {
    final s =
        await ref.read(caixaSessaoNotifierProvider.notifier).ultimoFechamento();
    if (!context.mounted) return;
    if (s == null) {
      AppToast.error(context, 'Nenhum fechamento recente para detalhar.');
      return;
    }
    context.push(Routes.caixaDetalhe, extra: s);
  }

  /// Reimprime o último fechamento — cobre impressora sem papel/desligada na
  /// hora de fechar. Reconstrói o resultado a partir dos dados persistidos.
  Future<void> _reimprimirUltimoFechamento(
      BuildContext context, WidgetRef ref) async {
    final s = await ref.read(caixaSessaoNotifierProvider.notifier).ultimoFechamento();
    if (s == null) {
      if (context.mounted) {
        AppToast.error(context, 'Nenhum fechamento recente para reimprimir.');
      }
      return;
    }
    // Recomputa dos movimentos (fonte da verdade), igual ao fechamento.
    final movs = await ref.read(caixaRepositoryProvider).getMovimentos(s.id);
    final entradas =
        movs.where((m) => m.tipo == 'entrada').fold<double>(0, (t, m) => t + m.valor);
    final sangrias =
        movs.where((m) => m.tipo == 'sangria').fold<double>(0, (t, m) => t + m.valor);
    final calculado = s.fundoCaixa + entradas - sangrias;
    final contado = s.totalFechamento ?? calculado;
    final res = FechamentoResult(
      totalCalculado: calculado,
      totalContado: contado,
      divergencia: contado - calculado,
    );
    final r =
        await _imprimirFechamento(ref, s, res, s.fechamento ?? DateTime.now());
    if (!context.mounted) return;
    switch (r) {
      case null:
        AppToast.error(context, 'Nenhuma impressora configurada. Veja em Config.');
      case true:
        AppToast.success(context, 'Fechamento reimpresso.');
      case false:
        AppToast.error(context, 'Falha ao imprimir. Verifique a impressora.');
    }
  }

  /// Painel de conferência do fechamento: esperado × contado × divergência,
  /// colorido por resultado. Permanece na tela até o operador concluir.
  Future<void> _dialogResultado(BuildContext context, FechamentoResult res) {
    final (Color cor, Color bg, String titulo, IconData icone) =
        !res.temDivergencia
            ? (
                AppColors.success,
                AppColors.entradaBg,
                'Caixa confere',
                Icons.check_circle_outline
              )
            : res.emExcesso
                ? (
                    AppColors.warning,
                    const Color(0xFFFFF7E6),
                    'Sobra no caixa',
                    Icons.trending_up_rounded
                  )
                : (
                    AppColors.danger,
                    const Color(0xFFFDECEC),
                    'Falta no caixa',
                    Icons.trending_down_rounded
                  );
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            Icon(icone, color: cor),
            const SizedBox(width: 10),
            Expanded(child: Text(titulo)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _confLinha('Esperado', _moeda.format(res.totalCalculado)),
            _confLinha('Contado', _moeda.format(res.totalContado)),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(res.temDivergencia ? 'Divergência' : 'Diferença',
                      style:
                          TextStyle(fontWeight: FontWeight.w700, color: cor)),
                  Text(_moeda.format(res.divergencia.abs()),
                      style: TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 18, color: cor)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          FilledButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Concluir')),
        ],
      ),
    );
  }

  Widget _confLinha(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(k, style: const TextStyle(fontWeight: FontWeight.w600)),
            Text(v, style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
      );

  Widget _confLinhaFraca(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(k,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.onSurfaceVariant)),
            Text(v,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.onSurfaceVariant)),
          ],
        ),
      );

  /// Banner de divergência ao vivo — atualiza enquanto o operador digita o
  /// valor contado. Verde = confere, âmbar = sobra, vermelho = falta.
  Widget _divergenciaBanner(double d) {
    final (Color cor, Color bg, String txt) = d.abs() <= 0.01
        ? (AppColors.success, AppColors.entradaBg, 'Confere — sem divergência')
        : d > 0
            ? (
                AppColors.warning,
                const Color(0xFFFFF7E6),
                'Sobra de ${_moeda.format(d)}'
              )
            : (
                AppColors.danger,
                const Color(0xFFFDECEC),
                'Falta de ${_moeda.format(d.abs())}'
              );
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
      child: Row(
        children: [
          Icon(Icons.info_outline, size: 18, color: cor),
          const SizedBox(width: 8),
          Expanded(
            child: Text(txt,
                style: TextStyle(color: cor, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Future<bool?> _dialogValor(
    BuildContext context,
    String titulo,
    String label,
    TextEditingController ctrl,
  ) =>
      showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(titulo),
          content: TextField(
            controller: ctrl,
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9,]'))],
            decoration: InputDecoration(labelText: label),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmar')),
          ],
        ),
      );

  /// Parser BR blindado: a entrada só permite dígitos e vírgula (decimal).
  /// "150,50" → 150.5 · "1500" → 1500 · "150" → 150. Sem ambiguidade de ponto.
  static double _parseValor(String s) =>
      double.tryParse(s.trim().replaceAll('.', '').replaceAll(',', '.')) ?? 0.0;
}
