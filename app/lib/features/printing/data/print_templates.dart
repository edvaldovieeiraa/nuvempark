import 'package:intl/intl.dart';

import 'esc_pos_builder.dart';

abstract final class PrintTemplates {
  static final _fmt = DateFormat('dd/MM/yyyy HH:mm');
  static final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$ ');

  /// Larguras suportadas: 58mm ≈ 32 colunas, 80mm ≈ 48 colunas.
  static const int cols58mm = 32;
  static const int cols80mm = 48;

  // ── Ticket de Entrada ──────────────────────────────────────────────────────
  static List<int> ticketEntrada({
    required String ticketId,
    required String placa,
    required String tipoVeiculo,
    required DateTime entrada,
    required String operacaoNome,
    int cols = cols58mm,
    int avancoFinal = 10,
    List<String> cabecalho = const [],
    List<String> rodape = const [],
  }) {
    final shortId = ticketId.substring(0, 8).toUpperCase();

    final b = EscPosBuilder().reset().centerAlign().boldOn();
    _linhasCabecalho(b, cabecalho, operacaoNome);
    b
        .line('TICKET DE ENTRADA')
        .boldOff()
        .separator(width: cols)
        .leftAlign()
        .line(_row('Placa   :', placa, cols))
        .line(_row('Tipo    :', _capitalize(tipoVeiculo), cols))
        .line(_row('Entrada :', _fmt.format(entrada), cols))
        .separator(width: cols)
        .centerAlign()
        .qrCode(ticketId)
        .feed()
        .line('ID: $shortId')
        .separator(width: cols);
    _linhasRodape(b, rodape, const ['Guarde este cupom.', 'Apresente na saida.']);
    return b.cut(feedLines: avancoFinal, cutter: cols >= cols80mm).build();
  }

  // ── Recibo de Saída ────────────────────────────────────────────────────────
  static List<int> reciboSaida({
    required String placa,
    required String tipoVeiculo,
    required DateTime entrada,
    required DateTime saida,
    required double valorCobrado,
    required String formaPagamento,
    required String operacaoNome,
    bool isIsento = false,
    int cols = cols58mm,
    int avancoFinal = 10,
    List<String> cabecalho = const [],
    List<String> rodape = const [],
  }) {
    final duracao = saida.difference(entrada);
    final h = duracao.inHours;
    final m = duracao.inMinutes.remainder(60);
    final duracaoStr = h > 0 ? '${h}h ${m}min' : '${m}min';

    final b = EscPosBuilder().reset().centerAlign().boldOn();
    _linhasCabecalho(b, cabecalho, operacaoNome);
    b
        .line('RECIBO DE SAIDA')
        .boldOff()
        .separator(width: cols)
        .leftAlign()
        .line(_row('Placa    :', placa, cols))
        .line(_row('Tipo     :', _capitalize(tipoVeiculo), cols))
        .line(_row('Entrada  :', _fmt.format(entrada), cols))
        .line(_row('Saida    :', _fmt.format(saida), cols))
        .line(_row('Tempo    :', duracaoStr, cols))
        .separator(width: cols)
        .boldOn()
        .line(_row(isIsento ? 'Isento   :' : 'Valor    :',
            _moeda.format(valorCobrado), cols))
        .boldOff()
        .line(_row('Pagamento:', _capitalize(formaPagamento), cols))
        .separator(width: cols)
        .centerAlign();
    _linhasRodape(b, rodape, const ['Obrigado!']);
    return b.cut(feedLines: avancoFinal, cutter: cols >= cols80mm).build();
  }

