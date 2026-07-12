import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../database/app_database.dart';
import '../../caixa/presentation/providers/caixa_provider.dart';
import 'providers/mensalistas_provider.dart';

final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
const _meses = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const _formas = ['dinheiro', 'pix', 'cartao'];

String _competenciaAtual() {
  final now = DateTime.now();
  return '${now.year}-${now.month.toString().padLeft(2, '0')}-01';
}

String _labelCompetencia(String comp) {
  final p = comp.split('-');
  final mes = int.tryParse(p.length > 1 ? p[1] : '') ?? 1;
  return '${_meses[(mes - 1).clamp(0, 11)]}/${p[0]}';
}

List<String> _ultimasCompetencias(int n) {
  final now = DateTime.now();
  return List.generate(n, (i) {
    final d = DateTime(now.year, now.month - i, 1);
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-01';
  });
}

class MensalistasScreen extends ConsumerStatefulWidget {
  const MensalistasScreen({super.key});

  @override
  ConsumerState<MensalistasScreen> createState() => _MensalistasScreenState();
}

class _MensalistasScreenState extends ConsumerState<MensalistasScreen> {
  String _busca = '';

  @override
  Widget build(BuildContext context) {
    final dataAsync = ref.watch(mensalistasDataProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mensalistas')),
      body: dataAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erro ao carregar: $e')),
        data: (data) {
          final q = _busca.trim().toUpperCase();
          final clientes = data.clientes.where((c) {
            if (q.isEmpty) return true;
            if (c.nome.toUpperCase().contains(q)) return true;
            final placas = data.placasPorCliente[c.id] ?? const [];
            return placas.any((p) => p.toUpperCase().contains(q));
          }).toList();

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: TextField(
                  onChanged: (v) => setState(() => _busca = v),
                  decoration: InputDecoration(
                    hintText: 'Buscar por nome ou placa…',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: AppColors.surfaceContainer,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  ),
                ),
              ),
              Expanded(
                child: clientes.isEmpty
                    ? const _Vazio()
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                        itemCount: clientes.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final c = clientes[i];
                          final pagas =
                              data.competenciasPorCliente[c.id] ?? const {};
                          final placas =
                              data.placasPorCliente[c.id] ?? const [];
                          return _ClienteCard(
                            cliente: c,
                            pagas: pagas,
                            placas: placas,
                            onTap: () => _abrirDetalhe(c, pagas),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _abrirDetalhe(PatioCliente c, Set<String> pagas) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _ClienteDetalheSheet(cliente: c, pagas: pagas),
    );
    // Ao voltar, recarrega (pode ter registrado pagamento).
    ref.invalidate(mensalistasDataProvider);
  }
}

/// Badge de status financeiro do cliente (a partir do Drift local).
Widget _badge(PatioCliente c, Set<String> pagas) {
  if (c.planoTipo == 'credenciado') {
    return _chip('Credenciado', AppColors.onSurfaceVariant);
  }
  if (pagas.contains(_competenciaAtual())) {
    return _chip('Em dia', AppColors.success);
  }
  final diaVenc = c.vencimentoEpoch != null
      ? DateTime.fromMillisecondsSinceEpoch(c.vencimentoEpoch!).day
      : 10;
  final hoje = DateTime.now().day;
  if (hoje <= diaVenc) {
    final x = diaVenc - hoje;
    return _chip(
      x == 0 ? 'Vence hoje' : 'Vence em $x ${x == 1 ? 'dia' : 'dias'}',
      AppColors.saida,
    );
  }
  return _chip('Atrasado', AppColors.danger);
}

Widget _chip(String txt, Color cor) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: cor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: cor.withValues(alpha: 0.3)),
      ),
      child: Text(txt,
          style: TextStyle(
              fontSize: 11, fontWeight: FontWeight.w700, color: cor)),
    );

class _ClienteCard extends StatelessWidget {
  const _ClienteCard({
    required this.cliente,
    required this.pagas,
    required this.placas,
    required this.onTap,
  });

