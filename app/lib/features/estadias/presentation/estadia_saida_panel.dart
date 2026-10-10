import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/confirmar_cobranca_dialog.dart';
import '../../../core/widgets/forma_pagamento_grid.dart';
import '../../../database/app_database.dart';
import '../../caixa/presentation/providers/caixa_provider.dart';
import '../../patio/domain/patio_model.dart';
import '../../patio/domain/tarifa_config.dart';
import '../../printing/data/print_templates.dart';
import '../../tickets/domain/ticket_model.dart';
import '../../tickets/presentation/providers/ticket_provider.dart';
import '../../tickets/presentation/widgets/hero_saida.dart';
import '../data/estadia_repository.dart';
import '../domain/estadia_engine.dart';
import 'estadia_acoes.dart';
import 'estadia_formatos.dart';
import 'estadia_widgets.dart';
import 'providers/estadias_provider.dart';
import 'renovar_estadia_sheet.dart';

/// Saída de ticket de hóspede (ticket com `estadiaId`). Toma o lugar da área
/// de cobrança avulsa: sem Pix na tela, sem voucher, sem pagamento online
/// (Revisão 8 — todos calculariam pelo avulso desde a entrada).
class EstadiaSaidaPanel extends ConsumerStatefulWidget {
  const EstadiaSaidaPanel({super.key, required this.ticket, required this.patio});

  final TicketModel ticket;
  final PatioModel patio;

  @override
  ConsumerState<EstadiaSaidaPanel> createState() => _EstadiaSaidaPanelState();
}

enum _Intencao { embora, continuar }

class _EstadiaSaidaPanelState extends ConsumerState<EstadiaSaidaPanel> {
  Estadia? _estadia;
  bool _carregando = true;
  _Intencao? _intencao; // nenhuma pré-marcada (design, obs. 1)
  String? _forma;
  bool _fechando = false;

  /// Dado mais velho que isto (2 ciclos rápidos) ganha o aviso de conferência.
  static const _velho = Duration(seconds: 15);

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<Estadia?> _lerLocal() =>
      ref.read(estadiaRepositoryProvider).estadia(widget.ticket.estadiaId!);

  /// Lê a cópia local; se estiver vencida (ou ausente), confere antes com a
  /// nuvem — uma renovação feita em outro aparelho pode não ter chegado ainda,
  /// e cobrar atraso de quem já renovou não tem estorno.
  Future<void> _carregar() async {
    var e = await _lerLocal();
    final vencida = e == null || e.validaAteEpoch <= DateTime.now().millisecondsSinceEpoch;
    if (vencida) {
      final patioId = await ref.read(tokenStorageProvider).readPatioId();
      if (patioId != null) {
        await ref.read(ticketsAbertosSyncProvider).puxar(patioId);
        e = await _lerLocal();
      }
    }
    if (!mounted) return;
    setState(() {
      _estadia = e;
      _carregando = false;
    });
  }

  TarifaConfig? _tarifaAtraso(Estadia e) {
    final p = widget.patio;
    final hospede = p.tarifas.where((t) => t.id == e.tarifaId).firstOrNull;
    if (hospede != null) return p.tarifaAtraso(hospede);
    final avulsas = p.tabelasVisiveis(e.tipoVeiculo);
    return avulsas.isEmpty ? null : avulsas.first;
  }

  Future<void> _sairSemCobranca() async {
    setState(() => _fechando = true);
    final user = await ref.read(tokenStorageProvider).readUser();
    if (user == null) {
      if (mounted) setState(() => _fechando = false);
      return;
    }
    await _fechar(valor: 0, forma: EstadiaRepository.formaHospede, operadorId: user.id);
  }

  Future<void> _cobrarAtraso(double valor) async {
    final forma = _forma!;
    final confirmou = await confirmarCobranca(
      context,
      titulo: 'Confirmar saída',
      linhas: [
        ('Placa', widget.ticket.placa),
        ('Atraso', 'estadia vencida'),
        ('Forma', FormaPagamentoGrid.rotulo(forma)),
      ],
      total: fmtReais(valor),
      totalRotulo: 'Atraso',
    );
    if (!confirmou || !mounted) return;
    setState(() => _fechando = true);
    final ctx = await lerContextoCobranca(ref);
    if (!mounted) return;
    if (ctx == null) {
      setState(() => _fechando = false);
      AppToast.error(context, 'Abra o caixa para cobrar o atraso.');
      return;
    }
    await _fechar(
      valor: valor,
      forma: forma,
      operadorId: ctx.operadorId,
      caixaSessaoId: ctx.caixaSessaoId,
    );
  }

