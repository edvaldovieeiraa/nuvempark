import '../../../database/app_database.dart';
import '../../estadias/data/estadia_repository.dart';
import '../domain/reconhecimento_cliente.dart';
import 'ticket_repository.dart';

/// O que a placa é para a entrada, antes de registrar.
sealed class AnaliseEntrada {
  const AnaliseEntrada(this.placa);

  /// Placa normalizada (maiúscula, sem espaços).
  final String placa;
}

/// Pode entrar sem decisão: avulso, mensalista (com ou sem livre passagem) ou
/// hóspede com estadia válida.
class EntradaLiberada extends AnaliseEntrada {
  const EntradaLiberada(super.placa, {this.cliente, this.hospede});

  final ReconhecimentoCliente? cliente;

  /// Estadia VÁLIDA que cobre esta passagem.
  final Estadia? hospede;
}

/// A placa já tem entrada aberta: saída ou pular, o operador decide.
class EntradaJaNoPatio extends AnaliseEntrada {
  const EntradaJaNoPatio(super.placa, this.ticket);
  final Ticket ticket;
}

/// Hóspede com estadia vencida há pouco: renovar ou pular, o operador decide.
class EntradaHospedeVencido extends AnaliseEntrada {
  const EntradaHospedeVencido(super.placa, this.hospede);
  final ReconhecimentoHospede hospede;
}

class EntradaRegistrada {
  const EntradaRegistrada({
    required this.ticketId,
    required this.origem,
    this.aviso,
  });

  final String ticketId;

  /// 'avulso' | 'plano' | 'estadia'.
  final String origem;

  /// Mensalista que entrou como avulso (bloqueado, plano vencido, sem vaga):
  /// o motivo, para a confirmação mostrar em destaque.
  final String? aviso;
}

/// Regras da entrada que não dependem de tela: reconhecer a placa e
/// registrar avulso, plano ou hóspede. A entrada normal e o modo rápido usam
/// as mesmas — a contratação de estadia e a avaria ficam na tela de entrada.
class EntradaService {
  EntradaService({required this.tickets, required this.estadias});

  final TicketRepository tickets;
  final EstadiaRepository estadias;

  /// Mensalista e hóspede da placa. Livre passagem tem precedência sobre
  /// hóspede: com ela, o hóspede nem é consultado.
  Future<({ReconhecimentoCliente? cliente, ReconhecimentoHospede? hospede})>
      reconhecer({required String patioId, required String placa}) async {
    final norm = placa.trim().toUpperCase();
    final cliente = await tickets.reconhecerPlaca(patioId, norm);
    final hospede = (cliente?.liberaPassagem ?? false)
        ? null
        : await estadias.reconhecerHospede(patioId, norm);
    return (cliente: cliente, hospede: hospede);
  }

  /// Tudo que decide a entrada de uma placa, sem gravar nada.
  ///
  /// [prazoServidor] limita a busca de entrada aberta no servidor (ver
  /// [TicketRepository.ticketAbertoPorPlaca]) — o modo rápido não pode esperar
  /// o timeout de conexão a cada carro novo.
  Future<AnaliseEntrada> analisar({
    required String patioId,
    required String placa,
    Duration? prazoServidor,
  }) async {
    final norm = placa.trim().toUpperCase();
    final aberto = await tickets.ticketAbertoPorPlaca(patioId, norm,
        prazoServidor: prazoServidor);
    if (aberto != null) return EntradaJaNoPatio(norm, aberto);

    final r = await reconhecer(patioId: patioId, placa: norm);
    final h = r.hospede;
    if (h != null && h.situacao == SituacaoHospede.vencidaRecente) {
      return EntradaHospedeVencido(norm, h);
    }
    return EntradaLiberada(norm,
        cliente: r.cliente,
        hospede: h?.situacao == SituacaoHospede.valida ? h!.estadia : null);
  }

  /// Registra a entrada liberada: hóspede pela estadia; livre passagem como
  /// plano; o resto como avulso, na tabela [tarifaId].
  Future<EntradaRegistrada> registrar(
    EntradaLiberada a, {
    required String patioId,
    required String tipoVeiculo,
    required String operadorId,
    String? tarifaId,
    String? fotoEntradaPath,
  }) async {
    final hospede = a.hospede;
    if (hospede != null) {
      final id = await estadias.registrarEntradaHospede(hospede,
          operadorId: operadorId, fotoEntradaPath: fotoEntradaPath);
      return EntradaRegistrada(ticketId: id, origem: 'estadia');
    }

    final cliente = a.cliente;
    final livre = cliente?.liberaPassagem ?? false;
    final id = await tickets.registrarEntrada(
      placa: a.placa,
      tipoVeiculo: tipoVeiculo,
      patioId: patioId,
      operadorId: operadorId,
      tarifaId: tarifaId,
      clienteId: livre ? cliente!.clienteId : null,
      planoId: livre ? cliente!.planoId : null,
      origem: livre ? 'plano' : 'avulso',
      fotoEntradaPath: fotoEntradaPath,
    );
    return EntradaRegistrada(
      ticketId: id,
      origem: livre ? 'plano' : 'avulso',
      aviso: cliente != null && !livre ? cliente.mensagem : null,
    );
  }
}
