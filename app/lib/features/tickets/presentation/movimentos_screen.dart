import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/theme/app_colors.dart';
import '../domain/ticket_model.dart';
import 'providers/ticket_provider.dart';

/// Movimentos de tickets da operação (todos os status), com busca por placa
/// e filtro por status. Somente leitura — o histórico completo vive no painel.
class MovimentosTicketsScreen extends ConsumerStatefulWidget {
  const MovimentosTicketsScreen({super.key});

  @override
  ConsumerState<MovimentosTicketsScreen> createState() =>
      _MovimentosTicketsScreenState();
}

class _MovimentosTicketsScreenState
    extends ConsumerState<MovimentosTicketsScreen> {
  static final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
  static final _diaHora = DateFormat('dd/MM HH:mm');

  final _buscaCtrl = TextEditingController();
  String _busca = '';
  String _filtro = 'todos'; // todos | aberto | fechado | cancelado

  @override
  void dispose() {
    _buscaCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(ticketsMovimentosProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Movimentos')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) =>
            const ErrorState(mensagem: 'Erro ao carregar os movimentos.'),
        data: (todos) {
          final lista = todos.where((t) {
            final okStatus = _filtro == 'todos' || t.status == _filtro;
            final okBusca =
                _busca.isEmpty || t.placa.contains(_busca.toUpperCase());
            return okStatus && okBusca;
          }).toList();

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(ticketsMovimentosProvider),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                TextField(
                  controller: _buscaCtrl,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(
                    hintText: 'Buscar placa…',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    isDense: true,
                    suffixIcon: _busca.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.close, size: 18),
                            onPressed: () {
                              _buscaCtrl.clear();
                              setState(() => _busca = '');
                            },
                          ),
                  ),
                  onChanged: (v) => setState(() => _busca = v),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _chip('Todos', 'todos'),
                      _chip('No pátio', 'aberto'),
                      _chip('Fechados', 'fechado'),
                      _chip('Cancelados', 'cancelado'),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                if (lista.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: Text('Nenhum movimento com esse filtro.',
                          style: TextStyle(color: AppColors.onSurfaceVariant)),
                    ),
                  )
                else
                  ...lista.map(_tile),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _chip(String label, String valor) {
    final sel = _filtro == valor;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: sel,
        onSelected: (_) => setState(() => _filtro = valor),
      ),
    );
  }

  Widget _tile(TicketModel t) {
    final (corStatus, bgStatus, rotuloStatus) = switch (t.status) {
      'aberto' => (AppColors.entrada, AppColors.entradaBg, 'no pátio'),
      'fechado' => (AppColors.onSurfaceVariant, AppColors.surfaceContainer, 'saiu'),
      'cancelado' => (AppColors.danger, const Color(0xFFFDECEC), 'cancelado'),
      _ => (AppColors.saida, AppColors.saidaBg, t.status),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(t.placa,
                        style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            letterSpacing: 1.5)),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: bgStatus,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(rotuloStatus,
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: corStatus)),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '${t.tipoVeiculo} · entrou ${_diaHora.format(t.entrada)}'
                  '${t.saida != null ? ' · saiu ${_diaHora.format(t.saida!)}' : ''}',
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.onSurfaceVariant),
                ),
              ],
            ),
          ),
          if (t.valorCobrado != null)
            Text(_moeda.format(t.valorCobrado),
                style: const TextStyle(
                    fontWeight: FontWeight.w800, fontSize: 14)),
        ],
      ),
    );
  }
}
