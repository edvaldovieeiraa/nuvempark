import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/brisa.dart';
import '../../caixa/presentation/providers/caixa_provider.dart';
import '../../patio/domain/patio_model.dart';
import '../../patio/domain/tarifa_config.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../printing/data/print_templates.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../../tarifa/domain/fare_result.dart';
import '../../tarifa/domain/tarifa_engine.dart';
import '../data/pagamento_online_service.dart';
import '../data/ticket_repository.dart';
import '../domain/ticket_model.dart';
import 'providers/ticket_provider.dart';

/// Saída/cobrança: busca o ticket, calcula a tarifa com o TarifaEngine,
/// registra a forma de pagamento (manual por ora; gancho Pix na Fase 4) e
/// fecha o ticket (enfileira sync).
class SaidaScreen extends ConsumerStatefulWidget {
  const SaidaScreen({super.key, required this.ticketId});
  final String ticketId;

  @override
  ConsumerState<SaidaScreen> createState() => _SaidaScreenState();
}

class _SaidaScreenState extends ConsumerState<SaidaScreen> {
  TicketModel? _ticket;
  TarifaConfig? _tarifaSelecionada;

  /// Forma de pagamento destacada nos cards; o confirmar usa esta escolha.
  /// A confirmação segue passando pelo diálogo — a seleção é só a UI do Brisa.
  String? _formaSelecionada;
  bool _carregando = true;
  bool _fechando = false;
  String? _erro;

  /// Pagamento pelo QR. `null` = não pago, ou não deu para consultar (offline).
  /// Nos dois casos a saída segue o fluxo manual — a diferença aparece só na UI.
  PagamentoOnlineStatus? _pagoOnline;
  bool _consultandoPagamento = false;
  bool _gerandoPix = false;

  @override
  void initState() {
    super.initState();
    _carregarTicket();
  }

  /// Consulta do pagamento online. BEST-EFFORT: erro ou timeout deixa
  /// `_pagoOnline` nulo e a tela cai na cobrança normal. Rede caída nunca pode
  /// prender um carro no pátio.
  Future<void> _consultarPagamentoOnline() async {
    setState(() => _consultandoPagamento = true);
    final r = await ref
        .read(pagamentoOnlineServiceProvider)
        .consultar(widget.ticketId);
    if (!mounted) return;
    setState(() {
      _pagoOnline = r;
      _consultandoPagamento = false;
    });
  }

  /// Pix dinâmico: gera a cobrança no servidor (mesma da página pública), mostra
  /// o QR/copia-e-cola numa folha e faz polling. Confirmado o pagamento, a saída
  /// é fechada AGORA com a receita entrando no CAIXA do operador (forma 'pix').
  ///
  /// É o que distingue o Pix DINÂMICO do Pix online (link do cupom): o dinâmico
  /// passou pela mão do operador na saída, então é receita do caixa dele. O Pix
  /// online (fluxo "PAGO ONLINE VIA PIX") continua fora do caixa — cai na conta
  /// do tenant e o servidor o marca com origem 'app' vs 'publico' (migração 25).
  Future<void> _pixDinamico(PatioModel patio, FareResult fare) async {
    if (_ticket == null || _gerandoPix) return;
    final ticketId = _ticket!.id;

    setState(() => _gerandoPix = true);
    CobrancaPixDinamico cobranca;
    try {
      cobranca =
          await ref.read(pagamentoOnlineServiceProvider).gerarPix(ticketId);
    } on PixIndisponivelException catch (e) {
      if (mounted) AppToast.error(context, e.mensagem);
      return;
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não consegui gerar o Pix agora.');
      return;
    } finally {
      if (mounted) setState(() => _gerandoPix = false);
    }
    if (!mounted) return;

    final pago = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      builder: (_) => _PixDinamicoSheet(
        cobranca: cobranca,
        // Reusa a consulta que já existe — a MESMA verdade do servidor.
        consultar: () async {
          final r = await ref
              .read(pagamentoOnlineServiceProvider)
              .consultar(ticketId);
          return r?.pago == true;
        },
      ),
    );