  final PatioCliente cliente;
  final Set<String> pagas;
  final List<String> placas;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
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
                      Flexible(
                        child: Text(cliente.nome,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 15)),
                      ),
                      const SizedBox(width: 8),
                      _badge(cliente, pagas),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    [
                      cliente.planoNome ?? 'sem plano',
                      if (placas.isNotEmpty) placas.join(', '),
                    ].join(' · '),
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.onSurfaceVariant),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}

class _Vazio extends StatelessWidget {
  const _Vazio();
  @override
  Widget build(BuildContext context) => const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text('Nenhum cliente encontrado.',
              style: TextStyle(color: AppColors.onSurfaceVariant)),
        ),
      );
}

/// Detalhe do cliente: histórico local + botão de registrar pagamento.
class _ClienteDetalheSheet extends ConsumerStatefulWidget {
  const _ClienteDetalheSheet({required this.cliente, required this.pagas});
  final PatioCliente cliente;
  final Set<String> pagas;

  @override
  ConsumerState<_ClienteDetalheSheet> createState() =>
      _ClienteDetalheSheetState();
}

class _ClienteDetalheSheetState extends ConsumerState<_ClienteDetalheSheet> {
  late Future<List<MensalidadePagamento>> _historico;

  @override
  void initState() {
    super.initState();
    _historico = ref
        .read(mensalidadeRepositoryProvider)
        .historico(widget.cliente.id);
  }

  void _recarregar() {
    setState(() {
      _historico = ref
          .read(mensalidadeRepositoryProvider)
          .historico(widget.cliente.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.cliente;
    final credenciado = c.planoTipo == 'credenciado';
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(c.nome,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w800)),
              ),
              _badge(c, widget.pagas),
            ],
          ),
          const SizedBox(height: 2),
          Text(c.planoNome ?? 'sem plano',
              style: const TextStyle(color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 16),
          const Text('Pagamentos',
              style: TextStyle(
                  fontSize: 11,
                  letterSpacing: 1,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 240),
            child: FutureBuilder<List<MensalidadePagamento>>(
              future: _historico,
              builder: (context, snap) {
                if (!snap.hasData) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(
                        child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2))),
                  );
                }
                final lista = snap.data!;
                if (lista.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('Nenhum pagamento registrado ainda.',
                        style: TextStyle(color: AppColors.onSurfaceVariant)),
                  );
                }
                return ListView.separated(
                  shrinkWrap: true,
                  itemCount: lista.length,
                  separatorBuilder: (_, _) => const Divider(height: 12),
                  itemBuilder: (_, i) {
                    final p = lista[i];
                    return Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_labelCompetencia(p.competencia),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700)),
                              Text(
                                '${p.formaPagamento ?? '—'} · ${p.origem}',
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.onSurfaceVariant),
                              ),
                            ],
                          ),
                        ),
                        Text(_moeda.format(p.valor),
                            style: const TextStyle(
                                fontWeight: FontWeight.w800)),
                      ],
                    );
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          if (credenciado)
            const Text(
              'Credenciado não paga mensalidade.',
              style: TextStyle(color: AppColors.onSurfaceVariant),
            )
          else
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _registrar,
                icon: const Icon(Icons.payments_outlined),
                label: const Text('Registrar pagamento'),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _registrar() async {
    final caixa = ref.read(caixaSessaoNotifierProvider).value;
    final messenger = ScaffoldMessenger.of(context);
    if (caixa == null) {
      messenger.showSnackBar(const SnackBar(
          content: Text('Abra o caixa para registrar um pagamento.')));
      if (mounted) {
        Navigator.pop(context);
        context.push(Routes.caixa);
      }
      return;
    }
    final registrou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _RegistrarSheet(
        cliente: widget.cliente,
        caixaSessaoId: caixa.id,
        pagas: widget.pagas,
      ),
    );
    if (registrou == true) _recarregar();
  }
}

