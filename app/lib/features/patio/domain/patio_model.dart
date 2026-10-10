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
  });

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
