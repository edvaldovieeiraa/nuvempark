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

  /// Uma tarifa com tipoVeiculo == 'ambos' atende qualquer tipo de veículo.
  static const tipoAmbos = 'ambos';

  bool _atendeTipo(TarifaConfig t, String tipoVeiculo) =>
      t.tipoVeiculo == tipoVeiculo || t.tipoVeiculo == tipoAmbos;

  /// Tarifas vigentes para um tipo de veículo (usadas no cálculo).
  List<TarifaConfig> tarifasVigentes(String tipoVeiculo) =>
      tarifas.where((t) => _atendeTipo(t, tipoVeiculo) && t.vigente).toList();

  /// Tabelas visíveis ao operador para seleção, ordenadas.
  List<TarifaConfig> tabelasVisiveis(String tipoVeiculo) {
    final list = tarifas
        .where((t) => _atendeTipo(t, tipoVeiculo) && t.vigente && t.visivelOperador)
        .toList()
      ..sort((a, b) => a.ordem.compareTo(b.ordem));
    return list;
  }
}