    if (pago == true && mounted) {
      AppToast.success(context, 'Pix confirmado!');
      // Pix dinâmico = receita coletada pelo operador → fecha a saída lançando no
      // CAIXA (forma 'pix'), NÃO pelo fluxo "pago online" (esse é só do link
      // público). O valor cobrado é o da cobrança gerada.
      await _confirmar(patio, fare, 'pix', valorCobradoOverride: cobranca.valor);
    }
  }

  Future<void> _carregarTicket() async {
    try {
      final t = await ref.read(ticketRepositoryProvider).getById(widget.ticketId);
      setState(() {
        _ticket = t;
        _carregando = false;
        if (t == null) {
          _erro = 'Ticket não encontrado.';
        } else if (t.status != 'aberto') {
          _erro = 'Este ticket já foi fechado.';
        }
      });
      if (t != null && t.status == 'aberto') {
        unawaited(_consultarPagamentoOnline());
      }
    } catch (_) {
      setState(() {
        _carregando = false;
        _erro = 'Erro ao carregar o ticket.';
      });
    }
  }

  List<TarifaConfig> _opcoes(PatioModel patio, TicketModel ticket) {
    final visiveis = patio.tabelasVisiveis(ticket.tipoVeiculo);
    return visiveis.isNotEmpty
        ? visiveis
        : patio.tarifasVigentes(ticket.tipoVeiculo);
  }

  /// Pede confirmação antes de fechar — evita cobrança na forma errada.
  /// Mostra placa, valor e a forma escolhida num resumo claro.
  Future<void> _confirmarComDialogo(
    PatioModel patio,
    FareResult fare,
    String formaPagamento, {
    /// Cobrando só a diferença de um ticket já pago pelo Pix.
    double? valorCobradoOverride,
  }) async {
    if (_ticket == null) return;
    final ticket = _ticket!;
    final fmt = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    final valorExibido = valorCobradoOverride ?? fare.valor;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmar saída'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _resumoLinha('Placa', ticket.placa),
            _resumoLinha('Forma', _labelForma(formaPagamento)),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(valorCobradoOverride != null ? 'Diferenca' : 'Total',
                    style: const TextStyle(
                        fontSize: 14, color: AppColors.onSurfaceVariant)),
                Text(fmt.format(valorExibido),
                    style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary)),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Voltar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Confirmar')),
        ],
      ),
    );
    if (ok == true) {
      await _confirmar(patio, fare, formaPagamento,
          valorCobradoOverride: valorCobradoOverride);
    }
  }

  /// Ticket pago pelo QR e dentro da carência: NÃO se cobra de novo. Some a
  /// seleção de forma de pagamento — oferecê-la seria convidar o operador a
  /// cobrar duas vezes o mesmo carro.
  Widget _buildPagoOnline(
    PatioModel patio,
    TicketModel ticket,
    FareResult fare,
    PagamentoOnlineStatus pago,
  ) {
    final fmt = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    final hora = DateFormat('HH:mm');
    final valor = pago.valorPago ?? 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.entradaBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: AppColors.entrada.withValues(alpha: 0.4), width: 1.5),
            ),
            child: Column(
              children: [
                const Icon(Icons.verified, size: 40, color: AppColors.entrada),
                const SizedBox(height: 10),
                const Text('PAGO ONLINE VIA PIX',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                        color: AppColors.entrada)),
                const SizedBox(height: 8),
                Text(fmt.format(valor),
                    style: const TextStyle(
                        fontSize: 36,
                        fontWeight: FontWeight.w800,
                        color: AppColors.entrada)),
                if (pago.pagoEm != null)
                  Text('às ${hora.format(pago.pagoEm!)}',
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.onSurfaceVariant)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  _linha('Placa', ticket.placa),
                  _linha('Tipo', ticket.tipoVeiculo),
                  _linha('Permanência', _fmtDuracao(ticket.tempoPermanencia),
                      last: true),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _fechando
                ? null
                : () => _confirmar(
                      patio,
                      fare,
                      'pix_online',
                      valorCobradoOverride: valor,
                      semCaixa: true, // não entra no caixa — ver [semCaixa]
                    ),
            child: _fechando
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                        strokeWidth: 2.5, color: Colors.white))
                : const Text('Confirmar saída'),
          ),
          const SizedBox(height: 10),
          const Text(
            'O valor já caiu na conta do estacionamento. Não cobre de novo.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  /// Pagou pelo QR mas ficou além da carência: cobra-se só a diferença.
  Widget _bannerDiferenca(PagamentoOnlineStatus pago, NumberFormat fmt) {
    final hora = DateFormat('HH:mm');
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.saidaBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.saida.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          const Icon(Icons.timelapse, color: AppColors.saida),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Já pagou ${fmt.format(pago.valorPago ?? 0)} pelo Pix'
                  '${pago.pagoEm != null ? ' às ${hora.format(pago.pagoEm!)}' : ''}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 13),
                ),
                const Text(
                  'O carro ficou mais tempo. Cobre apenas a diferença abaixo.',
                  style: TextStyle(
                      fontSize: 12, color: AppColors.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _resumoLinha(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(k,
                style: const TextStyle(
                    fontSize: 14, color: AppColors.onSurfaceVariant)),
            Text(v,
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w700)),
          ],
        ),
      );

  /// [valorCobradoOverride] troca o que se cobra AGORA sem mexer no valor
  /// calculado da estadia: é o valor já pago (pix online) ou só a diferença.
  ///
  /// [semCaixa] pula o lançamento no caixa. DECISÃO DELIBERADA: saída paga
  /// online NÃO cria caixa_movimento — o dinheiro caiu na conta Asaas do tenant,
  /// não passou pela gaveta do operador. Lançar ali estouraria a conferência do
  /// fechamento (o operador teria de "ter" um dinheiro que nunca recebeu).
  /// Relatórios que precisem separar receita online leem do ticket
  /// (valor_pago_online) ou de pagamentos_online.
  Future<void> _confirmar(
    PatioModel patio,
    FareResult fare,
    String formaPagamento, {
    double? valorCobradoOverride,
    bool semCaixa = false,
  }) async {
    if (_fechando || _ticket == null || _tarifaSelecionada == null) return;
    // Trava o botão SINCRONAMENTE, antes de qualquer await. Sem isto, um
    // duplo-toque rápido passa pela guarda acima duas vezes antes do primeiro
    // await — a trava real contra pagamento duplo mora no repositório (fecho
    // condicional), mas esta trava de UI evita o retrabalho e o toast dobrado.
    setState(() => _fechando = true);

    final ticket = _ticket!;
    final isLivre = formaPagamento == 'livre_passagem';
    final saida = DateTime.now();
    final valorCobrado =
        isLivre ? 0.0 : (valorCobradoOverride ?? fare.valor);

    // Caixa: só quando o dinheiro passa pela gaveta AGORA.
    final movimentaCaixa = !isLivre && valorCobrado > 0 && !semCaixa;

    // Providers lidos AGORA, com o widget vivo. O núcleo (fecho + caixa) e o
    // trabalho de fundo (sync, impressão) não podem mais tocar em `ref` se o
    // operador sair da tela no meio de um await — usar `ref` após o dispose
    // lança. Espelha o padrão do entrada_screen.
    final ticketRepo = ref.read(ticketRepositoryProvider);
    final tokenStorage = ref.read(tokenStorageProvider);
    final syncEngine = ref.read(syncEngineProvider);
    final printerFuture = ref.read(printerNotifierProvider.future);
    final printerNotifier = ref.read(printerNotifierProvider.notifier);

    try {
      // Barreira: cobrança > 0 exige caixa aberto (senão entra sem registro).
      String? caixaSessaoId;
      if (movimentaCaixa) {
        final sessao = await ref.read(caixaSessaoNotifierProvider.future);
        if (sessao == null) {
          if (mounted) {
            AppToast.error(context,
                'Caixa fechado. Abra o caixa para registrar esta saída.');
          }
          return;
        }
        caixaSessaoId = sessao.id;
      }

      // Quem está VALIDANDO a saída agora — não confundir com o operador da
      // entrada, que pode ser de outro turno. É o que o painel audita.
      final user = await tokenStorage.readUser();
      if (user == null) {
        if (mounted) {
          AppToast.error(context, 'Sessão inválida. Entre novamente.');
        }
        return;
      }

      // Fecho do ticket + receita no caixa numa ÚNICA transação atômica. Pago
      // online / livre passagem passam caixaSessaoId nulo e não movimentam a
      // gaveta — ver o comentário de [semCaixa].
      await ticketRepo.registrarSaida(
            ticketId: ticket.id,
            valorCalculado: fare.valor,
            valorCobrado: valorCobrado,
            formaPagamento: formaPagamento,
            operadorSaidaId: user.id,
            tabelaPrecoId: _tarifaSelecionada!.id,
            caixaSessaoId: caixaSessaoId,
            placa: ticket.placa,
          );

      if (mounted) {
        if (movimentaCaixa) ref.invalidate(caixaSessaoNotifierProvider);
        ref.invalidate(ticketsAbertosProvider);
      }
      unawaited(syncEngine.drain());

      // Auto-print do recibo de saída, se houver impressora.
      final printer =
          await printerFuture.catchError((_) => const PrinterState());
      if (printer.temImpressora) {
        final bytes = PrintTemplates.reciboSaida(
          placa: ticket.placa,
          tipoVeiculo: ticket.tipoVeiculo,
          entrada: ticket.entrada,
          saida: saida,
          valorCobrado: valorCobrado,
          formaPagamento: formaPagamento,
          operacaoNome: patio.nome,
          isIsento: isLivre,
          cols: printer.cols,
          avancoFinal: printer.avancoFinal,
          cabecalho: patio.ticketCabecalho,
          rodape: patio.ticketRodape,
        );
        final ok = await printerNotifier.print(bytes);
        if (mounted && !ok) {
          AppToast.error(context, 'Falha ao imprimir o recibo.');
        }
      }

      if (mounted) {
        AppToast.success(context, 'Saída registrada!');
        context.pop();
      }
    } on TicketJaFechadoException {
      // Duplo-toque / retry: a saída já foi efetivada por outra chamada. Não é
      // erro — nada foi cobrado a mais (o fecho é atômico). Só sai da tela.
      if (mounted) {
        ref.invalidate(ticketsAbertosProvider);
        AppToast.success(context, 'Saída já registrada.');
        context.pop();
      }
    } catch (e) {
      if (mounted) AppToast.error(context, 'Erro ao registrar saída.');
    } finally {
      if (mounted) setState(() => _fechando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final patioAsync = ref.watch(patioNotifierProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: appBarBrisa(context, 'Saída'),
      body: _carregando
          ? const Center(child: CircularProgressIndicator())
          : _erro != null
              ? ErrorState(mensagem: _erro!, onRetry: () => context.pop())
              : patioAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => const ErrorState(mensagem: 'Config do pátio indisponível.'),
                  data: (patio) {
                    if (patio == null) {
                      return const ErrorState(mensagem: 'Config do pátio indisponível.');
                    }
                    return _buildCobranca(patio, _ticket!);
                  },
                ),
    );
  }

  Widget _buildCobranca(PatioModel patio, TicketModel ticket) {
    final opcoes = _opcoes(patio, ticket);
    if (opcoes.isEmpty) {
      return const ErrorState(mensagem: 'Nenhuma tarifa vigente para este veículo.');
    }
    // Auto-seleciona se só há uma opção.
    _tarifaSelecionada ??= opcoes.length == 1 ? opcoes.first : opcoes.first;

    final tarifaCalculo = _tarifaSelecionada ?? opcoes.first;
    final livre = ticket.isLivrePassagem;
    final fare = TarifaEngine.calcular(
      entrada: ticket.entrada,
      saida: DateTime.now(),
      tarifa: tarifaCalculo,
    );

    // Pago pelo QR e ainda na carência: não se cobra de novo. Tela própria.
    final pago = _pagoOnline;
    if (pago != null && pago.pago && pago.dentroCarencia) {
      return _buildPagoOnline(patio, ticket, fare, pago);
    }

    // Pago, mas o carro ficou além da carência: cobra-se SÓ a diferença, nunca
    // o total de novo — o cliente já pagou uma parte pelo Pix.
    final diferenca =
        (pago != null && pago.pago && pago.temDiferenca) ? pago.diferenca! : null;

    final valor = livre ? 0.0 : (diferenca ?? fare.valor);

    // Regra: saída COM cobrança exige caixa aberto (senão o dinheiro entra sem
    // registro). Livre-passagem/isenção não movimentam caixa → sempre liberadas.
    final caixaAberto = ref.watch(caixaSessaoNotifierProvider).value != null;
    final exigeCaixa = !livre && valor > 0 && !caixaAberto;

    final fmtMoeda = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    final permanencia = _fmtDuracao(ticket.tempoPermanencia);

    // Forma destacada por padrão: primeira configurada. A confirmação continua
    // passando pelo diálogo de resumo — a seleção é só o realce visual do Brisa.
    _formaSelecionada ??=
        patio.formasPagamento.isNotEmpty ? patio.formasPagamento.first : null;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Aviso enquanto a consulta corre. Sem ele, o operador poderia cobrar
          // manualmente nos segundos ANTES de o card "pago online" aparecer — e
          // o cliente pagaria duas vezes o mesmo carro.
          if (_consultandoPagamento) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: 10),
                  Text('Verificando pagamento online…',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.onSurfaceVariant)),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          if (diferenca != null && pago != null) ...[
            _bannerDiferenca(pago, fmtMoeda),
            const SizedBox(height: 12),
          ],

          // Hero escuro do Brisa: placa em pílula, valor grande e chips de
          // contexto (hora de entrada + tipo do veículo).
          _heroSaida(
            ticket: ticket,
            caption: livre
                ? null
                : (diferenca != null ? 'DIFERENÇA A PAGAR' : 'TOTAL A PAGAR'),
            valorLabel: livre ? 'Livre' : fmtMoeda.format(valor),
            subLabel: '$permanencia · ${tarifaCalculo.nome}',
          ),

          // Seleção de tarifa (se múltiplas)
          if (opcoes.length > 1) ...[
            const SizedBox(height: 18),
            const RotuloBrisa('Tabela de preço'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: opcoes.map((t) {
                final sel = _tarifaSelecionada?.id == t.id;
                return ChoiceChip(
                  label: Text(t.nome),
                  selected: sel,
                  onSelected: (_) => setState(() => _tarifaSelecionada = t),
                );
              }).toList(),
            ),
          ],

          if (livre) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.entradaBg,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Row(
                children: [
                  Icon(Icons.verified, color: AppColors.entrada),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Mensalista em dia — livre passagem, nada a cobrar.',
                      style: TextStyle(
                          fontSize: 13,
                          height: 1.35,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 58,
              child: FilledButton.icon(
                onPressed: _fechando
                    ? null
                    : () => _confirmar(patio, fare, 'livre_passagem'),
                icon: _fechando
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: Colors.white))
                    : const Icon(Icons.check_circle),
                label: const Text('Confirmar saída livre'),
              ),
            ),
          ] else if (exigeCaixa) ...[
            const SizedBox(height: 16),
            // Caixa fechado: bloqueia o pagamento e leva o operador a abrir.
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.saidaBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: AppColors.saida.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.lock_outline, color: AppColors.saida),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Abra o caixa antes de registrar saídas com pagamento.',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 54,
              child: FilledButton.icon(
                onPressed: () => context.push(Routes.caixa),
                icon: const Icon(Icons.point_of_sale_outlined),
                label: const Text('Abrir caixa'),
              ),
            ),
          ] else ...[
            const SizedBox(height: 20),
            const RotuloBrisa('Como o cliente vai pagar?'),
            const SizedBox(height: 10),
            // Grade 2 colunas com as formas configuradas (cards do Brisa).
            LayoutBuilder(
              builder: (ctx, c) {
                const gap = 10.0;
                final w = (c.maxWidth - gap) / 2;
                return Wrap(
                  spacing: gap,
                  runSpacing: gap,
                  children: patio.formasPagamento
                      .map((forma) => SizedBox(
                            width: w,
                            child: _cardForma(
                              forma,
                              _formaSelecionada == forma,
                              () => setState(() => _formaSelecionada = forma),
                            ),
                          ))
                      .toList(),
                );
              },
            ),
            // Pix dinâmico: o operador gera o QR aqui e mostra pro cliente
            // pagar na hora. Some quando não há valor a cobrar (tolerância).
            if (valor > 0) ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 52,
                child: OutlinedButton.icon(
                  onPressed:
                      _gerandoPix ? null : () => _pixDinamico(patio, fare),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(
                        color: AppColors.primaryFill, width: 2),
                    foregroundColor: AppColors.primary,
                  ),
                  icon: _gerandoPix
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2.2, color: AppColors.primary))
                      : const Icon(Icons.qr_code_2),
                  label: Text(
                      _gerandoPix ? 'Gerando Pix…' : 'Gerar QR Pix na tela'),
                ),
              ),
            ],
            const SizedBox(height: 12),
            SizedBox(
              height: 58,
              child: FilledButton.icon(
                onPressed: (_fechando || _formaSelecionada == null)
                    ? null
                    : () => _confirmarComDialogo(
                          patio,
                          fare,
                          _formaSelecionada!,
                          valorCobradoOverride: diferenca,
                        ),
                icon: _fechando
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: Colors.white))
                    : const Icon(Icons.check_circle),
                label: Text(diferenca != null
                    ? 'Cobrar diferença'
                    : 'Confirmar saída'),
              ),
            ),
            const SizedBox(height: 9),
            const Text(
              'o recibo imprime sozinho na confirmação',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppColors.outline),
            ),
          ],
        ],
      ),
    );
  }

  /// Hero escuro do Brisa (saída): placa em pílula, valor grande e dois chips
  /// de contexto. Fundo #1F2937 com sombra esverdeada, igual ao protótipo.
  Widget _heroSaida({
    required TicketModel ticket,
    required String? caption,
    required String valorLabel,
    required String subLabel,
  }) {
    final hora = DateFormat('HH:mm').format(ticket.entrada);
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFF1F2937),
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
              color: Color(0x4D14532D), blurRadius: 28, offset: Offset(0, 10)),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              ticket.placa,
              style: const TextStyle(
                  fontSize: 14,
                  height: 1,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.6,
                  color: Colors.white),
            ),
          ),
          if (caption != null) ...[
            const SizedBox(height: 12),
            Text(caption,
                style: const TextStyle(
                    fontSize: 11,
                    height: 1,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                    color: Color(0xFF9CA3AF))),
          ],
          const SizedBox(height: 8),
          Text(
            valorLabel,
            style: const TextStyle(
                fontSize: 44,
                height: 1,
                fontWeight: FontWeight.w800,
                color: Colors.white),
          ),
          const SizedBox(height: 8),
          Text(subLabel,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 13, height: 1.3, color: Color(0xFF9CA3AF))),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _heroChip('entrou $hora'),
              const SizedBox(width: 8),
              _heroChip(ticket.tipoVeiculo),
            ],
          ),
        ],
      ),
    );
  }

  Widget _heroChip(String texto) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(texto,
            style: const TextStyle(
                fontSize: 11,
                height: 1,
                fontWeight: FontWeight.w600,
                color: Color(0xFFCBD5E1))),
      );

  /// Card de forma de pagamento (grade 2 colunas): ícone + rótulo, borda que
  /// acende em verde quando selecionado.
  Widget _cardForma(String forma, bool sel, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          height: 74,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: sel ? AppColors.primaryFill : AppColors.outlineVariant,
              width: 2,
            ),
            boxShadow: const [
              BoxShadow(
                  color: AppColors.shadow, blurRadius: 10, offset: Offset(0, 2)),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(_iconeForma(forma),
                  size: 22,
                  color: sel ? AppColors.primary : AppColors.onSurfaceVariant),
              const SizedBox(height: 5),
              Text(_labelForma(forma),
                  style: const TextStyle(
                      fontSize: 13,
                      height: 1,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface)),
            ],
          ),
        ),
      );

  IconData _iconeForma(String forma) => switch (forma) {
        'dinheiro' => Icons.payments_outlined,
        'cartao_debito' => Icons.credit_card,
        'cartao_credito' => Icons.credit_card,
        'pix' => Icons.pix,
        _ => Icons.attach_money,
      };

  Widget _linha(String k, String v, {bool last = false}) => Container(
        padding: const EdgeInsets.symmetric(vertical: 11),
        decoration: BoxDecoration(
          border: last ? null : const Border(bottom: BorderSide(color: AppColors.outlineVariant)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(k, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13)),
            Text(v, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ],
        ),
      );

  String _labelForma(String forma) => switch (forma) {
        'dinheiro' => 'Dinheiro',
        'cartao_debito' => 'Cartão de débito',
        'cartao_credito' => 'Cartão de crédito',
        'pix' => 'Pix (manual)',
        _ => forma,
      };

  static String _fmtDuracao(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes % 60;
    if (h > 0) return '${h}h ${m}min';
    return '${m}min';
  }
}

