import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/brisa.dart';
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

String _mesCompetencia(String comp) {
  final p = comp.split('-');
  final mes = int.tryParse(p.length > 1 ? p[1] : '') ?? 1;
  return _meses[(mes - 1).clamp(0, 11)];
}

List<String> _ultimasCompetencias(int n) {
  final now = DateTime.now();
  return List.generate(n, (i) {
    final d = DateTime(now.year, now.month - i, 1);
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-01';
  });
}

String _fmtVenc(int epoch) =>
    DateFormat('dd/MM/yyyy').format(DateTime.fromMillisecondsSinceEpoch(epoch));

String _iniciais(String nome) {
  final partes =
      nome.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty).toList();
  if (partes.isEmpty) return '?';
  if (partes.length == 1) {
    return partes.first.substring(0, 1).toUpperCase();
  }
  return (partes.first.substring(0, 1) + partes.last.substring(0, 1))
      .toUpperCase();
}

/// Par (fundo, tinta) do avatar — variedade determinística dentro da paleta
/// Brisa, para a lista não virar uma coluna de círculos idênticos.
(Color, Color) _avatarCores(String nome) {
  const pares = [
    (AppColors.primaryContainer, AppColors.primary),
    (AppColors.warningBg, AppColors.warning),
    (AppColors.surfaceContainerHigh, AppColors.onSurface),
    (AppColors.dangerBg, AppColors.danger),
    (AppColors.surfaceContainerHighest, AppColors.primary),
  ];
  return pares[nome.hashCode.abs() % pares.length];
}

/// Status de mensalidade a partir da DATA de vencimento (rolante) — o pagamento
/// avança o vencimento, então "em dia" = vencimento no futuro.
///
/// `categoria` alimenta os filtros da lista; o rótulo + tripleto bg/fg pintam a
/// pílula.
class _Status {
  const _Status(this.rotulo, this.fg, this.bg, this.categoria);
  final String rotulo;
  final Color fg;
  final Color bg;
  final String categoria;
}

_Status _statusDe(PatioCliente c) {
  if (c.planoTipo == 'credenciado') {
    return const _Status('Credenciado', AppColors.onSurfaceVariant,
        AppColors.surfaceContainer, 'credenciado');
  }
  if (c.vencimentoEpoch == null) {
    return const _Status('Sem vencimento', AppColors.onSurfaceVariant,
        AppColors.surfaceContainer, 'semvenc');
  }
  final venc = DateTime.fromMillisecondsSinceEpoch(c.vencimentoEpoch!);
  final hoje = DateTime.now();
  final dias = DateTime(venc.year, venc.month, venc.day)
      .difference(DateTime(hoje.year, hoje.month, hoje.day))
      .inDays;
  if (dias < 0) {
    final atraso = -dias;
    final txt = atraso >= 45
        ? 'Atrasado há ${(atraso / 30).round()} meses'
        : 'Atrasado há $atraso ${atraso == 1 ? 'dia' : 'dias'}';
    return _Status(txt, AppColors.danger, AppColors.dangerBg, 'atrasado');
  }
  if (dias <= 7) {
    return _Status(
      dias == 0 ? 'Vence hoje' : 'Vence em $dias ${dias == 1 ? 'dia' : 'dias'}',
      AppColors.warning,
      AppColors.warningBg,
      'vence',
    );
  }
  return const _Status('Em dia', AppColors.success, AppColors.successBg, 'emdia');
}

