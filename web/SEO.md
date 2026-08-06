# Busca orgânica — o silo de páginas comerciais

Registro do trabalho de 05–06/08/2026. O objetivo era disputar termos de cabeça
do mercado ("sistema para estacionamento", "gestão de estacionamentos",
"controle de estacionamento", "cancela para estacionamento") — não melhorar a
posição de uma página existente, mas criar as páginas que faltavam.

Este arquivo existe pelo mesmo motivo que o `PERFORMANCE.md`: várias decisões
aqui parecem erradas fora de contexto, e algumas afirmações do site **não podem
ser reescritas livremente** sem virar propaganda enganosa. Leia antes de mexer
em qualquer coisa sob `lib/solucoes*.ts`, `lib/cidades.ts` ou
`components/solucoes/`.

Vale só para o SITE (`nuvempark.com`). O painel não é indexado.

---

## 1. A decisão de arquitetura

O site é **onepage**: recursos, preço, novidades, sobre e contato são seções da
home, e as rotas antigas respondem 301 para as âncoras (ver `redirects()` em
`next.config.ts`). Isso é ótimo para a marca e ruim para busca de categoria:
para o Google, o assunto da home é difuso — ela fala de tudo um pouco.

Uma URL não ranqueia bem para seis consultas distintas. A saída foi **acrescentar
uma camada**, não desfazer o onepage:

```
/                                    ← marca (onepage, INTACTA)
/sistema-para-estacionamento         ← PILAR do silo
  ├── /sao-paulo                     ← cidades (filhas do pilar)
  ├── /rio-de-janeiro
  ├── /recife
  ├── /olinda
  └── /jaboatao-dos-guararapes
/gestao-de-estacionamento            ← irmãs, uma intenção de busca cada
/controle-de-estacionamento
/aplicativo-para-estacionamento
/cancela-para-estacionamento
/blog/*                              ← suporte informacional
```

> ⚠️ **Estas páginas NÃO ressuscitam `/recursos` e `/precos`.** Aquelas rotas
> seguem 301 para as âncoras da home e devem continuar assim. São endereços
> novos, com intenção de busca própria.

### Por que a home fica FORA do termo de cabeça

