# Auditoria de responsividade — painel web NuvemPark

Breakpoints de trabalho: **360px** (mobile pequeno), **390px** (mobile comum), **768px** (`md`/tablet), **1024px+** (`lg`/desktop = referência, não pode regredir).

Tailwind 4. Estado: **nenhuma tela do painel funciona bem < `lg`** porque o shell compartilhado (sidebar `w-64` fixa, sem header/drawer) engole a viewport em todos os caminhos. Consertar o shell uma vez resolve a categoria **A** de todas as rotas do painel e do master.

## Categorias de problema

- **A. Shell/navegação** — `aside w-64` (256px) sempre visível, sem hambúrguer/drawer; `main p-8` fixo; root layout **sem `export const viewport`**.
- **B. Tabelas** — colunas estouram a viewport < `md`.
- **C. Grids/cards** — colunas fixas que não colapsam.
- **D. Formulários/modais** — inputs lado a lado / modais maiores que a tela.
- **E. Gráficos** — Recharts com largura fixa / labels colidindo.
- **F. Tipografia/espaçamento** — paddings/fontes grandes demais no mobile.

## Componentes de layout compartilhados (maior alavanca)

| Componente | Arquivo | Papel | Ação |
|---|---|---|---|
| Root layout | `src/app/layout.tsx` | `<html><body>` | **+ `export const viewport`** (Bloco 1) |
| Painel layout | `src/app/painel/layout.tsx` | `aside w-64` + `main p-8` | shell responsivo com drawer (Bloco 1) |
| Master layout | `src/app/master/(console)/layout.tsx` | `aside w-64` + `main p-8` | mesmo shell responsivo (Bloco 1/4) |
| `SidebarNav` | `src/components/sidebar-nav.tsx` | menu accordion | fecha ao navegar dentro do drawer |
| `PatioSeletor` | `src/components/patio-seletor.tsx` | seletor de pátio | vai para dentro do drawer no mobile |
| `MasterNav` | `src/components/master/master-nav.tsx` | menu do master | fecha ao navegar dentro do drawer |

## Inventário por rota

### Público / marketing — `(site)` e autenticação

| Rota | Problemas 360–768px | Componentes | Severidade |
|---|---|---|---|
| `/` (site) | Verificar hero/seções (marketing costuma já ser fluido) | `(site)/page.tsx` | Baixa |
| `/precos` `/recursos` `/sobre` `/contato` `/novidades` | Verificar grids de seção | `(site)/*` | Baixa |
| `/login` `/cadastro` | Validar centralização e alvo de toque em 360px | `login/page.tsx`, `cadastro/page.tsx` | Baixa (D) |
| `/master/login` | Idem login | `master/login/page.tsx` | Baixa (D) |
| `/painel/bloqueado` | Card de bloqueio; validar padding | `painel-bloqueio` | Baixa (F) |
| `/t/[id]` (ticket público) | Página do cliente; validar largura/tipografia em 360px | `ticket-publico/ticket-cliente.tsx` | Média (D/F) |

### Painel do gestor — `/painel/*` (todas herdam **A**)

| Rota | Problemas 360–768px | Componentes | Severidade |
|---|---|---|---|
| `/painel` (dashboard) | A; grid de KPIs não colapsa (**C**); gráficos Recharts largura fixa (**E**); tabela "recentes" estoura (**B**) | `dashboard-live.tsx` | **Alta** |
| `/painel/caixa` | A; tabela de sessões estoura (**B**) | `caixa/page.tsx` | Alta |
| `/painel/caixa/[id]` | A; tabela de movimentos (**B**); grid de totais (**C**) | `caixa/[id]/page.tsx` | Alta |
| `/painel/movimentos` | A; **tabela larga** (placa/tipo/entrada/saída/valor/operador) → **card layout < md** (**B**) | `movimentos/movimentos-client.tsx` | **Alta** |
| `/painel/patio` | A; tabela de ocupação (**B**) | `patio/patio-lista.tsx` | Alta |
| `/painel/removidos` | A; tabela + filtros (**B/D**) | `removidos/page.tsx`, `removidos-filtros.tsx` | Alta |
| `/painel/historico` | A; tabela de auditoria (**B**) | `historico/historico-client.tsx` | Alta |
| `/painel/ocupacao` | A; gráficos Recharts (**E**); grid | `ocupacao/ocupacao-client.tsx` | Alta |
| `/painel/relatorios` | A; gráficos Recharts (**E**) | `relatorios/page.tsx` + client | Alta |
| `/painel/financeiro/pix-online` | A; tabela (**B**) | `financeiro/pix-online/page.tsx` | Média |
| `/painel/financeiro/prestacao` | A; tabelas + impressão (**B**) | `prestacao/prestacao-client.tsx` | Alta |
| `/painel/financeiro/resultados` | A; grid + gráfico (**C/E**) | `financeiro/resultados/page.tsx` | Média |
| `/painel/mensalistas` | A; **tabela larga** → **card layout < md** (**B**) | `mensalistas/mensalistas-client.tsx` | **Alta** |
| `/painel/mensalistas/novo` | A; formulário (**D**) | `mensalistas/novo/page.tsx` | Média |
| `/painel/mensalistas/planos` | A; grid/tabela de planos (**B/C**) | `mensalistas/planos/page.tsx` | Média |
| `/painel/tarifas` | A; tabela/lista + modal simulador (**B/D**) | `tarifas/page.tsx`, `simulador-modal.tsx` | Alta |
| `/painel/tarifas/nova` | A; formulário longo (**D**) | `tarifas/nova/page.tsx` | Alta |
| `/painel/operadores` | A; tabela (**B**) | `operadores/page.tsx` | Média |
| `/painel/operadores/novo` | A; formulário (**D**) | `operadores/novo/page.tsx` | Média |
| `/painel/patios` | A; grid de cards (**C**) | `patios/page.tsx` | Média |
| `/painel/patios/novo` | A; formulário (**D**) | `patios/novo/page.tsx` | Média |
| `/painel/tipos-veiculo` | A; lista/form (**B/D**) | `tipos-veiculo/page.tsx` | Média |
| `/painel/assinatura` | A; tabela faturas + cards (**B/C**) | `assinatura/assinatura-client.tsx` | Média |
| `/painel/configuracoes` | A; grids de formulário lado a lado (**D**) | `configuracoes/configuracoes-client.tsx` | Alta |
| `/painel/perfil` | A; formulário (**D**) | `perfil/perfil-client.tsx` | Média |
| `/painel/impressao` | A; preview do ticket + form (**D**) | `impressao/impressao-client.tsx` | Média |