/// Pílula de status compacta (badge da linha e do cabeçalho dos sheets).
Widget _pilulaStatus(_Status s, {bool grande = false}) => Container(
      padding: EdgeInsets.symmetric(
          horizontal: grande ? 12 : 10, vertical: grande ? 7 : 5),
      decoration: BoxDecoration(
        color: s.bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(s.rotulo,
          style: TextStyle(
              fontSize: grande ? 12 : 11,
              height: 1,
              fontWeight: FontWeight.w700,
              color: s.fg)),
    );

/// Handle verde-claro do topo dos sheets do Brisa.
Widget _handleSheet() => Center(
      child: Container(
        width: 44,
        height: 5,
        margin: const EdgeInsets.only(top: 12, bottom: 6),
        decoration: BoxDecoration(
          color: AppColors.primaryContainer,
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    );

const _shapeSheet = RoundedRectangleBorder(
  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
);

class MensalistasScreen extends ConsumerStatefulWidget {
  const MensalistasScreen({super.key});

  @override
  ConsumerState<MensalistasScreen> createState() => _MensalistasScreenState();
}

class _MensalistasScreenState extends ConsumerState<MensalistasScreen> {
  final _buscaCtrl = TextEditingController();
  String _busca = '';
  String _filtro = 'todos'; // todos | emdia | vence | atrasado

  @override
  void dispose() {
    _buscaCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dataAsync = ref.watch(mensalistasDataProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: appBarBrisa(context, 'Mensalistas'),
      body: dataAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erro ao carregar: $e')),
        data: (data) {
          final q = _busca.trim().toUpperCase();
          final clientes = data.clientes.where((c) {
            // Busca por nome ou placa.
            if (q.isNotEmpty) {
              final placas = data.placasPorCliente[c.id] ?? const [];
              final bate = c.nome.toUpperCase().contains(q) ||
                  placas.any((p) => p.toUpperCase().contains(q));
              if (!bate) return false;
            }
            // Filtro por status (derivado dos mesmos dados — sem novo provider).
            if (_filtro != 'todos' && _statusDe(c).categoria != _filtro) {
              return false;
            }
            return true;
          }).toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            children: [
              _busca_(),
              const SizedBox(height: 10),
              _filtros(),
              const SizedBox(height: 12),
              if (clientes.isEmpty)
                _Vazio(comBusca: q.isNotEmpty || _filtro != 'todos')
              else
                ...clientes.map((c) {
                  final pagas =
                      data.competenciasPorCliente[c.id] ?? const <String>{};
                  final placas = data.placasPorCliente[c.id] ?? const [];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _ClienteCard(
                      cliente: c,
                      placas: placas,
                      onTap: () => _abrirDetalhe(c, pagas),
                    ),
                  );
                }),
              const SizedBox(height: 2),
              _dicaCard(),
            ],
          );
        },
      ),
    );
  }

  /// Busca do Brisa: pílula branca de 48px com sombra — uma superfície, não uma
  /// moldura de TextField.
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
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurface,
              ),
              decoration: const InputDecoration(
                hintText: 'Buscar por nome ou placa',
                hintStyle: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
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

  Widget _filtros() {
    const itens = [
      ('todos', 'Todos'),
      ('emdia', 'Em dia'),
      ('vence', 'A vencer'),
      ('atrasado', 'Atrasados'),
    ];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final (valor, rotulo) in itens)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _chipFiltro(valor, rotulo),
            ),
        ],
      ),
    );
  }

  Widget _chipFiltro(String valor, String rotulo) {
    final sel = _filtro == valor;
    return GestureDetector(
      onTap: () {
        if (_filtro != valor) setState(() => _filtro = valor);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: sel ? AppColors.primaryFill : AppColors.surface,
          borderRadius: BorderRadius.circular(999),
          boxShadow: const [
            BoxShadow(
                color: AppColors.shadow, blurRadius: 6, offset: Offset(0, 1)),
          ],
        ),
        child: Text(rotulo,
            style: TextStyle(
                fontSize: 12,
                height: 1,
                fontWeight: FontWeight.w700,
                color: sel ? Colors.white : AppColors.onSurfaceVariant)),
      ),
    );
  }

  Widget _dicaCard() => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.primaryContainer,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            const Icon(Icons.payments_outlined,
                size: 20, color: AppColors.primary),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Toque no cliente para registrar o pagamento do mês',
                style: TextStyle(
                    fontSize: 12.5,
                    height: 1.4,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary),
              ),
            ),
          ],
        ),
      );

  Future<void> _abrirDetalhe(PatioCliente c, Set<String> pagas) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: _shapeSheet,
      builder: (_) => _ClienteDetalheSheet(cliente: c, pagas: pagas),
    );
    // Ao voltar, recarrega (pode ter registrado pagamento).
    ref.invalidate(mensalistasDataProvider);
  }
}

class _ClienteCard extends StatelessWidget {
  const _ClienteCard({
    required this.cliente,
    required this.placas,
    required this.onTap,
  });

