# Desempenho do site público (PageSpeed / Core Web Vitals)

Registro do trabalho de 31/07/2026 em `nuvempark.com`. Este arquivo existe
porque quase toda decisão aqui **parece errada à primeira vista** e é fácil
alguém "consertar" de volta sem saber o que quebra.

Vale só para o SITE (`nuvempark.com`). O painel (`dashboard.nuvempark.com`) é
área logada, não é medido pelo PageSpeed e **não** deve ser cacheado.

## Ponto de partida e resultado

| | Celular | Computador |
|---|---|---|
| Antes | 90 / 96 / 100 / 100 · agêntica 3-3 | 91 / 96 / 100 / 100 · agêntica **2-3** |
| Depois das mudanças de código | 95 / **100** / 100 / 100 · 3-3 | **100 / 100 / 100 / 100** · 3-3 |

Ordem das notas: Desempenho / Acessibilidade / Práticas recomendadas / SEO.

Métricas do celular na medição de referência: FCP **2,7 → 1,7 s**, CLS
**0,09 → 0**, TBT 50 ms. Depois vieram o cache de borda e a remoção do beacon
(seção "Infra"), que derrubaram o FCP para 1,5 s.

## O que a nota realmente mede

Só cinco métricas: **FCP, LCP, TBT, CLS e Speed Index**. Os cards de Insights e
Diagnóstico que trazem a etiqueta **"Fora da pontuação"** — "JavaScript legado",
"JavaScript não usado", "ciclos de vida de cache", "árvore de dependência" —
são informativos e **não movem a nota**. Zerá-los é trabalho sem retorno.

## Invariantes (não desfaça sem medir)

### Fontes são servidas do nosso domínio, não do Google

`public/fonts/*.woff2` (11 arquivos, subset latin, ~137 KB) + `@font-face` no
topo de `globals.css`. O `<link>` para `fonts.googleapis.com` que existia antes
bloqueava a renderização por **750 ms no celular**.

- **Os nomes das famílias são os originais** (`Poppins`, `Geist Mono`,
  `IBM Plex Mono`) porque há ~35 referências literais em estilos inline pelo
  código. Trocar por nomes gerados obrigaria a mexer em todas.
- **Não usamos `next/font`**: ele baixa a fonte em tempo de BUILD, e o build
  roda no VPS — uma indisponibilidade do Google derrubaria o deploy.

### Todo peso acima da dobra precisa de `preload` em `layout.tsx`

Hoje: **300** (marca "Nuvem" no cabeçalho), **400** (corpo), **600** (botões do
cabeçalho), **700** (CTAs), **800** (título do hero, elemento de LCP).

Peso que fica de fora só é descoberto **depois** do CSS (HTML → CSS → fonte),
chega com a página já pintada e desloca o texto. Isso custou caro: o CLS do
celular subiu de 0 para 0,09 **conforme o site ficava mais rápido** — quanto
antes a página pinta, mais visível fica a troca tardia. Se adicionar um peso
novo acima da dobra, adicione o preload junto.

### `font-display: optional` em Geist Mono e no Poppins 500

São 4 rótulos decorativos de 11-12px (Geist Mono, 23 KB por peso) e um único
elemento (Poppins 500), todos fora do caminho crítico. Com `optional` o
navegador usa a fonte do sistema se a nossa não chegar quase de imediato —
nenhum deslocamento tardio, diferença imperceptível nesse tamanho.

### Imagens: `next/image` com as dimensões REAIS

Todas as capturas em `/uploads` são **720×1604**; `pix-ticket-hero.webp` e
`avaria-hero.webp` são **1400×1045** (conferido arquivo por arquivo). As
dimensões declaradas reservam o espaço antes do download.

⚠️ **`priority` só em imagem que está acima da dobra NO CELULAR.** Tentamos
`priority` na foto do celular do hero e **piorou**: LCP 2,6 → 3,1 s, CLS 0,063
→ 0,09. No viewport do teste (412×823) essa foto está abaixo da dobra —
preloadar imagem fora da tela não antecipa nada, só disputa banda com quem
define o LCP. Revertido em `a0beb77`.

### Google Analytics com `strategy="lazyOnload"`

São 159 KiB, 67 deles sem uso. Com `afterInteractive` disputavam a linha
principal na janela medida. Custo consciente: visitas que fecham a página em
menos de ~2 s podem não ser contabilizadas.

## Decisões deliberadas de NÃO fazer

- **`browserslist` moderno** — economiza 14 KiB de polyfills, mas os polyfills
  são código do próprio Next escrito à mão dentro do chunk (não vêm de
  biblioteca) e o item está "Fora da pontuação". Em troca, quebraria iOS e
  Android antigos, que são parte do público. Não vale.
- **Cabeçalho de cache para `/uploads`** — resolvido de graça quando as imagens
  passaram pelo `next/image` (URL com hash, cache imutável).

## Infra (fora do repositório)

Duas configurações na **Cloudflare** sustentam parte do resultado — veja
`DEPLOY-PRODUCAO.md`, seção "Cloudflare", para os detalhes e para o cuidado
obrigatório de escopo:

1. Cache Rule que cacheia o HTML **apenas de `nuvempark.com`**.
2. Web Analytics (beacon) desligado — eram 11 KiB e o caminho crítico mais
   longo do relatório.

## Como medir de novo

`https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fnuvempark.com%2F&form_factor=mobile`

- **Limpe o cache da Cloudflare antes** (senão você mede o código anterior).
- Rode **duas vezes** e descarte a primeira: a medição oscila bastante entre
  execuções — durante este trabalho o CLS variou 0 / 0,063 / 0,09 no mesmo
  código. Uma execução só não distingue melhora real de variação.
