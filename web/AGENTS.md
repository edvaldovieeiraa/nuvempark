<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Antes de mexer em fontes, imagens ou scripts do site

Leia `PERFORMANCE.md`. As escolhas de fonte (servidas do próprio domínio, com
os nomes originais das famílias), a lista de pesos em `preload`, o
`font-display: optional` e a regra de quando usar `priority` no `next/image`
parecem estranhas fora de contexto e foram todas medidas — desfazer qualquer
uma derruba Core Web Vitals de forma silenciosa.