  // ── Fechamento de Caixa ────────────────────────────────────────────────────
  static List<int> fechamentoCaixa({
    required String operadorNome,
    required String operacaoNome,
    required DateTime abertura,
    required DateTime fechamento,
    required double fundoCaixa,
    required double totalEntradas,
    required double totalSangrias,
    required double totalCalculado,
    required double totalContado,
    required double divergencia,
    List<MovimentoCupom> movimentos = const [],
    int cols = cols58mm,
    int avancoFinal = 10,
  }) {
    final divStr = divergencia > 0.01
        ? '+${_moeda.format(divergencia)} (excesso)'
        : divergencia < -0.01
            ? '${_moeda.format(divergencia)} (falta)'
            : 'R\$ 0,00 (OK)';

    final b = EscPosBuilder()
        .reset()
        .centerAlign()
        .boldOn()
        .line(operacaoNome.toUpperCase())
        .line('FECHAMENTO DE CAIXA')
        .boldOff()
        .separator(width: cols)
        .leftAlign()
        .line(_row('Operador :', operadorNome, cols))
        .line(_row('Abertura :', _fmt.format(abertura), cols))
        .line(_row('Fechament:', _fmt.format(fechamento), cols))
        .feed()
        .separator(width: cols)
        .line(_row('Fundo    :', _moeda.format(fundoCaixa), cols))
        .line(_row('Entradas :', _moeda.format(totalEntradas), cols))
        .line(_row('Sangrias :', '-${_moeda.format(totalSangrias)}', cols));

    // Relatório de movimentos: cada validação de veículo e lançamento manual.
    if (movimentos.isNotEmpty) {
      b
          .feed()
          .separator(width: cols)
          .boldOn()
          .line('MOVIMENTOS (${movimentos.length})')
          .boldOff();
      for (final m in movimentos) {
        // "22:15 Ticket ABC1D23      +R$ 12,00" — descrição truncada p/ caber.
        // hora(5) + espacos(2); clamp evita RangeError se o valor for longo.
        final maxDesc = (cols - m.valor.length - 7).clamp(0, cols);
        final desc = m.descricao.length > maxDesc
            ? m.descricao.substring(0, maxDesc)
            : m.descricao;
        b.line(_row('${m.hora} $desc', m.valor, cols));
      }
    }

    b
        .feed()
        .separator(width: cols)
        .line(_row('Calculado:', _moeda.format(totalCalculado), cols))
        .line(_row('Contado  :', _moeda.format(totalContado), cols))
        .feed()
        .boldOn()
        .line(_row('Diferenca:', divStr, cols))
        .boldOff()
        .separator(width: cols)
        .cut(feedLines: avancoFinal, cutter: cols >= cols80mm);

    return b.build();
  }

  // ── Página de Teste ────────────────────────────────────────────────────────
  static List<int> testeImpressao({
    required DateTime agora,
    int cols = cols58mm,
    int avancoFinal = 10,
    String? impressoraNome,
  }) {
    final regua = List.generate(cols, (i) => ((i + 1) % 10).toString()).join();

    return EscPosBuilder()
        .reset()
        .centerAlign()
        .boldOn()
        .line('PARKFLOW')
        .line('TESTE DE IMPRESSAO')
        .boldOff()
        .separator(width: cols)
        .leftAlign()
        .line(_row('Data     :', _fmt.format(agora), cols))
        .line(_row('Papel    :', cols == cols80mm ? '80mm' : '58mm', cols))
        .line(_row('Colunas  :', '$cols', cols))
        .line(_row('Impressor:', impressoraNome ?? '-', cols))
        .separator(width: cols)
        .line(regua)
        .separator(width: cols)
        .centerAlign()
        .line('Se a linha de numeros acima')
        .line('ocupa a largura toda sem')
        .line('quebrar, o papel esta correto.')
        .cut(feedLines: avancoFinal, cutter: cols >= cols80mm)
        .build();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  static void _linhasCabecalho(
    EscPosBuilder b,
    List<String> cabecalho,
    String operacaoNome,
  ) {
    final linhas = cabecalho.where((l) => l.trim().isNotEmpty).toList();
    if (linhas.isEmpty) {
      b.line(operacaoNome.toUpperCase());
      return;
    }
    for (final l in linhas) {
      b.line(l);
    }
  }

  static void _linhasRodape(
    EscPosBuilder b,
    List<String> rodape,
    List<String> padrao,
  ) {
    final linhas = rodape.where((l) => l.trim().isNotEmpty).toList();
    for (final l in linhas.isEmpty ? padrao : linhas) {
      b.line(l);
    }
  }

  static String _row(String label, String value, int cols) {
    final padding = cols - label.length - value.length;
    return padding > 0 ? '$label${' ' * padding}$value' : '$label $value';
  }

  static String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1).toLowerCase();
}

/// Linha de movimento no cupom de fechamento (hora + descrição + valor c/ sinal).
class MovimentoCupom {
  const MovimentoCupom({
    required this.hora,
    required this.descricao,
    required this.valor,
  });

  final String hora;
  final String descricao;
  final String valor;
}
