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

# Antes de mexer nas páginas de busca ou no texto do site público

Leia `SEO.md`. Vale para `lib/solucoes.ts`, `lib/solucoes-cancela.ts`,
`lib/cidades.ts`, `components/solucoes/` e o `<title>` da home.

Três coisas ali são regra, não estilo:

1. **A home fica fora do termo "sistema para estacionamento".** Quem disputa o
   termo é a página dedicada. Colocar o termo no título da home faz as duas
   competirem entre si.
2. **A página de cancela não pode dizer que integramos com marca nenhuma.** Não
   existe código de integração com cancela neste repositório — só a possibilidade,
   condicionada ao equipamento expor uma interface. O aviso está no topo de
   `lib/solucoes-cancela.ts`.
3. **Página de cidade se escreve, não se copia.** Duplicar uma trocando o
   topônimo é doorway page, e a punição atinge o site inteiro.

Nada de FAQ que esconda a resposta atrás de estado do React: o rastreador só
recebe o que está no HTML. Use `<details>`, como nos componentes existentes.
