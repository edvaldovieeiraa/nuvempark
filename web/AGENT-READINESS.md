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
| Sufixo `.md` | `/precos.md`, `/blog/<slug>.md`, `/index.md` | idem |
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
conteúdo em Markdown das páginas institucionais é escrito à mão em
`lib/agentes/paginas.ts`; os posts do blog saem do `conteudo_md` do banco, que
já é Markdown.

> ⚠️ **A lista de páginas com Markdown aparece em três arquivos** e as três têm
> de andar juntas: `lib/agentes/paginas.ts` (conteúdo), `middleware.ts` (quem
> reescreve) e `next.config.ts` (quem anuncia o `rel="alternate"`). O middleware
> não importa a lista porque roda no Edge e não deve carregar o Markdown do site
> inteiro no bundle.

### Cloudflare

Todas as respostas negociadas levam `Vary: Accept`. Isso basta hoje porque o
Cloudflare não cacheia HTML por padrão — mas se algum dia entrar uma Cache Rule
para HTML, **confira o comportamento de `Vary`** antes: o Cloudflare ignora
`Vary` (exceto `Accept-Encoding`), e uma regra de cache mal posta passaria a
servir Markdown para navegador. Nesse cenário, a saída é excluir do cache as
requisições com `Accept: text/markdown`.

### Verificação

```bash
# Markdown por negociação de conteúdo (deve vir text/markdown + Vary: Accept)
curl -sI -H 'Accept: text/markdown' https://nuvempark.com/precos

# Markdown por sufixo
curl -s https://nuvempark.com/precos.md | head -20

# HTML continua HTML (nada de Markdown para navegador)
curl -sI https://nuvempark.com/precos | grep -i content-type

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
