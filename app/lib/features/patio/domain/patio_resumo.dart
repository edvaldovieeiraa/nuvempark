/// Resumo de um pátio que o operador pode operar (retornado no login).
class PatioResumo {
  const PatioResumo({
    required this.id,
    required this.nome,
    required this.codigo,
    required this.qtdVagas,
  });

  final String id;
  final String nome;
  final String? codigo;
  final int qtdVagas;

  factory PatioResumo.fromJson(Map<String, dynamic> json) => PatioResumo(
        id: json['id'] as String,
        nome: json['nome'] as String,
        codigo: json['codigo'] as String?,
        qtdVagas: (json['qtd_vagas'] as num?)?.toInt() ?? 0,
      );
}
