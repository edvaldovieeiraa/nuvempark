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

  @override
  void initState() {
    super.initState();
    _carregarTicket();
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
    String formaPagamento,
  ) async {
    if (_ticket == null) return;
    final ticket = _ticket!;
    final fmt = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');

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
                const Text('Total',
                    style: TextStyle(
                        fontSize: 14, color: AppColors.onSurfaceVariant)),
                Text(fmt.format(fare.valor),
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
      await _confirmar(patio, fare, formaPagamento);
    }
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

  Future<void> _confirmar(
    PatioModel patio,
    FareResult fare,
    String formaPagamento,
  ) async {
    if (_fechando || _ticket == null || _tarifaSelecionada == null) return;
    final ticket = _ticket!;
    final isLivre = formaPagamento == 'livre_passagem';
    final saida = DateTime.now();

    // Barreira final: cobrança > 0 exige caixa aberto (evita corrida).
    if (!isLivre && fare.valor > 0) {
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
      await ref.read(ticketRepositoryProvider).fecharTicket(
            ticketId: ticket.id,
            valorCalculado: fare.valor,
            valorCobrado: isLivre ? 0.0 : fare.valor,
            formaPagamento: formaPagamento,
            tabelaPrecoId: _tarifaSelecionada!.id,
          );

      // Lança a receita no caixa aberto (garantido aberto pela barreira acima).
      if (!isLivre && fare.valor > 0) {
        final sessao = await ref.read(caixaSessaoNotifierProvider.future);
        if (sessao != null) {
          await ref.read(caixaRepositoryProvider).registrarEntradaTicket(
                caixaSessaoId: sessao.id,
                ticketId: ticket.id,
                valor: fare.valor,
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
          valorCobrado: isLivre ? 0.0 : fare.valor,
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
    final valor = livre ? 0.0 : fare.valor;

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
          // Valor
          Center(
            child: Column(
              children: [
                const Text('Total a pagar', style: TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant, letterSpacing: 1)),
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
                        : () => _confirmarComDialogo(patio, fare, forma),
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
