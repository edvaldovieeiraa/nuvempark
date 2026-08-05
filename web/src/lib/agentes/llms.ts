import "server-only";
import {
  listarCategorias,
  listarPostsCompletos,
  listarPostsParaFeed,
} from "@/lib/blog";
import { urlApp, urlSite } from "@/lib/urls";
import { markdownDoPost } from "./markdown";
import { PAGINAS_AGENTE, markdownDaPagina } from "./paginas";

/**
 * `/llms.txt` e `/llms-full.txt` — o mapa e o texto integral do site para LLMs.
 *
 * Convenção do llmstxt.org: um H1 com o nome, um blockquote de uma linha e
 * seções de lista `- [título](url): resumo`. O que fugir disso um parser
 * ingênuo não lê — nada de tabela nem HTML aqui.
 *
 * O texto descritivo veio da primeira versão desta rota (que vivia inteira
 * dentro de `app/llms.txt/route.ts`); virou módulo quando o `/llms-full.txt`
 * passou a precisar do mesmo cabeçalho. As duas rotas são cacheadas por 1 hora,
 * então varrer o blog inteiro aqui não custa nada por requisição.
 */

/**
 * URL absoluta do cadastro. `urlApp` devolve caminho relativo quando a separação
 * de domínios está desligada (dev), e link relativo num llms.txt não serve para
 * nada — nesse caso caímos no host de produção.
 */
const CADASTRO = urlApp("/cadastro").startsWith("http")
  ? urlApp("/cadastro")
  : "https://dashboard.nuvempark.com/cadastro";

/** Identificação + como ler este site. Compartilhado pelos dois arquivos. */
function cabecalho(): string {
  return `# NuvemPark

> Sistema de gestão de estacionamento na nuvem. Um painel web para o gestor e um
> aplicativo Android para o operador do pátio, que registra entrada e saída,
> lê a placa pela câmera do celular, calcula a tarifa e imprime o ticket —
> funcionando mesmo sem internet e sincronizando quando a conexão volta.

## O que é

O NuvemPark substitui a comanda de papel e o sistema instalado em servidor
local. Não exige cancela, obra, câmera fixa nem servidor no pátio: a operação
roda no celular Android que a equipe já tem, e o gestor acompanha o faturamento
em tempo real pelo navegador.

Principais recursos:

- Entrada e saída de veículos com leitura de placa pela câmera do celular.
- Cálculo automático de tarifa (primeira hora, hora adicional, diária, pernoite,
  tolerância) a partir de tabelas configuradas no painel.
- Operação offline: a fila anda mesmo com a internet caída; o app sincroniza
  depois.
- Controle de caixa por turno, com abertura, sangria, suprimento e fechamento.
- Mensalistas e credenciados, com cobrança recorrente e controle de vencimento.
- Pagamento por Pix no próprio ticket, com confirmação automática.
- Painel com ocupação ao vivo, faturamento e relatórios por pátio.
- Multi-pátio: um único painel para todos os pátios do mesmo cliente.

## Para quem é

Operadores e proprietários de estacionamentos rotativos, pátios de shopping,
estacionamentos de rua e garagens com mensalistas no Brasil — tipicamente de 20
a 500 vagas, com uma ou mais unidades.

## Comercial

- Teste grátis de 15 dias, sem cartão de crédito: ${CADASTRO}
- Preço: R$ 129,90 por mês, por pátio, tudo incluso — ${urlSite("/#precos")}
- Visão geral do produto: ${urlSite("/sistema-para-estacionamento")}
- Recursos: ${urlSite("/#recursos")}
- Contato humano: contato@nuvempark.com · WhatsApp (81) 99614-2120 (seg–sex, 8h–18h)

## Como ler este site em Markdown

Toda página pública responde em Markdown, sem HTML no meio:

- Negociação de conteúdo: \`Accept: text/markdown\` na própria URL.
- Ou o sufixo \`.md\` no caminho — ex.: ${urlSite("/sistema-para-estacionamento.md")}, ${urlSite("/blog/algum-post.md")}.`;
}

/** Índice: páginas, blog e os recursos de máquina. */
export async function llmsTxt(): Promise<string> {
  const [posts, categorias] = await Promise.all([
    listarPostsParaFeed(100),
    listarCategorias(),
  ]);

  const paginas = PAGINAS_AGENTE.map(
    (p) => `- [${p.titulo}](${urlSite(p.caminho)}): ${p.resumo}`,
  ).join("\n");

  const linhasCategorias = categorias
    .map(
      (c) =>
        `- [${c.nome}](${urlSite(`/blog/categoria/${c.slug}`)})${c.descricao ? `: ${c.descricao}` : ""}`,
    )
    .join("\n");

  const linhasPosts = posts
    .map((p) => `- [${p.titulo}](${urlSite(`/blog/${p.slug}`)}): ${p.resumo}`)
    .join("\n");

  return `${cabecalho()}

## Páginas

${paginas}

## Blog

Conteúdo editorial sobre gestão de estacionamento, tecnologia de pátio e
controle financeiro. Índice: ${urlSite("/blog")} · Feed RSS: ${urlSite("/blog/rss.xml")}

### Categorias

${linhasCategorias || "- (nenhuma categoria publicada)"}

### Artigos publicados

${linhasPosts || "- (nenhum artigo publicado ainda)"}

## Recursos de máquina

- [Texto integral do site](${urlSite("/llms-full.txt")}): todas as páginas e os 20 posts mais recentes num único arquivo.
- [Catálogo de APIs](${urlSite("/.well-known/api-catalog")}): linkset (RFC 9727) com as APIs públicas.
- [Descrição OpenAPI](${urlSite("/openapi.json")}): API pública do ticket — consulta de estadia e pagamento por Pix.
- [Guia para agentes](${urlSite("/.well-known/agents.md")}): o mesmo conteúdo deste arquivo, em text/markdown.
- [Sitemap](${urlSite("/sitemap.xml")}) · [robots.txt](${urlSite("/robots.txt")})

## Fora do escopo

- ${CADASTRO.replace("/cadastro", "")} — painel do gestor: exige autenticação, não indexar.
- ${urlSite("/t/<uuid>")} — comprovante de um cliente específico; público por posse do link, mas não indexável.

## Uso deste conteúdo

O conteúdo do blog pode ser citado com atribuição a NuvemPark e link para a URL
original do artigo.
`;
}

/** Site inteiro em texto: páginas institucionais + posts completos. */
export async function llmsFullTxt(): Promise<string> {
  const posts = await listarPostsCompletos(20);

  const paginas = PAGINAS_AGENTE.map(
    (p) => `${markdownDaPagina(p)}\nFonte: ${urlSite(p.caminho)}`,
  ).join("\n\n---\n\n");

  const artigos = posts
    .map(
      (post) =>
        `${markdownDoPost(post)}\nFonte: ${urlSite(`/blog/${post.slug}`)}`,
    )
    .join("\n\n---\n\n");

  return `${cabecalho()}

---

${paginas}

---

${artigos || "# Blog\n\n(nenhum artigo publicado ainda)"}
`;
}