  final PatioCliente cliente;
  final List<String> placas;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final status = _statusDe(cliente);
    final (avBg, avFg) = _avatarCores(cliente.nome);
    final sub = [
      cliente.planoNome ?? 'sem plano',
      if (placas.isNotEmpty) placas.join(', '),
    ].join(' · ');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
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
              alignment: Alignment.center,
              decoration: BoxDecoration(color: avBg, shape: BoxShape.circle),
              child: Text(_iniciais(cliente.nome),
                  style: TextStyle(
                      fontSize: 14,
                      height: 1,
                      fontWeight: FontWeight.w800,
                      color: avFg)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(cliente.nome,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 14.5,
                          height: 1.3,
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface)),
                  Text(sub,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12,
                          height: 1.35,
                          fontWeight: FontWeight.w500,
                          color: AppColors.onSurfaceVariant)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _pilulaStatus(status),
                if (cliente.vencimentoEpoch != null) ...[
                  const SizedBox(height: 4),
                  Text('vence ${_fmtVenc(cliente.vencimentoEpoch!)}',
                      style: const TextStyle(
                          fontSize: 10.5,
                          height: 1,
                          fontWeight: FontWeight.w500,
                          color: AppColors.outline)),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Vazio extends StatelessWidget {
  const _Vazio({required this.comBusca});
  final bool comBusca;

  @override
  Widget build(BuildContext context) => Container(
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
              child: Icon(comBusca ? Icons.search_off : Icons.groups_outlined,
                  size: 26, color: AppColors.primary),
            ),
            const SizedBox(height: 10),
            Text(comBusca ? 'Nenhum cliente encontrado' : 'Sem mensalistas',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 15,
                    height: 1.3,
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface)),
            const SizedBox(height: 3),
            Text(
                comBusca
                    ? 'confira a busca ou o filtro selecionado'
                    : 'os mensalistas cadastrados aparecem aqui',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 12.5,
                    height: 1.4,
                    fontWeight: FontWeight.w500,
                    color: AppColors.onSurfaceVariant)),
          ],
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
    _historico =
        ref.read(mensalidadeRepositoryProvider).historico(widget.cliente.id);
  }

  void _recarregar() {
    setState(() {
      _historico =
          ref.read(mensalidadeRepositoryProvider).historico(widget.cliente.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.cliente;
    final credenciado = c.planoTipo == 'credenciado';
    final status = _statusDe(c);
    final (avBg, avFg) = _avatarCores(c.nome);
    final sub = [
      c.planoNome ?? 'sem plano',
      if (c.diaVencimento != null) 'todo dia ${c.diaVencimento}',
    ].join(' · ');

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _handleSheet(),
          const SizedBox(height: 6),
          // Cabeçalho: avatar + nome + sub + pílula de status.
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: avBg, shape: BoxShape.circle),
                child: Text(_iniciais(c.nome),
                    style: TextStyle(
                        fontSize: 14,
                        height: 1,
                        fontWeight: FontWeight.w800,
                        color: avFg)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.nome,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 16,
                            height: 1.25,
                            fontWeight: FontWeight.w800,
                            color: AppColors.onSurface)),
                    Text(sub,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12,
                            height: 1.3,
                            fontWeight: FontWeight.w500,
                            color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _pilulaStatus(status, grande: true),
            ],
          ),
          if (c.vencimentoEpoch != null) ...[
            const SizedBox(height: 14),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Próximo vencimento',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.onSurfaceVariant)),
                  Text(_fmtVenc(c.vencimentoEpoch!),
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 18),
          const RotuloBrisa('PAGAMENTOS'),
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
                        style: TextStyle(
                            fontSize: 13, color: AppColors.onSurfaceVariant)),
                  );
                }
                return ListView.separated(
                  shrinkWrap: true,
                  itemCount: lista.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (_, i) => _linhaPagamento(lista[i]),
                );
              },
            ),
          ),
          const SizedBox(height: 18),
          if (credenciado)
            Container(
              width: double.infinity,
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainer,
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Text('Credenciado não paga mensalidade.',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurfaceVariant)),
            )
          else
            _botaoCta(
              icone: Icons.payments_outlined,
              rotulo: 'Registrar pagamento',
              onTap: _registrar,
            ),
        ],
      ),
    );
  }

  Widget _linhaPagamento(MensalidadePagamento p) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_labelCompetencia(p.competencia),
                      style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface)),
                  const SizedBox(height: 1),
                  Text('${p.formaPagamento ?? '—'} · ${p.origem}',
                      style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                          color: AppColors.onSurfaceVariant)),
                ],
              ),
            ),
            Text(_moeda.format(p.valor),
                style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface)),
          ],
        ),
      );

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
      backgroundColor: AppColors.surface,
      shape: _shapeSheet,
      builder: (_) => _RegistrarSheet(
        cliente: widget.cliente,
        caixaSessaoId: caixa.id,
        pagas: widget.pagas,
      ),
    );
    if (registrou == true) _recarregar();
  }
}

