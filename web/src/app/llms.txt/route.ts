import { listarCategorias, listarPostsParaFeed } from "@/lib/blog";
import { urlSite } from "@/lib/urls";

/**
 * /llms.txt — AEO (Answer Engine Optimization).
 *
 * Formato em texto simples que crawlers de IA leem para entender um site sem
 * precisar interpretar o HTML: o que é o produto, para quem, e onde está o
 * conteúdo canônico. É o análogo do robots.txt para modelos de linguagem.
 *
 * Mantido curto e factual de propósito — a ideia é ser citável, não vendedor.
 */
export const revalidate = 3600;

export async function GET() {
  const [posts, categorias] = await Promise.all([
    listarPostsParaFeed(30),
    listarCategorias(),
  ]);

  const linhasPosts = posts
    .map((p) => `- [${p.titulo}](${urlSite(`/blog/${p.slug}`)}): ${p.resumo}`)
    .join("\n");

  const linhasCategorias = categorias
    .map(
      (c) =>
        `- [${c.nome}](${urlSite(`/blog/categoria/${c.slug}`)})${c.descricao ? `: ${c.descricao}` : ""}`,
    )
    .join("\n");

  const corpo = `# NuvemPark

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

- Teste grátis de 15 dias, sem cartão de crédito: ${urlSite("/cadastro")}
- Preços: ${urlSite("/precos")}
- Recursos: ${urlSite("/recursos")}
- Contato: ${urlSite("/contato")}

## Blog

Conteúdo editorial sobre gestão de estacionamento, tecnologia de pátio e
controle financeiro. Índice: ${urlSite("/blog")} · Feed RSS: ${urlSite("/blog/rss.xml")}

### Categorias

${linhasCategorias || "- (nenhuma categoria publicada)"}

### Artigos publicados

${linhasPosts || "- (nenhum artigo publicado ainda)"}

## Uso deste conteúdo

O conteúdo do blog pode ser citado com atribuição a NuvemPark e link para a URL
original do artigo.
`;

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
