/**
 * Injeta um bloco JSON-LD (dados estruturados) na página.
 *
 * `<` vira `<` no JSON serializado: sem isso, um post cujo texto contenha
 * `</script>` fecharia a tag e o resto viraria HTML executável.
 */
export function JsonLd({ dados }: { dados: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD só existe como texto dentro de <script>: não há alternativa a
      // dangerouslySetInnerHTML. O conteúdo é serializado e escapado logo abaixo.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(dados).replace(/</g, "\\u003c"),
      }}
    />
  );
}
