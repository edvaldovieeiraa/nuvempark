# Agent readiness — o site visto por um agente de IA

Diagnóstico de origem: varredura do `isitagentready.com` em 29/07/2026,
nota **29/100 ("Bot-Aware")**. Este documento registra o que foi implementado, o
que ficou de fora e por quê.

O princípio: um agente que chega em `nuvempark.com` deveria conseguir responder
"o que é isso, quanto custa, funciona offline?" sem baixar 200 KB de HTML nem
interpretar componentes React com estilo inline.

---

## Implementado

| Item | URL pública | Onde mora |
| --- | --- | --- |
| Índice para LLMs | `/llms.txt` | `app/llms.txt/route.ts` → `lib/agentes/llms.ts` |
| Site inteiro em texto | `/llms-full.txt` | `app/llms-full.txt/route.ts` |
| Guia em `text/markdown` | `/.well-known/agents.md` | `app/api/agentes/guia/route.ts` (rewrite) |
| Negociação de Markdown | qualquer página pública | `middleware.ts` → `app/api/agentes/md/` |
| Sufixo `.md` | `/sistema-para-estacionamento.md`, `/blog/<slug>.md`, `/index.md` | idem |
| `Link` de descoberta | cabeçalho de resposta | `next.config.ts` |
| Catálogo de APIs (RFC 9727) | `/.well-known/api-catalog` | `app/api/agentes/api-catalog/route.ts` (rewrite) |
| Descrição OpenAPI 3.1 | `/openapi.json` | `app/openapi.json/route.ts` |

Já existiam antes: `robots.txt` (com as regras de bots de IA), `sitemap.xml`,
`blog/rss.xml` e os Content Signals injetados pelo Cloudflare.

### Como o Markdown é servido

Três caminhos, um handler só (`app/api/agentes/md/[[...caminho]]/route.ts`):

1. `Accept: text/markdown` na URL normal (negociação de conteúdo);
2. sufixo `.md` no caminho;
3. `/index.md` para a home.

O middleware reescreve internamente; o agente nunca vê `/api/` na URL. O
Markdown vem de três origens, todas em `lib/agentes/paginas.ts`:

- a **home** é escrita à mão (é o site onepage inteiro num documento só);
- as **páginas do silo de busca** e as de **cidade** são geradas a partir de
  `lib/solucoes*.ts` e `lib/cidades.ts` — a mesma fonte que produz o HTML, para
  as duas versões não divergirem na primeira correção de preço (ver `SEO.md`);
- os **posts do blog** saem do `conteudo_md` do banco, que já é Markdown.

> ⚠️ **A lista de páginas com Markdown aparece em três arquivos** e as três têm
> de andar juntas: `lib/agentes/paginas.ts` (conteúdo), `middleware.ts` (quem
> reescreve) e `next.config.ts` (quem anuncia o `rel="alternate"`). O middleware
> não importa a lista porque roda no Edge e não deve carregar o Markdown do site
> inteiro no bundle.
>
> Atualizado em 06/08/2026: no middleware, o silo de páginas comerciais
> (`/sistema-para-estacionamento` e irmãs, mais as filhas de cidade) é casado
> por **expressão regular** (`SILO_MARKDOWN`) em vez de enumerado. Acrescentar
> uma cidade em `lib/cidades.ts` não deve exigir lembrar de editar o Edge. Slug
> inexistente não é problema: o handler responde 404 em Markdown para caminho
> sem conteúdo. Ver `SEO.md`.

### Cloudflare

Todas as respostas negociadas levam `Vary: Accept`. Isso bastava enquanto o
Cloudflare não cacheava HTML — mas se algum dia entrasse uma Cache Rule para
HTML, avisamos aqui que seria preciso **conferir o comportamento de `Vary`**.

> 🔴 **A Cache Rule entrou em 31/07/2026** (`DEPLOY-PRODUCAO.md`, seção 5.2) e o
> cenário previsto **aconteceu**. Confirmado em produção em 06/08/2026:
> `Accept: text/markdown` numa URL do site devolve o HTML cacheado, porque o
> `Vary` da resposta não inclui `Accept` — o Next sobrescreve o cabeçalho
> declarado no `next.config.ts`, e as rotas são servidas do cache de prerender,
> então o middleware também não consegue corrigir.
>
> **Impacto real: baixo.** O sufixo `.md` tem URL própria, não é afetado, e é
> ele que o `rel="alternate"` anuncia — agentes continuam servidos. O que se
> perde é a negociação de conteúdo na URL canônica.
>
> Saída, quando alguém for resolver: Transform Rule no Cloudflare acrescentando
> `Vary: Accept`, ou bypass de cache para requisições com
> `Accept: text/markdown`. Detalhes em `SEO.md`, seção 9.1.

