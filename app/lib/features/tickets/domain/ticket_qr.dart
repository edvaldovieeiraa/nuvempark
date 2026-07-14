/// Lê o conteúdo de um QR de cupom e devolve o `ticket_id`.
///
/// DOIS formatos convivem, e vão conviver por muito tempo:
///
///  - **id cru** (`8f14e45f-...`): o que os cupons impressos ATÉ HOJE carregam.
///    Esses papéis estão no bolso dos clientes e no painel do carro. Parar de
///    lê-los deixaria gente presa no pátio.
///  - **URL** (`https://nuvempark.com/t/8f14e45f-...`): o formato novo, que serve
///    ao cliente (paga) e ao operador (dá saída) com o mesmo QR.
///
/// Domínio diferente também vale: o que importa é o id no fim do caminho. Um QR
/// impresso quando o domínio era outro tem de continuar funcionando.
///
/// Qualquer outra coisa → `null`, e a tela mostra o erro de QR não reconhecido.
String? extrairTicketId(String? conteudo) {
  if (conteudo == null) return null;

  final texto = conteudo.trim();
  if (texto.isEmpty) return null;

  // Formato antigo: o próprio id.
  if (_ehUuid(texto)) return texto.toLowerCase();

  // Formato novo: última parte do caminho da URL.
  final uri = Uri.tryParse(texto);
  if (uri == null || !uri.hasScheme) return null;

  // `pathSegments` já descarta segmento vazio de barra final ("/t/<id>/").
  final segmentos = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segmentos.isEmpty) return null;

  final ultimo = segmentos.last;
  return _ehUuid(ultimo) ? ultimo.toLowerCase() : null;
}

final _uuid = RegExp(
  r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
);

bool _ehUuid(String s) => _uuid.hasMatch(s);
