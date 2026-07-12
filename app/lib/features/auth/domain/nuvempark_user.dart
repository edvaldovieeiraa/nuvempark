/// Usuário operador autenticado. No NuvemPark o usuário pertence a um tenant
/// e enxerga uma lista de pátios (patio_ids).
class NuvemparkUser {
  const NuvemparkUser({
    required this.id,
    required this.nome,
    required this.usuario,
    required this.tenantId,
    required this.patioIds,
  });

  final String id;
  final String nome;
  final String usuario;
  final String tenantId;
  final List<String> patioIds;

  factory NuvemparkUser.fromJson(Map<String, dynamic> json) => NuvemparkUser(
        id: json['id'] as String,
        nome: json['nome'] as String,
        usuario: json['usuario'] as String,
        tenantId: json['tenant_id'] as String,
        patioIds: (json['patio_ids'] as List? ?? []).cast<String>(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'nome': nome,
        'usuario': usuario,
        'tenant_id': tenantId,
        'patio_ids': patioIds,
      };
}
