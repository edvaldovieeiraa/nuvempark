import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/brisa.dart';
import '../../../database/app_database.dart';
import '../../estadias/presentation/converter_estadia_sheet.dart';
import '../../estadias/presentation/estadia_ficha_sheet.dart';
import '../../estadias/presentation/estadia_formatos.dart';
import '../../estadias/presentation/estadia_widgets.dart';
import '../../estadias/presentation/providers/estadias_provider.dart';
import '../../printing/data/print_templates.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../../tickets/domain/ticket_model.dart';
import '../../tickets/presentation/providers/ticket_provider.dart';
import '../domain/tarifa_config.dart';
import 'detalhe_veiculo_sheet.dart';
import 'providers/patio_provider.dart';

/// Aba Pátio: todos os veículos dentro do pátio agora, com busca por placa
/// e permanência. Tocar num veículo abre o detalhe dele (com a foto de entrada).
class PatioTab extends ConsumerStatefulWidget {
  const PatioTab({super.key});

  @override
  ConsumerState<PatioTab> createState() => _PatioTabState();
}

class _PatioTabState extends ConsumerState<PatioTab> {
  static final _hora = DateFormat('HH:mm');

  final _buscaCtrl = TextEditingController();
  String _busca = '';
  bool _soHospedes = false;

  @override
  void dispose() {
    _buscaCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final abertos =
        ref.watch(ticketsAbertosProvider).value ?? const <TicketModel>[];
    final patio = ref.watch(patioNotifierProvider).value;
    final filtrados = _busca.isEmpty
        ? abertos
        : abertos
            .where((t) => t.placa.contains(_busca.toUpperCase()))
            .toList();
    // Estadia de hóspede: o filtro só aparece em pátio que trabalha com ela.
    final hospedes = ref.watch(hospedesProvider).value ?? const <ItemHospede>[];
    final temHospede =
        hospedes.isNotEmpty || (patio?.tarifas.any((t) => t.isHospede) ?? false);
    final soHospedes = _soHospedes && temHospede;
    final hospedesFiltrados = _busca.isEmpty
        ? hospedes
        : hospedes.where((h) => h.estadia.placa.contains(_busca.toUpperCase())).toList();
    final estadiaPorId = {for (final h in hospedes) h.estadia.id: h.estadia};

    // Brisa: sem AppBar — o título é conteúdo e rola com a lista.
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(ticketsAbertosProvider);
            ref.invalidate(hospedesProvider);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24 + alturaNavBrisa),
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text('Pátio',
                        style: TextStyle(
                            fontSize: 24,
                            height: 1.15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.onSurface)),
                  ),
                  _pilulaBotao(
                    texto: 'Movimentos',
                    icone: Icons.history,
                    onTap: () => context.push(Routes.movimentos),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '${abertos.length}${patio != null && patio.qtdVagas > 0 ? '/${patio.qtdVagas}' : ''}',
                      style: const TextStyle(
                          fontSize: 13,
                          height: 1,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _busca_(),
              const SizedBox(height: 12),
              if (temHospede) ...[
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      label: Text('No pátio · ${abertos.length}'),
                      selected: !soHospedes,
                      onSelected: (_) => setState(() => _soHospedes = false),
                    ),
                    ChoiceChip(
                      label: Text('Hóspedes · ${hospedes.length}'),
                      selected: soHospedes,
                      onSelected: (_) => setState(() => _soHospedes = true),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
              if (soHospedes)
                if (hospedesFiltrados.isEmpty)
                  _vazio(busca: hospedes.isNotEmpty, hospedes: true)
                else
                  ...hospedesFiltrados.map(_tileHospede)
              else if (abertos.isEmpty)
                _vazio()
              else if (filtrados.isEmpty)
                _vazio(busca: true)
              else
                ...filtrados.map((t) => _tileVeiculo(t, estadiaPorId)),
            ],
          ),
        ),
      ),
    );
  }

  /// Busca do Brisa: pílula branca de 48px com sombra — não é um TextField
  /// com moldura, é uma superfície.
  Widget _busca_() {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [
          BoxShadow(
              color: AppColors.shadow, blurRadius: 10, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          const Icon(Icons.search, size: 20, color: AppColors.onSurfaceVariant),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _buscaCtrl,
              textCapitalization: TextCapitalization.characters,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.84,
                color: AppColors.onSurface,
              ),
              decoration: const InputDecoration(
                hintText: 'Buscar placa',
                hintStyle: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0,
                  color: AppColors.onSurfaceVariant,
                ),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
              onChanged: (v) => setState(() => _busca = v),
            ),
          ),
          if (_busca.isNotEmpty)
            InkWell(
              onTap: () {
                _buscaCtrl.clear();
                setState(() => _busca = '');
              },
              borderRadius: BorderRadius.circular(999),
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Icon(Icons.close, size: 18, color: AppColors.outline),
              ),
            ),
        ],
      ),
    );
  }

  /// Pílula-botão branca do cabeçalho do Brisa.
  Widget _pilulaBotao({
    required String texto,
    required IconData icone,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(999),
          boxShadow: const [
            BoxShadow(
                color: AppColors.shadow, blurRadius: 8, offset: Offset(0, 2)),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icone, size: 16, color: AppColors.onSurface),
            const SizedBox(width: 5),
            Text(texto,
                style: const TextStyle(
                    fontSize: 12,
                    height: 1,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface)),
          ],
        ),
      ),
    );
  }

  /// Card de veículo do Brisa. O botão de reimprimir SAIU daqui de propósito —
  /// não sumiu: mudou para o sheet de detalhe (um toque no card), que é onde o
  /// protótipo o coloca. Numa lista longa, uma impressora por linha é um
  /// disparo acidental esperando acontecer.
  Widget _tileVeiculo(TicketModel t, Map<String, Estadia> estadias) {
    final (durBg, durCor) = _faixaPermanencia(t.entrada);
    final estadia = t.estadiaId != null ? estadias[t.estadiaId] : null;
    final patio = ref.read(patioNotifierProvider).value;
    final List<TarifaConfig> tabelasHospede = patio == null
        ? const []
        : patio.tabelasEntrada(t.tipoVeiculo).where((x) => x.isHospede).toList();
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => mostrarDetalheVeiculo(
          context,
          t,
          onReimprimir: () => _reimprimir(t),
          // Check-in depois da entrada: avulso aberto vira estadia (Revisão 6).
          onContratarEstadia: t.origem == 'avulso' && tabelasHospede.isNotEmpty
              ? () => mostrarConverterEstadia(
                    context,
                    ticket: t,
                    tabelasHospede: tabelasHospede,
                  )
              : null,
        ),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(
                  color: AppColors.shadow, blurRadius: 10, offset: Offset(0, 2)),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainer,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  t.tipoVeiculo == 'moto'
                      ? Icons.two_wheeler
                      : Icons.directions_car,
                  size: 22,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.placa,
                        style: const TextStyle(
                            fontSize: 15.5,
                            height: 1.3,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.78,
                            color: AppColors.onSurface)),
                    Text(
                      '${t.tipoVeiculo} · entrou ${_hora.format(t.entrada)}',
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
              const SizedBox(width: 8),
              // Hóspede: a pílula diz até quando pagou, não há quanto tempo
              // está — 30 h de hóspede não é conta alta (design, Estados).
              if (estadia != null)
                _pilulaEstadia(estadia)
              else
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                  decoration: BoxDecoration(
                    color: durBg,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(_permanencia(t.entrada),
                      style: TextStyle(
                          fontSize: 12,
                          height: 1,
                          fontWeight: FontWeight.w800,
                          color: durCor)),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// Cor da pílula por faixa de permanência — o semáforo do Brisa:
  /// até 1h verde · até 2h âmbar · acima disso laranja. É o que faz o operador
  /// bater o olho na lista e achar o carro esquecido.
  static (Color, Color) _faixaPermanencia(DateTime entrada) {
    final min = DateTime.now().difference(entrada).inMinutes;
    if (min < 60) return (AppColors.primaryContainer, AppColors.primary);
    if (min < 120) return (AppColors.warningBg, AppColors.warning);
    return (AppColors.saidaBg, AppColors.saida);
  }

  /// Pílula de uma linha: "até dom 14:30" (verde, cama) ou "venceu qua 18:00"
  /// (âmbar, relógio). Dia da semana perto de hoje, dd/mm longe (obs. 10).
  Widget _pilulaEstadia(Estadia e) {
    final agora = DateTime.now();
    final vence = DateTime.fromMillisecondsSinceEpoch(e.validaAteEpoch);
    final vencida = !vence.isAfter(agora);
    final cor = vencida ? const Color(0xFF78350F) : AppColors.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: vencida ? AppColors.warningBg : AppColors.primaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(vencida ? Icons.schedule : iconeHospede, size: 14, color: cor),
          const SizedBox(width: 4),
          Text('${vencida ? 'venceu' : 'até'} ${fmtValidadeCurta(vence, agora)}',
              style: TextStyle(fontSize: 12, height: 1, fontWeight: FontWeight.w800, color: cor)),
        ],
      ),
    );
  }

  /// Linha da aba Hóspedes: toca e abre a ficha da estadia.
  Widget _tileHospede(ItemHospede h) {
    final e = h.estadia;
    final vencida = h.vencida(DateTime.now());
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => mostrarFichaEstadia(context, h),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: Offset(0, 2)),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: vencida ? AppColors.warningBg : AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(vencida ? Icons.schedule : iconeHospede,
                    size: 22, color: vencida ? AppColors.warning : AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(e.placa,
                        style: const TextStyle(
                            fontSize: 15.5,
                            height: 1.3,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.78,
                            color: AppColors.onSurface)),
                    Text('${e.tipoVeiculo} · ${h.dentro ? 'no pátio' : 'fora do pátio'}',
                        style: const TextStyle(
                            fontSize: 12, height: 1.3, color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
              _pilulaEstadia(e),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right, color: AppColors.outline),
            ],
          ),
        ),
      ),
    );
  }

  /// Estado vazio do Brisa. Serve a pátio vazio, busca sem resultado e
  /// aba Hóspedes vazia — antes o segundo era um texto solto, sem a moldura
  /// do card, e parecia um erro.
  Widget _vazio({bool busca = false, bool hospedes = false}) => Container(
        padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
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
            Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(
                color: AppColors.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(
                  busca
                      ? Icons.search_off
                      : hospedes
                          ? iconeHospede
                          : Icons.local_parking,
                  size: 26,
                  color: AppColors.primary),
            ),
            const SizedBox(height: 10),
            Text(
                busca
                    ? 'Nenhuma placa encontrada'
                    : hospedes
                        ? 'Nenhuma estadia ativa'
                        : 'Pátio vazio',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 15,
                    height: 1.3,
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface)),
            const SizedBox(height: 3),
            Text(
                busca
                    ? 'confira a busca ou registre uma entrada'
                    : hospedes
                        ? 'as estadias contratadas aparecem aqui'
                        : 'os veículos aparecem aqui assim que entram',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 12.5,
                    height: 1.4,
                    fontWeight: FontWeight.w500,
                    color: AppColors.onSurfaceVariant)),
          ],
        ),
      );

  /// Reimprime o cupom de entrada do veículo (2ª via — mesmo QR e dados).
  Future<void> _reimprimir(TicketModel t) async {
    final printer = await ref
        .read(printerNotifierProvider.future)
        .catchError((_) => const PrinterState());
    if (!printer.temImpressora) {
      if (mounted) {
        AppToast.error(
            context, 'Nenhuma impressora configurada. Veja em Config.');
      }
      return;
    }
    final patio = ref.read(patioNotifierProvider).value;
    final bytes = PrintTemplates.ticketEntrada(
      ticketId: t.id,
      placa: t.placa,
      tipoVeiculo: t.tipoVeiculo,
      entrada: t.entrada,
      operacaoNome: patio?.nome ?? 'NuvemPark',
      cols: printer.cols,
      avancoFinal: printer.avancoFinal,
      cabecalho: patio?.ticketCabecalho ?? const [],
      rodape: patio?.ticketRodape ?? const [],
    );
    final ok = await ref.read(printerNotifierProvider.notifier).print(bytes);
    if (!mounted) return;
    if (ok) {
      AppToast.success(context, 'Ticket de ${t.placa} reimpresso.');
    } else {
      AppToast.error(context, 'Falha ao imprimir. Verifique a impressora.');
    }
  }

  static String _permanencia(DateTime entrada) {
    final min = DateTime.now().difference(entrada).inMinutes;
    if (min < 60) return '${min}min';
    final h = min ~/ 60;
    if (h < 24) return '${h}h${(min % 60).toString().padLeft(2, '0')}';
    return '${h ~/ 24}d ${h % 24}h';
  }
}