/// CTA verde do Brisa (pílula preenchida, texto branco).
Widget _botaoCta({
  required IconData icone,
  required String rotulo,
  required VoidCallback? onTap,
  Widget? conteudo,
}) =>
    Material(
      color: onTap == null ? AppColors.outline : AppColors.primaryFill,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          height: 54,
          alignment: Alignment.center,
          child: conteudo ??
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icone, size: 20, color: Colors.white),
                  const SizedBox(width: 9),
                  Text(rotulo,
                      style: const TextStyle(
                          fontSize: 15,
                          height: 1,
                          fontWeight: FontWeight.w800,
                          color: Colors.white)),
                ],
              ),
        ),
      ),
    );

/// Modal de registro de pagamento (shPagar do Brisa).
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

  double get _valorAtual =>
      double.tryParse(_valor.text.replaceAll(',', '.')) ?? 0;

  @override
  Widget build(BuildContext context) {
    final c = widget.cliente;
    final duplicado = widget.pagas.contains(_competencia);
    final status = _statusDe(c);
    final (avBg, avFg) = _avatarCores(c.nome);

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _handleSheet(),
          const SizedBox(height: 6),
          // Cabeçalho: avatar + nome + sub + status.
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: avBg, shape: BoxShape.circle),
                child: Text(_iniciais(c.nome),
                    style: TextStyle(
                        fontSize: 14,
                        height: 1,
                        fontWeight: FontWeight.w800,
                        color: avFg)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.nome,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 16,
                            height: 1.25,
                            fontWeight: FontWeight.w800,
                            color: AppColors.onSurface)),
                    Text(c.planoNome ?? 'sem plano',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12,
                            height: 1.3,
                            fontWeight: FontWeight.w500,
                            color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _pilulaStatus(status),
            ],
          ),
          const SizedBox(height: 14),
          // Competência + valor da mensalidade.
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _competencia,
                      isExpanded: true,
                      isDense: true,
                      borderRadius: BorderRadius.circular(16),
                      icon: const Icon(Icons.expand_more,
                          size: 20, color: AppColors.onSurfaceVariant),
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.onSurfaceVariant),
                      items: _ultimasCompetencias(6)
                          .map((c) => DropdownMenuItem(
                                value: c,
                                child:
                                    Text('Mensalidade de ${_mesCompetencia(c)}'),
                              ))
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _competencia = v ?? _competencia),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                IntrinsicWidth(
                  child: Row(
                    children: [
                      const Text('R\$ ',
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.onSurfaceVariant)),
                      SizedBox(
                        width: 76,
                        child: TextField(
                          controller: _valor,
                          textAlign: TextAlign.right,
                          keyboardType: const TextInputType.numberWithOptions(
                              decimal: true),
                          style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: AppColors.onSurface),
                          decoration: const InputDecoration(
                            isDense: true,
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            contentPadding: EdgeInsets.zero,
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const RotuloBrisa('Forma de pagamento'),
          const SizedBox(height: 8),
          Row(
            children: [
              _chipForma('dinheiro', 'Dinheiro', Icons.attach_money),
              const SizedBox(width: 8),
              _chipForma('pix', 'PIX', Icons.pix),
              const SizedBox(width: 8),
              _chipForma('cartao', 'Cartão', Icons.credit_card),
            ],
          ),
          const SizedBox(height: 12),
          // Observação (opcional).
          Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Center(
              child: TextField(
                controller: _obs,
                style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurface),
                decoration: const InputDecoration(
                  hintText: 'Observação (opcional)',
                  hintStyle: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w500,
                      color: AppColors.onSurfaceVariant),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  isDense: true,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ),
          ),
          if (duplicado) ...[
            const SizedBox(height: 12),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: AppColors.warningBg,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: AppColors.warning, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Já há um pagamento de ${_labelCompetencia(_competencia)}. Você pode registrar outro.',
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.warning),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          _botaoCta(
            icone: Icons.payments_outlined,
            rotulo: 'Receber ${_moeda.format(_valorAtual)}',
            onTap: _salvando ? null : _confirmar,
            conteudo: _salvando
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : null,
          ),
        ],
      ),
    );
  }

  Widget _chipForma(String valor, String rotulo, IconData icone) {
    final sel = _forma == valor;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _forma = valor),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: 48,
          decoration: BoxDecoration(
            color: sel ? AppColors.primaryContainer : AppColors.background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: sel ? AppColors.primaryFill : AppColors.outlineVariant,
              width: sel ? 2 : 1.5,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icone,
                  size: 18,
                  color: sel ? AppColors.primary : AppColors.onSurfaceVariant),
              const SizedBox(width: 5),
              Text(rotulo,
                  style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color:
                          sel ? AppColors.primary : AppColors.onSurfaceVariant)),
            ],
          ),
        ),
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
