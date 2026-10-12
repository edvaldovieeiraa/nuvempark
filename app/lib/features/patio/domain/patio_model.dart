import 'tarifa_config.dart';

/// Modelo do pátio montado a partir do cache (config) + tarifas.
class PatioModel {
  const PatioModel({
    required this.id,
    required this.nome,
    required this.codigo,
    required this.qtdVagas,
    required this.tiposVeiculo,
    required this.formasPagamento,
    required this.motivosIsencao,
    required this.motivosCancelamento,
    required this.ticketCabecalho,
    required this.ticketRodape,
    required this.tarifas,
    required this.sincronizadoEm,
    this.fotoReciboModo = 'desativada',
    this.modoQuiosque = true,
    this.modoRapidoEntrada = false,
    this.modoRapidoImprime = true,
  });

  /// Monta o pátio a partir do cache do bootstrap (`OperacaoCache.configJson`
  /// já decodificado). Chave ausente — API antiga ou cache de antes do campo —
  /// cai no default de cada um.
  factory PatioModel.fromCache({
    required String id,
    required String nome,
    required String codigo,
    required int qtdVagas,
    required Map<String, dynamic> config,
    required List<TarifaConfig> tarifas,
    required DateTime sincronizadoEm,
  }) {
    List<String> lista(String k) =>
        List<String>.from((config[k] as List?) ?? const []);
    return PatioModel(
      id: id,
      nome: nome,
      codigo: codigo,
      qtdVagas: qtdVagas,
      tiposVeiculo: lista('tipos_veiculo'),
      formasPagamento: lista('formas_pagamento'),
      motivosIsencao: lista('motivos_isencao'),
      motivosCancelamento: lista('motivos_cancelamento'),
      ticketCabecalho: lista('ticket_cabecalho'),
      ticketRodape: lista('ticket_rodape'),
      tarifas: tarifas,
      sincronizadoEm: sincronizadoEm,
      fotoReciboModo: (config['foto_recibo_modo'] as String?) ?? 'desativada',
      modoQuiosque: (config['modo_quiosque'] as bool?) ?? true,
      modoRapidoEntrada: (config['modo_rapido_entrada'] as bool?) ?? false,
      modoRapidoImprime: (config['modo_rapido_imprime'] as bool?) ?? true,
    );
  }

  final String id;
  final String nome;
  final String codigo;
  final int qtdVagas;
  final List<String> tiposVeiculo;
  final List<String> formasPagamento;
  final List<String> motivosIsencao;
  final List<String> motivosCancelamento;
  final List<String> ticketCabecalho;
  final List<String> ticketRodape;
  final List<TarifaConfig> tarifas;
  final DateTime sincronizadoEm;

  /// Impressão da foto do veículo no recibo (parametrização do painel, por
  /// pátio): 'ativada' | 'operador' | 'desativada'.
  final String fotoReciboModo;

  /// Foto sai sempre no recibo, sem o operador decidir.
  bool get fotoReciboSempre => fotoReciboModo == 'ativada';

  /// O operador escolhe na entrada se imprime a foto.
  bool get fotoReciboOperadorDecide => fotoReciboModo == 'operador';

  /// Modo quiosque (Lock Task) do Android ligado para este pátio.
  final bool modoQuiosque;

  /// O painel liberou o modo rápido de entrada neste pátio (cada operador
  /// ainda liga ou desliga no aparelho).
  final bool modoRapidoEntrada;

  /// O modo rápido imprime o cupom de entrada.
  final bool modoRapidoImprime;

  /// Tipo que a entrada pré-seleciona: o primeiro da ordem definida no painel
  /// (Cadastros → Tipos de veículo). A ordem é a regra do gestor.
  String? get tipoPadrao => tiposVeiculo.isEmpty ? null : tiposVeiculo.first;

  /// Tabela que a entrada pré-seleciona para [tipoVeiculo]: a primeira AVULSA
  /// visível. A de hóspede nunca vem marcada sozinha — contratar sem querer
  /// cobra diárias sem estorno.
  TarifaConfig? tabelaAvulsaPadrao(String tipoVeiculo) {
    final avulsas = tabelasVisiveis(tipoVeiculo);
    return avulsas.isEmpty ? null : avulsas.first;
  }

  /// Por que o modo rápido não pode rodar neste pátio; null = pode. Ele entra
  /// sempre com o tipo e a tabela padrão, então precisa dos dois.
  String? get motivoModoRapidoIndisponivel {
    if (!modoRapidoEntrada) {
      return 'O modo rápido não está liberado para este pátio no painel.';
    }
    final tipo = tipoPadrao;
    if (tipo == null) {
      return 'Cadastre um tipo de veículo no painel para usar o modo rápido.';
    }
    if (tabelaAvulsaPadrao(tipo) == null) {
      return 'Cadastre uma tabela avulsa para "$tipo" para usar o modo rápido.';
    }
    return null;
  }

  /// Uma tarifa com tipoVeiculo == 'ambos' atende qualquer tipo de veículo.
  static const tipoAmbos = 'ambos';

  bool _atendeTipo(TarifaConfig t, String tipoVeiculo) =>
      t.tipoVeiculo == tipoVeiculo || t.tipoVeiculo == tipoAmbos;

  /// Tarifas AVULSAS vigentes para um tipo de veículo (usadas no cálculo).
  ///
  /// Tabela de hóspede fica de fora de propósito: ela não tem frações — cobrar
  /// uma saída avulsa por ela daria o valor das frações padrão do banco.
  List<TarifaConfig> tarifasVigentes(String tipoVeiculo) => tarifas
      .where((t) => !t.isHospede && _atendeTipo(t, tipoVeiculo) && t.vigente)
      .toList();

  List<TarifaConfig> _visiveis(String tipoVeiculo, {required bool hospede}) =>
      tarifas
          .where((t) =>
              t.isHospede == hospede &&
              _atendeTipo(t, tipoVeiculo) &&
              t.vigente &&
              t.visivelOperador)
          .toList()
        ..sort((a, b) => a.ordem.compareTo(b.ordem));

  /// Tabelas AVULSAS visíveis ao operador, ordenadas (saída, cálculo).
  List<TarifaConfig> tabelasVisiveis(String tipoVeiculo) =>
      _visiveis(tipoVeiculo, hospede: false);

  /// Tabelas que a ENTRADA oferece: avulsas primeiro, hóspede depois. A ordem
  /// garante que a pré-seleção da entrada (a primeira da lista) nunca é a de
  /// hóspede — contratar sem querer cobraria diárias sem estorno.
  List<TarifaConfig> tabelasEntrada(String tipoVeiculo) => [
        ..._visiveis(tipoVeiculo, hospede: false),
        ..._visiveis(tipoVeiculo, hospede: true),
      ];

  /// Tabela avulsa que cobra o atraso de uma estadia contratada por [hospede]:
  /// a configurada, se ainda existir e for avulsa; senão a primeira avulsa
  /// visível do tipo; nenhuma → null (o atraso vira diárias inteiras).
  TarifaConfig? tarifaAtraso(TarifaConfig hospede) {
    final configurada = hospede.tarifaAtrasoId;
    if (configurada != null) {
      for (final t in tarifas) {
        if (t.id == configurada && !t.isHospede) return t;
      }
    }
    final avulsas = tabelasVisiveis(hospede.tipoVeiculo);
    return avulsas.isEmpty ? null : avulsas.first;
  }
}
