import 'package:drift/drift.dart';

import '../../../database/app_database.dart';

/// Converte um ticket aberto vindo do servidor (bootstrap ou busca pontual) na
/// linha local do Drift.
///
/// É o ticket que entrou por OUTRO aparelho do mesmo pátio. Nasce
/// `sincronizado` porque o servidor já o tem — se nascesse `pendente`, este
/// aparelho reenviaria a entrada como se fosse dele. `fotoEntradaEnviada` é
/// true pelo mesmo motivo: a foto, se existe, mora no aparelho de origem.
TicketsCompanion ticketRemotoParaCompanion(
  Map<String, dynamic> m,
  String patioId,
) {
  final entrada = DateTime.parse(m['entrada'] as String).millisecondsSinceEpoch;
  final agora = DateTime.now().millisecondsSinceEpoch;
  return TicketsCompanion(
    id: Value(m['id'] as String),
    operacaoId: Value(patioId),
    placa: Value((m['placa'] as String).toUpperCase()),
    tipoVeiculo: Value(m['tipo_veiculo'] as String? ?? 'carro'),
    entradaEpoch: Value(entrada),
    status: const Value('aberto'),
    operadorId: Value(m['operador_id'] as String? ?? ''),
    caixaSessaoId: Value(m['caixa_sessao_id'] as String?),
    tabelaPrecoId: Value(m['tabela_preco_id'] as String?),
    clienteId: Value(m['cliente_id'] as String?),
    planoId: Value(m['plano_id'] as String?),
    origem: Value(m['origem'] as String? ?? 'avulso'),
    fotoEntradaEnviada: const Value(true),
    syncStatus: const Value('sincronizado'),
    criadoEm: Value(entrada),
    atualizadoEm: Value(agora),
  );
}