/// Folha do Pix dinâmico: QR + copia-e-cola do Asaas e polling do pagamento.
/// Fecha com `true` assim que o servidor confirma o pagamento.
class _PixDinamicoSheet extends StatefulWidget {
  const _PixDinamicoSheet({required this.cobranca, required this.consultar});

  final CobrancaPixDinamico cobranca;

  /// Devolve true quando o ticket consta como pago no servidor.
  final Future<bool> Function() consultar;

  @override
  State<_PixDinamicoSheet> createState() => _PixDinamicoSheetState();
}

class _PixDinamicoSheetState extends State<_PixDinamicoSheet>
    with SingleTickerProviderStateMixin {
  static final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');

  Timer? _timer;
  bool _verificando = false;

  /// Barra de expiração do link: anima de cheia a vazia até o Pix expirar.
  AnimationController? _expiracao;

  @override
  void initState() {
    super.initState();
    // O webhook do Asaas confirma em segundos; consultamos a cada 4s.
    _timer = Timer.periodic(const Duration(seconds: 4), (_) => _checar());

    // O link vale até `expiraEm`. A barra parte de cheia e esvazia no tempo
    // que resta — o operador (e o cliente) veem o prazo correndo.
    final expira = widget.cobranca.expiraEm;
    if (expira != null) {
      final restante = expira.difference(DateTime.now());
      if (restante > Duration.zero) {
        _expiracao = AnimationController(vsync: this, duration: restante)
          ..reverse(from: 1.0);
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _expiracao?.dispose();
    super.dispose();
  }

  Future<void> _checar() async {
    if (_verificando) return;
    _verificando = true;
    try {
      final pago = await widget.consultar();
      if (pago && mounted) {
        _timer?.cancel();
        Navigator.pop(context, true);
      }
    } catch (_) {
      // Falha de rede numa consulta: ignora e tenta na próxima batida.
    } finally {
      _verificando = false;
    }
  }

  Uint8List? get _qrBytes {
    final b64 = widget.cobranca.pixQrcodeBase64;
    if (b64 == null || b64.isEmpty) return null;
    try {
      return base64Decode(b64);
    } catch (_) {
      return null;
    }
  }

  String _rotuloExpira() {
    final expira = widget.cobranca.expiraEm;
    if (expira == null) return '';
    final restante = expira.difference(DateTime.now());
    if (restante <= Duration.zero) {
      return 'Link expirado — feche e gere de novo';
    }
    final min = restante.inMinutes;
    if (min > 0) return 'Link válido por mais $min min';
    return 'Link válido por mais ${restante.inSeconds}s';
  }

  @override
  Widget build(BuildContext context) {
    final qr = _qrBytes;
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.outlineVariant,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Pague com Pix',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(
              _moeda.format(widget.cobranca.valor),
              style: const TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary),
            ),
            const SizedBox(height: 6),
            const Text('Mostre o QR para o cliente escanear com o banco',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 13, color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 18),
            if (qr != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Image.memory(qr, width: 240, height: 240),
              ),
            const SizedBox(height: 20),

            // Barra de expiração do link (anima até esvaziar).
            if (_expiracao != null) ...[
              AnimatedBuilder(
                animation: _expiracao!,
                builder: (context, _) {
                  final v = _expiracao!.value;
                  // Vira laranja no trecho final para avisar que está acabando.
                  final cor = v > 0.25 ? AppColors.primary : AppColors.saida;
                  return Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: v,
                          minHeight: 6,
                          backgroundColor: AppColors.surfaceContainer,
                          valueColor: AlwaysStoppedAnimation(cor),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _rotuloExpira(),
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: cor),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 16),
            ],
            const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                SizedBox(width: 10),
                Text('Aguardando o pagamento…',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurfaceVariant)),
              ],
            ),
            const SizedBox(height: 4),
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Fechar'),
            ),
          ],
        ),
      ),
    );
  }
}