Decisão deliberada e fácil de desfazer sem perceber: o `<title>` da home
continua sendo a promessa da marca ("Cada carro registrado. Cada real no seu
bolso"), e é a página `/sistema-para-estacionamento` que carrega o termo exato
no title e no H1.

Duas páginas do mesmo site competindo pela mesma consulta é o jeito mais fácil
de as duas ficarem em segundo lugar. Se alguém "otimizar" o título da home para
`Sistema para Estacionamento | NuvemPark`, isso passa a competir com o pilar —
que tem 1.500 palavras sobre o assunto e vai perder para a home em autoridade
enquanto perde para si mesma em relevância.

O que a home ganhou foi a **descrição**, que situa a categoria para quem lê o
resultado sem disputar o termo no título.

---

## 2. O mapa

| URL | Termo que deve dominar | Conteúdo em |
| --- | --- | --- |
| `/sistema-para-estacionamento` | sistema/sistemas para estacionamento(s), software, programa | `lib/solucoes.ts` → `PILAR` |
| `/gestao-de-estacionamento` | gestão de estacionamento(s) | `lib/solucoes.ts` → `GESTAO` |
| `/controle-de-estacionamento` | controle de estacionamento, entrada e saída de veículos | `lib/solucoes.ts` → `CONTROLE` |
| `/aplicativo-para-estacionamento` | aplicativo/app para estacionamento | `lib/solucoes.ts` → `APLICATIVO` |
| `/cancela-para-estacionamento` | cancela para estacionamento | `lib/solucoes-cancela.ts` |
| `/sistema-para-estacionamento/<cidade>` | ...em São Paulo / no Rio / em Recife... | `lib/cidades.ts` |

---

## 3. Onde tudo mora

| Peça | Arquivo |
| --- | --- |
| Conteúdo das páginas de assunto | `lib/solucoes.ts` |
| Conteúdo da página de cancela | `lib/solucoes-cancela.ts` |
| Conteúdo das páginas de cidade | `lib/cidades.ts` |
| JSON-LD do site (produto, site, organização) | `lib/site-seo.ts` |
| JSON-LD genérico (migalhas, FAQ, organização) | `lib/blog-seo.ts` (reaproveitado) |
| Template visual | `components/solucoes/pagina-solucao.tsx` |
| CSS das páginas | `components/solucoes/solucao-style.tsx` |
| Cola rota ↔ dado (metadata + JSON-LD) | `components/solucoes/rota.tsx` |
| Injetor de JSON-LD | `components/jsonld.tsx` |
| Bloco de links no fim dos posts | `components/blog/solucoes-relacionadas.tsx` |

**Uma fonte só.** O texto de `lib/solucoes*.ts` e `lib/cidades.ts` alimenta ao
mesmo tempo o HTML, o JSON-LD e o Markdown para agentes. O Markdown é **gerado**
(`markdownDaSolucao` em `lib/agentes/paginas.ts`), não escrito à mão — uma
segunda cópia divergiria na primeira correção de preço.

---

## 4. Regras de conteúdo — leia antes de escrever

Estas páginas são afirmação pública sobre o produto, indexadas e citadas por
buscadores com IA. Não é copy de landing page: é o que um comprador vai usar
para decidir.

### 4.1 Só entra o que o sistema faz hoje

Preço, prazo de teste e telefone espelham `components/site/precos.tsx`,
`faq.tsx` e `tokens.ts`. Mudou lá, muda aqui — a mesma regra que já vale para
`lib/agentes/paginas.ts`.

### 4.2 A página de cancela tem um limite explícito

**Não existe, hoje, nenhum código de integração com cancela neste repositório**
— nem driver, nem controladora, nem endpoint. "Integrações via API" está na
seção *Planejado* do roadmap (`components/site/secoes.tsx`).

O que a página afirma, e é verdade: onde o equipamento **expõe** uma interface,
a integração é possível e é avaliada caso a caso.

O que **não pode** ser escrito ali enquanto não houver implementação e um
equipamento homologado:

- "já integramos com &lt;marca&gt;"
- "compatível com &lt;modelo&gt;"
- qualquer lista de fabricantes

O aviso completo está no topo de `lib/solucoes-cancela.ts`.

### 4.3 Cidades não são um molde com o topônimo trocado

Gerar N páginas a partir de um template mudando só o nome da cidade é o padrão
que o Google chama de **doorway page**. A punição não é a página ranquear mal —
é o site inteiro perder confiança.

Cada cidade foi escrita sobre o contexto real de operar um pátio ali:

| Cidade | Ângulo |
| --- | --- |
| São Paulo | escala, rede multi-pátio, garagem de subsolo sem sinal |
| Rio de Janeiro | pico e sazonalidade — orla, evento, alta temporada |
| Recife | origem: a plataforma nasceu numa operação de pátio da região |
| Olinda | sítio histórico (não se faz obra) e pátio de temporada |
| Jaboatão | pátio de bairro, dono que não fica no pátio |

Medição no HTML gerado, dentro do `<main>` (fora de cabeçalho e rodapé, que são
iguais no site todo): **45% de sobreposição de vocabulário em média** entre
pares de cidades. Doorway pages ficam acima de ~80%. O comando que mede está na
seção 10.

**Acrescentar uma cidade exige escrever a página.** Copiar a de cima e trocar o
nome desfaz a proteção inteira.

### 4.4 Nada de prova social inventada

Nenhuma afirmação sobre clientes, número de pátios atendidos ou depoimento por
cidade enquanto não houver caso real e verificável para citar.

> **Esta é a maior fraqueza das páginas de cidade hoje.** Um cliente por cidade
> que autorize ser citado vale mais do que qualquer texto. O lugar dele está
> marcado no topo de `lib/cidades.ts`.

### 4.5 O dado estruturado tem de bater com o texto visível

O `FAQPage` de cada página é montado da **mesma lista** que o acordeão renderiza.
Declarar em JSON-LD uma resposta que não está na página é motivo de ação manual
do Google.

---

## 5. Dados estruturados

A home não publicava **nenhum** JSON-LD antes deste trabalho — só o blog
publicava. Hoje a home publica quatro blocos, referenciados entre si por `@id`
(organização ← site ← produto), de modo a serem lidos como uma entidade só
descrita em partes:

| Bloco | Onde |
| --- | --- |
| `Organization` | `lib/blog-seo.ts` (fonte única do `@id`) |
| `WebSite` | `lib/site-seo.ts` |
| `SoftwareApplication` + `Offer` | `lib/site-seo.ts` |
| `FAQPage` | montado de `FAQ_HOME` em `components/site/faq.tsx` |

Cada página do silo publica `WebPage` + `BreadcrumbList` + `FAQPage`.

> ⚠️ O `@id` da organização precisa ser **byte a byte o mesmo** em todas as
> páginas. Por isso `lib/site-seo.ts` importa `schemaOrganizacao` de
> `lib/blog-seo.ts` em vez de redefinir. Dois `@id` diferentes viram duas
> entidades para o Google, não uma citada várias vezes.

### O que foi deixado de fora de propósito

- **`aggregateRating`** — nota agregada exige avaliação real e verificável.
  Inventar uma é motivo de ação manual, além de ser mentira.
- **`LocalBusiness`** — exige endereço físico. Não temos um para publicar.
- **`SearchAction`** no `WebSite` — a única busca interna (`/blog/busca`) é
  bloqueada no `robots.txt`. Anunciar uma caixa de busca que o Google não pode
  rastrear não rende nada.

---

## 6. Ligação interna

É por onde a autoridade circula. Em ordem de força:

1. **Cabeçalho** (`components/site/site-header.tsx`) — "O sistema" aponta para o
   pilar. Está em todas as páginas do site; é o link interno mais forte que
   existe.
2. **Rodapé** (`components/site/secoes.tsx`) — coluna "Soluções" com as cinco
   páginas de assunto. Também site-wide, inclusive em cada post do blog.
3. **Corpo dos posts** (`components/blog/solucoes-relacionadas.tsx`) — bloco
   depois do artigo. Link no corpo passa mais autoridade do que link de rodapé,
   e quem leu o artigo inteiro é quem vale mandar para a página de produto.
4. **Contextual entre páginas** — o campo `link` de cada seção e o `relacionados`
   no pé.

> O ponto de virada do menu foi de `md` para `lg`: com sete itens mais a marca e
> os dois botões, a barra não cabe em 768 px. Não volte para `md` sem tirar um
> item.

---

## 7. Como acrescentar uma página

### Uma página de assunto

1. Escreva o objeto `PaginaSolucao` em `lib/solucoes.ts` e exporte-o.
2. Acrescente-o ao array `SOLUCOES` (entra sozinho no sitemap, no rodapé, no
   bloco do blog e na camada de agentes).
3. Crie `app/(site)/<caminho>/page.tsx` com três linhas, copiando uma existente.
4. Acrescente o caminho a `PAGINAS_MARKDOWN` em `next.config.ts`.
5. Se o caminho não casar com a expressão `SILO_MARKDOWN` do `middleware.ts`,
   ajuste-a.
6. Se a página abre com hero escuro, acrescente o caminho a `ROTAS_ESCURAS` em
   `site-header.tsx`, senão o cabeçalho fica com texto escuro sobre fundo
   escuro.

### Uma cidade

1. **Escreva** a página em `lib/cidades.ts` — ver 4.3. Declare o `Cidade` com
   `nome` e `locativo` (a preposição correta: "no Rio de Janeiro", não "em Rio
   de Janeiro" — concatenar `em ${nome}` denuncia página gerada por molde).
2. Acrescente ao array `CIDADES`. Rota, sitemap, `generateStaticParams` e
   Markdown seguem sozinhos.
3. Rode a medição da seção 10 e confira que a sobreposição ficou abaixo de 60%.

Slug fora da lista dá **404** (`dynamicParams = false`) — cidade sem conteúdo
escrito não deve existir nem por um instante.

---

## 8. Dois defeitos encontrados e corrigidos

### O FAQ da home entregava 1 de 7 respostas ao rastreador

`components/site/faq.tsx` era um componente de cliente que renderizava só a
resposta aberta:

```jsx
{open && <div>{item.a}</div>}   // as outras seis não existiam no HTML
```

Visualmente idêntico ao de hoje e, para um rastreador, uma página com uma
resposta em vez de sete. Virou `<details>` nativo: todo o texto no HTML da
primeira resposta, abre e fecha sem JavaScript, acessível por teclado. O
atributo `name` faz o conjunto se comportar como acordeão — que era o
comportamento do estado do React.

Confirmado no HTML gerado: antes 1 resposta, depois 7.

> **Não volte a esconder resposta atrás de estado do React** — aqui, nas páginas
> de solução ou em qualquer FAQ novo.

### A home não publicava nenhum dado estruturado

Ver seção 5.

---

## 9. Problemas conhecidos, em aberto

### 9.1 O Cloudflare serve HTML cacheado ignorando `Accept`

**Confirmado em produção em 06/08/2026.** Uma requisição com
`Accept: text/markdown` numa URL do site recebe o HTML cacheado, porque o
`Vary` da resposta não inclui `Accept`:

```
vary: rsc, next-router-state-tree, next-router-prefetch, ..., Accept-Encoding
cf-cache-status: HIT
```

O `next.config.ts` **declara** `Vary: Accept` para essas rotas, mas o Next
sobrescreve o cabeçalho com o dele. Tentar corrigir pelo middleware **não
funciona**: as rotas são servidas do cache de prerender
(`x-nextjs-cache: HIT`), que emite o próprio `Vary`.

O `AGENT-READINESS.md` previu exatamente isto ("se algum dia entrar uma Cache
Rule para HTML, confira o comportamento de `Vary`"). A Cache Rule entrou em
31/07/2026 (`DEPLOY-PRODUCAO.md`, seção 5.2) e ninguém ligou os dois documentos.

**Impacto real: baixo.** O sufixo `.md` funciona normalmente (URL própria, o
cache não confunde) e é ele que o cabeçalho `rel="alternate"` anuncia — agentes
continuam servidos. O que se perde é a negociação de conteúdo na URL canônica.

**Saída, quando alguém for resolver:** uma Transform Rule no Cloudflare
acrescentando `Vary: Accept`, ou uma regra de bypass de cache para requisições
com `Accept: text/markdown`.

### 9.2 O cache de borda está muito mais velho do que o documentado

O `DEPLOY-PRODUCAO.md` (5.2) diz que o Edge TTL foi fixado em **1 hora**,
justamente para o `s-maxage=31536000` do Next não congelar o site. Em
06/08/2026, depois de um deploy, a home estava sendo servida com
`age: 145915` — **cerca de 40 horas**, portanto anterior ao deploy.

Consequência: o JSON-LD da home e a correção do FAQ subiram para a origem e
**não chegaram ao visitante nem ao Googlebot** até o purge manual.

Confira a Cache Rule. Se o TTL estiver mesmo no `s-maxage` do Next, todo deploy
futuro fica invisível até alguém lembrar de purgar.

> **Depois de todo deploy que mexa na home: purgue.**
> Caching → Configuration → Purge Cache → Custom Purge → URL →
> `https://nuvempark.com/`
>
> Para conferir se a borda já tem o que você publicou, compare com a origem:
> ```bash
> curl -s https://nuvempark.com/            | grep -c 'ld+json'   # borda
> curl -s "https://nuvempark.com/?cb=$$"    | grep -c 'ld+json'   # origem
> ```

---

## 10. Verificação

```bash
# Hierarquia de títulos de uma página
F=.next/server/app/sistema-para-estacionamento.html
grep -o '<h[123][^>]*>[^<]*' "$F" | sed 's/<h\([123]\)[^>]*>/H\1: /'

# Tipos de JSON-LD publicados
grep -o '"@type":"[^"]*"' "$F" | sort | uniq -c

# As respostas do FAQ estão no DOM visível (não só no JSON-LD)?
# `grep -o | wc -l` e não `grep -c`: o HTML vem numa linha só, e `-c` conta
# LINHAS que casam — devolveria 1 com seis acordeões na página.
perl -0pe 's{<script type="application/ld\+json">.*?</script>}{}gs' "$F" \
  | grep -o '<details' | wc -l
# = itens de `faq` da página + 1 (o Next emite um <details> próprio).
# Se der 1, alguém voltou a esconder resposta atrás de estado do React.

# Sobreposição de conteúdo entre as páginas de cidade (ver 4.3)
python3 - <<'PY'
import re, pathlib, itertools
D = pathlib.Path(".next/server/app/sistema-para-estacionamento")
cid = ["sao-paulo","rio-de-janeiro","recife","olinda","jaboatao-dos-guararapes"]
def texto(f):
    h = f.read_text(encoding="utf-8", errors="ignore")
    h = re.sub(r"<script.*?</script>|<style.*?</style>", " ", h, flags=re.S)
    m = re.search(r"<main.*?</main>", h, flags=re.S)   # fora de header/footer
    h = re.sub(r"<[^>]+>", " ", m.group(0) if m else h)
    return set(w for w in re.findall(r"[a-zà-ú]{4,}", h.lower()))
T = {c: texto(D/f"{c}.html") for c in cid}
for a,b in itertools.combinations(cid,2):
    j = len(T[a]&T[b])/len(T[a]|T[b])
    print(f"{j:.0%}  {a} x {b}{'   <-- ALTO' if j > .6 else ''}")
PY
```

Em produção:

```bash
# As páginas respondem e o slug inexistente é 404 de verdade
for p in sistema-para-estacionamento cancela-para-estacionamento \
         sistema-para-estacionamento/recife sistema-para-estacionamento/curitiba; do
  printf "%-46s %s\n" "/$p" \
    "$(curl -s -o /dev/null -w '%{http_code}' "https://nuvempark.com/$p")"
done   # as três primeiras 200, a última 404

# Markdown para agentes
curl -s https://nuvempark.com/sistema-para-estacionamento.md | head -5
```

---

## 11. O que o código não faz

Estrutura é condição necessária, não suficiente. Faltam, e não saem daqui:

- **Backlinks.** É o fator que mais separa quem ranqueia de quem não ranqueia
  nesses termos, e nenhuma linha de código produz um.
- **Search Console.** As URLs precisam ser registradas e ter indexação
  solicitada. Só pelo sitemap, a descoberta leva semanas — e as páginas de
  cidade, por serem cauda longa, são as que mais sofrem com isso.
- **Prova social real.** Ver 4.4.
- **Tempo.** Página nova não ranqueia em termo de cabeça no primeiro mês.