  Future<void> _fechar({
    required double valor,
    required String forma,
    required String operadorId,
    String? caixaSessaoId,
  }) async {
    final saida = DateTime.now();
    final t = widget.ticket;
    final p = widget.patio;
    final sync = ref.read(syncEngineProvider);
    try {
      await ref.read(ticketRepositoryProvider).registrarSaida(
            ticketId: t.id,
            valorCalculado: valor,
            valorCobrado: valor,
            formaPagamento: forma,
            operadorSaidaId: operadorId,
            caixaSessaoId: caixaSessaoId,
            placa: t.placa,
          );
    } catch (_) {
      if (mounted) {
        setState(() => _fechando = false);
        AppToast.error(context, 'Erro ao registrar saída.');
      }
      return;
    }
    if (!mounted) return;
    ref.invalidate(ticketsAbertosProvider);
    ref.invalidate(hospedesProvider);
    if (caixaSessaoId != null) ref.invalidate(caixaSessaoNotifierProvider);
    sync.drain();
    imprimirEmSegundoPlano(
      ref,
      (printer) => PrintTemplates.reciboSaida(
        placa: t.placa,
        tipoVeiculo: t.tipoVeiculo,
        entrada: t.entrada,
        saida: saida,
        valorCobrado: valor,
        formaPagamento: forma,
        operacaoNome: p.nome,
        isIsento: valor == 0,
        cols: printer.cols,
        avancoFinal: printer.avancoFinal,
        cabecalho: p.ticketCabecalho,
        rodape: p.ticketRodape,
      ),
    );
    AppToast.success(context, 'Saída registrada!');
    context.pop();
  }