### Verificação

```bash
# Markdown por negociação de conteúdo (deve vir text/markdown + Vary: Accept)
curl -sI -H 'Accept: text/markdown' https://nuvempark.com/sistema-para-estacionamento

# Markdown por sufixo
curl -s https://nuvempark.com/sistema-para-estacionamento.md | head -20

# HTML continua HTML (nada de Markdown para navegador)
curl -sI https://nuvempark.com/sistema-para-estacionamento | grep -i content-type

# Link de descoberta
curl -sI https://nuvempark.com/ | grep -i '^link'

# Recursos de máquina
curl -s https://nuvempark.com/llms.txt | head -30
curl -s https://nuvempark.com/.well-known/api-catalog
curl -s https://nuvempark.com/openapi.json | head -20
```

### Escopo do OpenAPI

Só o grupo `/api/public/v1/ticket` da nuvempark-api: é o único aberto sem
credencial e destinado a quem não é a nossa operação (o cliente que escaneou o
QR do cupom). `/api/mobile/v1/patio` e os webhooks do PSP **não** entram —
exigem token de dispositivo ou assinatura do gateway, e documentá-los só
ajudaria quem quer sondá-los.

Consequência a ter em mente: a descrição pública deixa explícito que
`GET /ticket/<uuid>` devolve placa e nome do pátio. A proteção continua sendo a
mesma de antes (UUID não adivinhável, 404 genérico para tudo o que não pode ser
visto, 30 req/min por IP) — o que mudou é que agora está escrito. Se algum dia
isso incomodar, a saída é mascarar a placa na API, não esconder a documentação.

---

## Não implementado (e o que cada um exige)

### DNS for AI Discovery (DNS-AID)

Registro `TXT` em `_agent.nuvempark.com` apontando para uma interface de agente.
Custa 2 minutos no Cloudflare, **mas só faz sentido apontando para algo que
exista** — na prática, um servidor MCP. Confirmar o formato exato de chaves na
especificação antes de publicar (algo como
`v=aid1;uri=https://nuvempark.com/openapi.json;proto=openapi`); um registro
malformado é pior do que nenhum.

### Web Bot Auth

Verificar assinaturas HTTP (RFC 9421) de agentes que se identificam, para
liberá-los de rate limit/desafio. O lugar natural disso é o Cloudflare, que já
está na frente de tudo — provavelmente configuração, não código. Vale investigar
antes de escrever qualquer coisa na aplicação.

### Servidor MCP + `/.well-known/mcp.json`

O item de maior valor real do relatório: um MCP server HTTP read-only exporia
"consultar ticket" e "valor da estadia" para qualquer cliente MCP. É build de
verdade na nuvempark-api (transporte, tools, testes), não configuração.

### OAuth 2.0 (discovery, RFC 9728, registro dinâmico RFC 7591)

Só faz sentido junto de uma decisão de produto: abrir a API a terceiros. Hoje a
API pública não tem credencial (a identidade é a posse do UUID do ticket) e a
API do app usa token de dispositivo. Sem essa decisão, publicar metadados de
OAuth seria anunciar uma porta que não existe.

### Agent Skills index / WebMCP

`WebMCP` expõe ferramentas via JavaScript na página (`window.navigator`
`.modelContext`), para o agente que roda dentro do navegador. Interessante para o
painel do gestor, irrelevante para a landing.

### Protocolos de commerce (a2C, MPP, UCP, ACP)

Opcionais no relatório e sem caso de uso: o pagamento do NuvemPark é Pix
brasileiro dentro da página do ticket, não checkout de e-commerce para agente.

---

## Manutenção

O Markdown de `lib/agentes/paginas.ts` é **conteúdo**, não fonte de verdade.
Quando preço, telefone ou prazo do teste mudarem nas páginas React, mudam ali
também — um agente citando R$ 129,90 quando o site já cobra outro valor é pior
do que não ter Markdown nenhum.
