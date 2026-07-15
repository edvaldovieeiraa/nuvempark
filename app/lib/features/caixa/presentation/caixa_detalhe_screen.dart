import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/theme/app_colors.dart';
import '../domain/caixa_model.dart';
import '../domain/resumo_fechamento.dart';
import 'providers/caixa_provider.dart';

/// Detalhamento do fechamento do caixa NA TELA — o mesmo que o cupom mostra:
/// resumo, quebra por forma de pagamento, movimentos e a conferência
/// (esperado × contado × divergência). Serve tanto para o caixa aberto (prévia
/// do que vai fechar) quanto para o último fechamento.
///
/// Tudo é recalculado dos MOVIMENTOS (fonte da verdade), igual ao cupom.
class CaixaDetalheScreen extends ConsumerWidget {
  const CaixaDetalheScreen({super.key, required this.sessao});

  final CaixaModel sessao;

  static final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
  static final _dataHora = DateFormat('dd/MM/yyyy HH:mm');

  bool get _fechado => sessao.status != 'aberta' || sessao.fechamento != null;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final movsAsync = ref.watch(caixaMovimentosProvider(sessao.id));

    return Scaffold(
      appBar: AppBar(title: const Text('Detalhamento do fechamento')),
      body: movsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) =>
            const ErrorState(mensagem: 'Erro ao carregar o detalhamento.'),
        data: (movs) {
          final entradas = movs
              .where((m) => m.tipo == 'entrada')
              .fold<double>(0, (t, m) => t + m.valor);
          final sangrias = movs
              .where((m) => m.tipo == 'sangria')
              .fold<double>(0, (t, m) => t + m.valor);
          final calculado = sessao.fundoCaixa + entradas - sangrias;
          final contado = sessao.totalFechamento;
          final divergencia = _fechado && contado != null
              ? contado - calculado
              : null;
          final porForma = resumoPorForma(movs);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _cabecalho(),
              const SizedBox(height: 20),

              _titulo('Resumo'),
              _cartao([
                _linha('Fundo inicial', _moeda.format(sessao.fundoCaixa)),
                _linha('Entradas', _moeda.format(entradas)),
                _linha('Sangrias', '- ${_moeda.format(sangrias)}'),
              ]),
              const SizedBox(height: 20),

              _titulo('Por forma de pagamento'),
              if (porForma.isEmpty)
                _cartao([
                  _vazio('Nenhuma entrada em dinheiro no caixa ainda.'),
                ])
              else
                _cartao([
                  for (final f in porForma)
                    _linha(
                      rotuloFormaPagamento(f.forma),
                      _moeda.format(f.total),
                      detalhe: '${f.qtd} ${f.qtd == 1 ? 'lançamento' : 'lançamentos'}',
                    ),
                ]),
              const SizedBox(height: 20),

              _titulo('Conferência'),
              _cartaoConferencia(calculado, contado, divergencia),
              const SizedBox(height: 20),

              if (movs.isNotEmpty) ...[
                _titulo('Movimentos (${movs.length})'),
                _cartao([
                  for (final m in movs) _linhaMovimento(m),
                ]),
                const SizedBox(height: 12),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _cabecalho() => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: AppColors.gradient),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(_fechado ? 'FECHADO' : 'ABERTO',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          letterSpacing: 1,
                          fontWeight: FontWeight.w800)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text('Operador: ${sessao.operadorNome}',
                style: const TextStyle(color: Colors.white, fontSize: 14)),
            const SizedBox(height: 4),
            Text('Abertura: ${_dataHora.format(sessao.abertura)}',
                style: const TextStyle(color: Colors.white70, fontSize: 12)),
            if (sessao.fechamento != null)
              Text('Fechamento: ${_dataHora.format(sessao.fechamento!)}',
                  style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ],
        ),
      );

  Widget _cartaoConferencia(
    double calculado,
    double? contado,
    double? divergencia,
  ) {
    if (divergencia == null) {
      // Caixa aberto: ainda não há valor contado; mostramos só o esperado.
      return _cartao([
        _linha('Saldo esperado', _moeda.format(calculado), forte: true),
      ]);
    }
    final ok = divergencia.abs() <= 0.01;
    final excesso = divergencia > 0.01;
    final cor = ok
        ? AppColors.success
        : excesso
            ? AppColors.warning
            : AppColors.danger;
    final rotulo = ok
        ? 'Confere'
        : excesso
            ? 'Sobra'
            : 'Falta';
    return Column(
      children: [
        _cartao([
          _linha('Esperado', _moeda.format(calculado)),
          _linha('Contado', _moeda.format(contado ?? 0)),
        ]),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: cor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: cor.withValues(alpha: 0.4)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(rotulo,
                  style: TextStyle(fontWeight: FontWeight.w700, color: cor)),
              Text(_moeda.format(divergencia.abs()),
                  style: TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 18, color: cor)),
            ],
          ),
        ),
      ],
    );
  }

  // ── helpers de layout ──────────────────────────────────────────────────

  Widget _titulo(String t) => Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 8),
        child: Text(t.toUpperCase(),
            style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
                color: AppColors.onSurfaceVariant)),
      );

  Widget _cartao(List<Widget> linhas) => Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            for (var i = 0; i < linhas.length; i++) ...[
              if (i > 0) const Divider(height: 1, indent: 14, endIndent: 14),
              linhas[i],
            ],
          ],
        ),
      );

  Widget _linha(String k, String v, {String? detalhe, bool forte = false}) =>
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(k,
                      style: TextStyle(
                          fontSize: forte ? 15 : 14,
                          fontWeight:
                              forte ? FontWeight.w700 : FontWeight.w500)),
                  if (detalhe != null)
                    Text(detalhe,
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.outline)),
                ],
              ),
            ),
            Text(v,
                style: TextStyle(
                    fontSize: forte ? 16 : 14,
                    fontWeight: forte ? FontWeight.w800 : FontWeight.w700)),
          ],
        ),
      );

  Widget _linhaMovimento(MovimentoModel m) {
    final sangria = m.tipo == 'sangria';
    final cor = sangria
        ? AppColors.danger
        : m.tipo == 'isencao'
            ? AppColors.onSurfaceVariant
            : AppColors.entrada;
    final hora = DateFormat('HH:mm').format(m.criadoEm);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      child: Row(
        children: [
          Text(hora,
              style: const TextStyle(
                  fontSize: 12, color: AppColors.outline)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(m.descricao,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13)),
          ),
          const SizedBox(width: 8),
          Text('${sangria ? '−' : '+'}${_moeda.format(m.valor)}',
              style: TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w700, color: cor)),
        ],
      ),
    );
  }

  Widget _vazio(String txt) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        child: Text(txt,
            style: const TextStyle(
                fontSize: 13, color: AppColors.onSurfaceVariant)),
      );
}