/// Modal de registro de pagamento.
class _RegistrarSheet extends ConsumerStatefulWidget {
  const _RegistrarSheet({
    required this.cliente,
    required this.caixaSessaoId,
    required this.pagas,
  });
  final PatioCliente cliente;
  final String caixaSessaoId;
  final Set<String> pagas;

  @override
  ConsumerState<_RegistrarSheet> createState() => _RegistrarSheetState();
}

class _RegistrarSheetState extends ConsumerState<_RegistrarSheet> {
  late String _competencia;
  late final TextEditingController _valor;
  final TextEditingController _obs = TextEditingController();
  String _forma = _formas.first;
  bool _salvando = false;

  @override
  void initState() {
    super.initState();
    _competencia = _competenciaAtual();
    _valor = TextEditingController(
      text: (widget.cliente.planoValor ?? 0).toStringAsFixed(2),
    );
  }

  @override
  void dispose() {
    _valor.dispose();
    _obs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final duplicado = widget.pagas.contains(_competencia);
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Registrar pagamento — ${widget.cliente.nome}',
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _competencia,
            decoration: const InputDecoration(
                labelText: 'Competência', border: OutlineInputBorder()),
            items: _ultimasCompetencias(6)
                .map((c) => DropdownMenuItem(
                    value: c, child: Text(_labelCompetencia(c))))
                .toList(),
            onChanged: (v) => setState(() => _competencia = v ?? _competencia),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _valor,
            keyboardType:
                const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
                labelText: 'Valor (R\$)', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _forma,
            decoration: const InputDecoration(
                labelText: 'Forma de pagamento',
                border: OutlineInputBorder()),
            items: const [
              DropdownMenuItem(value: 'dinheiro', child: Text('Dinheiro')),
              DropdownMenuItem(value: 'pix', child: Text('PIX')),
              DropdownMenuItem(value: 'cartao', child: Text('Cartão')),
            ],
            onChanged: (v) => setState(() => _forma = v ?? _forma),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _obs,
            decoration: const InputDecoration(
                labelText: 'Observação (opcional)',
                border: OutlineInputBorder()),
          ),
          if (duplicado) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.warning_amber_rounded,
                    color: AppColors.saida, size: 18),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Já há um pagamento de ${_labelCompetencia(_competencia)}. Você pode registrar outro.',
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.saida),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _salvando ? null : _confirmar,
              child: _salvando
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Confirmar pagamento'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmar() async {
    final valor = double.tryParse(_valor.text.replaceAll(',', '.')) ?? 0;
    final messenger = ScaffoldMessenger.of(context);
    if (valor <= 0) {
      messenger
          .showSnackBar(const SnackBar(content: Text('Informe um valor válido.')));
      return;
    }
    setState(() => _salvando = true);

    final storage = ref.read(tokenStorageProvider);
    final user = await storage.readUser();
    final patioId = await storage.readPatioId();
    if (user == null || patioId == null) {
      if (mounted) setState(() => _salvando = false);
      return;
    }

    await ref.read(mensalidadeRepositoryProvider).registrarPagamento(
          patioId: patioId,
          clienteId: widget.cliente.id,
          clienteNome: widget.cliente.nome,
          planoId: widget.cliente.planoId,
          competencia: _competencia,
          valor: valor,
          formaPagamento: _forma,
          caixaSessaoId: widget.caixaSessaoId,
          operadorId: user.id,
          operadorNome: user.nome,
          observacao: _obs.text.trim().isEmpty ? null : _obs.text.trim(),
        );

    // Sobe para a nuvem em segundo plano (best-effort).
    Future.microtask(() => ref.read(syncEngineProvider).drain());

    if (!mounted) return;
    messenger.showSnackBar(
        SnackBar(content: Text('Pagamento de ${_moeda.format(valor)} registrado.')));
    Navigator.pop(context, true);
  }
}