### Console master — `/master/*` (todas herdam **A**; refino = scroll horizontal, sem cards)

| Rota | Problemas 360–768px | Componentes | Severidade |
|---|---|---|---|
| `/master` | A; grid de métricas (**C**) | `master/(console)/page.tsx` | Média |
| `/master/financeiro` | A; grid/gráfico (**C/E**) | `master/(console)/financeiro/page.tsx` | Média |
| `/master/financeiro/faturas` | A; tabela (**B**) | `master/faturas-client.tsx` | Média |
| `/master/financeiro/inadimplencia` | A; tabela (**B**) | `master/inadimplencia-client.tsx` | Média |
| `/master/tenants` | A; tabela (**B**) | `master/tenants/page.tsx` | Média |
| `/master/recibo/[id]` | Layout de impressão; validar em tela estreita | `master/recibo/[id]/page.tsx` | Baixa |

## Colunas ocultadas < `md` por tabela (Bloco 2)

Wrapper `ResponsiveTable` (overflow-x + fades) aplicado a todas as tabelas abaixo. Identificador principal, status/valor e ação ficam sempre visíveis.

| Tabela | Arquivo | Ocultadas < md (`hidden md:table-cell`) |
|---|---|---|
| Movimentos | `movimentos/movimentos-client.tsx` | **card layout < md** (sem tabela no mobile); tabela completa md+ |
| Mensalistas | `mensalistas/mensalistas-client.tsx` | já era lista/cards; ajuste de densidade mobile |
| Últimos movimentos (dashboard) | `dashboard-live.tsx` | Tipo (Bloco 3) |
| Sessões de caixa | `caixa/page.tsx` | Fechamento, Fundo |
| Caixa detalhe | `caixa/[id]/page.tsx` | sem tabela (grid + `ul`) |
| Veículos no pátio | `patio/patio-lista.tsx` | Entrada, Operador |
| Tickets removidos | `removidos/page.tsx` | Entrada, Por (operador) |
| Diff histórico | `historico/historico-client.tsx` | nenhuma (diff de 3 colunas) |
| Pix Online | `financeiro/pix-online/page.tsx` | Gerado |
| Prestação — movimentos | `prestacao/prestacao-client.tsx` | Operador, Fundo, Entradas, Sangrias, Esperado |
| Faturas / Inadimplência | `master/faturas-client.tsx`, `inadimplencia-client.tsx` | já eram cards (sem tabela) |
| Redes/tenants | `master/tenants-client.tsx` | Código, Pátios |
| Operadores | `operadores/operadores-client.tsx` | Usuário |

## Status de resolução

| Bloco | Escopo | Status |
|---|---|---|
| 0 | Auditoria | ✅ este arquivo |
| 1 | Shell responsivo (sidebar drawer + header + container + viewport) | ⬜ |
| 2 | Tabelas (wrapper + cards em movimentos/mensalistas) | ⬜ |
| 3 | Grids, dashboard e gráficos | ⬜ |
| 4 | Formulários, modais e telas públicas | ⬜ |
| 5 | Varredura final 360/768 + build | ⬜ |
