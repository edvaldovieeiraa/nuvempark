import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../caixa/presentation/providers/caixa_provider.dart';
import '../../patio/domain/patio_model.dart';
import '../../patio/domain/tarifa_config.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../printing/data/print_templates.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../../tarifa/domain/fare_result.dart';
import '../../tarifa/domain/tarifa_engine.dart';
import '../data/pagamento_online_service.dart';
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
  bool _carregando = true;
  bool _fechando = false;
  String? _erro;

  /// Pagamento pelo QR. `null` = não pago, ou não deu para consultar (offline).
  /// Nos dois casos a saída segue o fluxo manual — a diferença aparece só na UI.
  PagamentoOnlineStatus? _pagoOnline;
  bool _consultandoPagamento = false;

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
    final ticket = _ticket!;
    final isLivre = formaPagamento == 'livre_passagem';
    final saida = DateTime.now();
    final valorCobrado =
        isLivre ? 0.0 : (valorCobradoOverride ?? fare.valor);

    // Caixa: só quando o dinheiro passa pela gaveta AGORA.
    final movimentaCaixa = !isLivre && valorCobrado > 0 && !semCaixa;

    // Barreira final: cobrança > 0 exige caixa aberto (evita corrida).
    if (movimentaCaixa) {
      final sessaoAtual = await ref.read(caixaSessaoNotifierProvider.future);
      if (sessaoAtual == null) {
        if (mounted) {
          AppToast.error(context,
              'Caixa fechado. Abra o caixa para registrar esta saída.');
        }
        return;
      }
    }

    setState(() => _fechando = true);
    try {
      // Quem está VALIDANDO a saída agora — não confundir com o operador da
      // entrada, que pode ser de outro turno. É o que o painel audita.
      final user = await ref.read(tokenStorageProvider).readUser();
      if (user == null) {
        if (mounted) {
          AppToast.error(context, 'Sessão inválida. Entre novamente.');
          setState(() => _fechando = false);
        }
        return;
      }

      await ref.read(ticketRepositoryProvider).fecharTicket(
            ticketId: ticket.id,
            valorCalculado: fare.valor,
            valorCobrado: valorCobrado,
            formaPagamento: formaPagamento,
            operadorSaidaId: user.id,
            tabelaPrecoId: _tarifaSelecionada!.id,
          );

      // Lança a receita no caixa aberto (garantido aberto pela barreira acima).
      // Pago online não entra aqui — ver o comentário de [semCaixa].
      if (movimentaCaixa) {
        final sessao = await ref.read(caixaSessaoNotifierProvider.future);
        if (sessao != null) {
          await ref.read(caixaRepositoryProvider).registrarEntradaTicket(
                caixaSessaoId: sessao.id,
                ticketId: ticket.id,
                valor: valorCobrado,
                formaPagamento: formaPagamento,
                placa: ticket.placa,
              );
          ref.invalidate(caixaSessaoNotifierProvider);
        }
      }

      ref.invalidate(ticketsAbertosProvider);
      Future.microtask(() => ref.read(syncEngineProvider).drain());

      // Auto-print do recibo de saída, se houver impressora.
      final printer = await ref
          .read(printerNotifierProvider.future)
          .catchError((_) => const PrinterState());
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
        final ok = await ref.read(printerNotifierProvider.notifier).print(bytes);
        if (mounted && !ok) {
          AppToast.error(context, 'Falha ao imprimir o recibo.');
        }
      }

      if (mounted) {
        AppToast.success(context, 'Saída registrada!');
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
      appBar: AppBar(title: const Text('Saída')),
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

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
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
                borderRadius: BorderRadius.circular(10),
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
            const SizedBox(height: 16),
          ],

          if (diferenca != null && pago != null) ...[
            _bannerDiferenca(pago, fmtMoeda),
            const SizedBox(height: 16),
          ],

          // Valor
          Center(
            child: Column(
              children: [
                Text(
                    diferenca != null ? 'Diferença a pagar' : 'Total a pagar',
                    style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant, letterSpacing: 1)),
                const SizedBox(height: 6),
                Text(
                  livre ? 'Livre passagem' : fmtMoeda.format(valor),
                  style: TextStyle(
                    fontSize: livre ? 26 : 40,
                    fontWeight: FontWeight.w800,
                    color: livre ? AppColors.entrada : AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Detalhes
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  _linha('Placa', ticket.placa),
                  _linha('Tipo', ticket.tipoVeiculo),
                  _linha('Permanência', permanencia),
                  _linha('Tarifa', tarifaCalculo.nome, last: true),
                ],
              ),
            ),
          ),

          // Seleção de tarifa (se múltiplas)
          if (opcoes.length > 1) ...[
            const SizedBox(height: 16),
            const Text('Tabela de preço', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant)),
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

          const SizedBox(height: 24),
          const Text('Forma de pagamento', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 10),

          if (livre)
            FilledButton(
              onPressed: _fechando ? null : () => _confirmar(patio, fare, 'livre_passagem'),
              child: _fechando
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : const Text('Confirmar saída (livre)'),
            )
          else if (exigeCaixa) ...[
            // Caixa fechado: bloqueia o pagamento e leva o operador a abrir.
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.saidaBg,
                borderRadius: BorderRadius.circular(12),
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
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: () => context.push(Routes.caixa),
              icon: const Icon(Icons.point_of_sale_outlined),
              label: const Text('Abrir caixa'),
            ),
          ] else ...[
            // Registro manual das formas configuradas.
            ...patio.formasPagamento.map((forma) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: OutlinedButton(
                    onPressed: _fechando
                        ? null
                        : () => _confirmarComDialogo(patio, fare, forma,
                            valorCobradoOverride: diferenca),
                    child: Text(_labelForma(forma)),
                  ),
                )),
            // Gancho Pix (Fase 4): botão desabilitado com aviso.
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: FilledButton.icon(
                onPressed: null,
                icon: const Icon(Icons.qr_code_2),
                label: const Text('Pix dinâmico (em breve)'),
              ),
            ),
          ],
        ],
      ),
    );
  }

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