  Future<void> _renovar(Estadia e) async {
    final ok = await mostrarRenovarEstadia(
      context,
      estadia: e,
      origem: OrigemRenovacao.saida,
      carroDentro: true,
      ticketId: widget.ticket.id,
    );
    if (!ok || !mounted) return;
    AppToast.success(context, 'Estadia renovada e saída registrada!');
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    if (_carregando) return const Center(child: CircularProgressIndicator());
    final e = _estadia;
    final t = widget.ticket;
    if (e == null) return _naoEncontrada();

    final agora = DateTime.now();
    final vence = DateTime.fromMillisecondsSinceEpoch(e.validaAteEpoch);
    final tarifaAtraso = _tarifaAtraso(e);
    final atraso = EstadiaEngine.atraso(
      validaAte: vence,
      saida: agora,
      diariaValor: e.diariaValor,
      diariaHoras: e.diariaHoras,
      tarifaAtraso: tarifaAtraso,
    );
    final permanencia = _fmtDuracao(agora.difference(t.entrada));
    final hora = DateFormat('HH:mm');

    if (!atraso.vencida || atraso.dentroTolerancia) {
      return _rolagem([
        HeroSaida(
          placa: t.placa,
          caption: 'SEM COBRANÇA',
          valorLabel: fmtReais(0),
          subLabel: '$permanencia · Hóspede',
          chips: [
            const HeroChip('Hóspede', fundo: AppColors.primary, icone: iconeHospede),
            HeroChip('entrou ${hora.format(t.entrada)}'),
            HeroChip(t.tipoVeiculo),
          ],
        ),
        const SizedBox(height: 16),
        _faixaVerde(
          atraso.dentroTolerancia
              ? 'Venceu às ${hora.format(vence)} · dentro da tolerância de '
                  '${tarifaAtraso?.toleranciaMinutos ?? 0} min'
              : 'Estadia válida até ${fmtValidade(vence, agora)}',
          atraso.dentroTolerancia ? 'Sai sem pagar.' : 'Pode sair e voltar sem pagar até lá.',
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 58,
          child: FilledButton(
            onPressed: _fechando ? null : _sairSemCobranca,
            child: const Text('Confirmar saída'),
          ),
        ),
      ]);
    }

    final renovacao = EstadiaEngine.renovacao(
      validaAte: vence,
      diariaHoras: e.diariaHoras,
      diariaValor: e.diariaValor,
      diarias: 1,
      agora: agora,
      carroDentro: true,
    );
    final minimo = renovacao.minimoDiarias;
    final novaMinima = vence.add(Duration(hours: minimo * e.diariaHoras));
    final caixaAberto = ref.watch(caixaSessaoNotifierProvider).value != null;
    final conferida = ref.read(ticketsAbertosSyncProvider).ultimaConferencia;
    final velho = conferida == null || agora.difference(conferida) > _velho;

    return _rolagem([
      HeroSaida(
        placa: t.placa,
        caption: 'ESTADIA VENCIDA HÁ ${fmtDuracaoLonga(agora.difference(vence)).toUpperCase()}',
        valorLabel: 'Venceu ${hora.format(vence)}',
        subLabel: '${fmtValidade(vence, agora)} · $permanencia no pátio',
        chips: [
          const HeroChip('Vencida', fundo: AppColors.warning, icone: Icons.schedule),
          HeroChip(t.tipoVeiculo),
        ],
      ),
      if (velho) ...[
        const SizedBox(height: 10),
        Text(
          conferida == null
              ? 'Não deu para conferir a validade com a nuvem agora.'
              : 'Validade conferida com a nuvem às ${hora.format(conferida)}.',
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.warning),
        ),
      ],
      const SizedBox(height: 16),
      const Text('O hóspede…',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF374151))),
      const SizedBox(height: 8),
      _OpcaoIntencao(
        titulo: 'Vai embora',
        descricao: 'Cobra o atraso pela tabela ${tarifaAtraso?.nome ?? 'de diária'} '
            '(no máximo ${fmtReais(e.diariaValor)} a cada ${e.diariaHoras} h)',
        valor: fmtReais(atraso.valor),
        selecionada: _intencao == _Intencao.embora,
        onTap: () => setState(() => _intencao = _Intencao.embora),
      ),
      const SizedBox(height: 8),
      _OpcaoIntencao(
        titulo: 'Vai continuar hospedado',
        descricao: 'Renova e cobre o atraso · até ${fmtValidade(novaMinima, agora)}',
        valor: 'a partir de ${fmtReais(minimo * e.diariaValor)}',
        selecionada: _intencao == _Intencao.continuar,
        onTap: () => setState(() => _intencao = _Intencao.continuar),
      ),
      if (_intencao == _Intencao.embora) ...[
        const SizedBox(height: 16),
        const Text('Forma de pagamento do atraso',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant)),
        const SizedBox(height: 8),
        FormaPagamentoGrid(
          formas: widget.patio.formasPagamento,
          selecionada: _forma,
          onSelecionar: (f) => setState(() => _forma = f),
        ),
        const SizedBox(height: 16),
        if (!caixaAberto)
          const FaixaCaixaFechado()
        else
          SizedBox(
            height: 58,
            child: FilledButton(
              onPressed: (_forma == null || _fechando) ? null : () => _cobrarAtraso(atraso.valor),
              child: Text(_forma == null
                  ? 'Escolha a forma de pagamento'
                  : 'Cobrar ${fmtReais(atraso.valor)} e confirmar saída'),
            ),
          ),
      ],
      if (_intencao == _Intencao.continuar) ...[
        const SizedBox(height: 16),
        SizedBox(
          height: 58,
          child: FilledButton(onPressed: () => _renovar(e), child: const Text('Renovar…')),
        ),
      ],
    ]);
  }

  Widget _rolagem(List<Widget> filhos) => SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: filhos),
      );

  Widget _faixaVerde(String titulo, String detalhe) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.successBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primaryFill.withValues(alpha: 0.35), width: 1.5),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.check, color: AppColors.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(titulo,
                      style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF123B2A))),
                  const SizedBox(height: 3),
                  Text(detalhe, style: const TextStyle(fontSize: 13, color: AppColors.primary)),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _naoEncontrada() => _rolagem([
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.warningBg,
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Text(
            'Estadia não encontrada neste aparelho. Sincronize antes de cobrar: '
            'sem ela não dá para saber até quando o hóspede pagou.',
            style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF78350F)),
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: () {
            setState(() => _carregando = true);
            _carregar();
          },
          icon: const Icon(Icons.sync),
          label: const Text('Sincronizar agora'),
        ),
      ]);

  static String _fmtDuracao(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes % 60;
    return h > 0 ? '${h}h ${m}min' : '${m}min';
  }
}

/// Opção de intenção na saída vencida. As duas têm o MESMO peso visual:
/// cor não pode empurrar o operador para a mais cara (design, obs. 2).
class _OpcaoIntencao extends StatelessWidget {
  const _OpcaoIntencao({
    required this.titulo,
    required this.descricao,
    required this.valor,
    required this.selecionada,
    required this.onTap,
  });

  final String titulo;
  final String descricao;
  final String valor;
  final bool selecionada;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selecionada,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: selecionada ? AppColors.primaryFill : AppColors.outlineVariant,
                width: 2,
              ),
            ),
            child: Row(
              children: [
                Icon(selecionada ? Icons.radio_button_checked : Icons.radio_button_off,
                    color: selecionada ? AppColors.primaryFill : AppColors.outline),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(titulo, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 2),
                      Text(descricao,
                          style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(valor,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.onSurface)),
              ],
            ),
          ),
        ),
      );
}
