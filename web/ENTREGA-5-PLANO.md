# Entrega 5 — Prestação de Contas = gerador de relatórios (plano)

> Escopo: **só `web/`**. Gate: `npm run build` ok. Obedece ao pátio do menu lateral
> (sem seletor próprio). Ignorar mensalidades canceladas (`cancelado_em IS NULL`).

## Dados (todos via sessão do usuário — RLS, zero service_role)
- `caixa_sessoes`: id, operador_id, operador_nome, fundo_caixa, total_fechamento,
  abertura, fechamento, observacao_fechamento, status, patio_id.
- `caixa_movimentos`: caixa_sessao_id, tipo ('entrada'|'sangria'|'isencao'), valor,
  descricao, forma_pagamento, ticket_id, criado_em, patio_id.
- `tickets`: entrada, saida, status, valor_cobrado, forma_pagamento, motivo_isencao,
  operador_id, tipo_veiculo, patio_id.
- `mensalidade_pagamentos`: competencia, valor, forma_pagamento, pago_em, origem
  ('app'|'painel'), registrado_por_nome, cancelado_em, patio_id.

## 2A — Configuração (client)
- Intervalo de datas **obrigatório** + presets: hoje / ontem / 7 dias / mês atual.
- Operador: select default "Todos" (lista distinct de operador_nome do pátio; via
  server action `listarOperadores(patioId)` ou derivar de caixa_sessoes/tickets).
- 7 checkboxes (todas marcadas por padrão):
  1. Resumo dos movimentos (aberturas/fechamentos no período, fundo, total, divergências)
  2. Resumo dos pagamentos (tickets pagos: qtd, total, ticket médio)
  3. Resumo dos pagamentos de mensalidade (qtd, total, por forma; separar origem app/painel)
  4. Resumo das receitas (entradas de caixa: tickets + mensalidades + outras entradas)
  5. Resumo das despesas (sangrias: qtd, total, descrições)
  6. Resumo das formas de pagamento (valor/qtd/% por forma, consolidando tickets+mensalidades)
  7. Totalizador (receitas − despesas, em destaque)
- Filtro de data aplica-se: caixa por `fechamento`; tickets por `saida` (pagos) e status
  'fechado'; mensalidades por `pago_em`; sangrias por `criado_em`.

## 2B — Progresso REAL por etapas
- Server actions **por seção** — cada seção selecionada = 1 etapa. Ex.: `gerarMovimentos`,
  `gerarPagamentosTickets`, `gerarPagamentosMensalidade`, `gerarReceitas`, `gerarDespesas`,
  `gerarFormasPagamento`, `gerarTotalizador`. Cada uma consulta SÓ o seu dado.
- Client chama as selecionadas EM SEQUÊNCIA; barra = concluídas/total; rótulo
  "Buscando movimentos… 2/7"; check por etapa. Seções desmarcadas NÃO são consultadas.
- Totalizador depende de Receitas+Despesas → se marcado, garantir que seus números
  sejam derivados dos resultados já buscados (não refazer query redundante) OU consulta
  própria enxuta. Nada de % artificial.

## 2C — Relatório visual (skill frontend-design)
- Cabeçalho: pátio, período, operador, "gerado por <email> em <data/hora>".
- Números grandes para totais; tabelas enxutas; **Totalizador em destaque** (card grande,
  receitas − despesas, verde/vermelho). Estado vazio por seção ("sem movimentos no período").
- Componentes reutilizáveis de card/tabela; tokens do design system (bg-superficie, borda,
  texto-2/3, brand, perigo, aviso). Layout limpo, respirável.

## 2D — Exportação
- **PDF client-side com jsPDF + jspdf-autotable** (justificativa: MIT, mantido, leve,
  **texto selecionável** (não rasteriza), `autoTable` faz paginação automática e
  **repete o cabeçalho por página** em multi-página). Import dinâmico no client
  (`await import('jspdf')`) para não quebrar SSR do Next 16.
  - `npm i jspdf jspdf-autotable` em web/.
  - Nome do arquivo: `prestacao-contas-<patioSlug>-<inicio>-<fim>.pdf`.
  - Cabeçalho por página (pátio/período) via `didDrawPage`.
- Botão **Imprimir** (window.print) como via secundária + bloco `@media print` no globals
  (esconder navegação/sidebar; só o relatório).

## Arquitetura de arquivos
- `web/src/app/painel/financeiro/prestacao/page.tsx` — server: resolve pátio, passa
  patioId/patioNome/geradoPor(email) ao client. Sem mais tabela inline.
- `web/src/app/painel/financeiro/prestacao/actions.ts` — "use server", 1 action por seção
  (+ listarOperadores). Cada uma recebe {patioId, inicioIso, fimIso, operador?} e devolve
  o resumo daquela seção (tipos exportados). Sessão do usuário (RLS).
- `web/src/components/prestacao/prestacao-client.tsx` — config + progresso + relatório.
- `web/src/components/prestacao/relatorio-pdf.ts` — geração do PDF (import dinâmico).
- (Opcional) `web/src/components/prestacao/secoes.tsx` — componentes visuais das 7 seções.

## Datas / fuso
- Client escolhe datas (YYYY-MM-DD); converte para ISO bordas do dia no fuso local
  (início `T00:00:00`, fim `T23:59:59.999` → toISOString), passa di/df às actions.
- Presets calculados no client (event handlers — new Date() ok fora do render; cuidar do
  lint react-hooks/purity: computar em onClick, não no corpo do componente).

## Gate do Bloco 2
`npm run build` (web) ok; TS estrito zero any; nenhum service_role.
**Entregar SQLs de conferência** (para o usuário validar 1 período no SQL Editor):
```sql
-- Receitas de tickets (pagos) no período
select count(*) qtd, coalesce(sum(valor_cobrado),0) total
from tickets
where patio_id = '<PATIO>' and status = 'fechado'
  and saida >= '<INI>' and saida <= '<FIM>';
-- Mensalidades (ativas) no período
select forma_pagamento, origem, count(*) qtd, sum(valor) total
from mensalidade_pagamentos
where patio_id = '<PATIO>' and cancelado_em is null
  and pago_em >= '<INI>' and pago_em <= '<FIM>'
group by forma_pagamento, origem;
-- Despesas (sangrias) no período
select count(*) qtd, coalesce(sum(valor),0) total
from caixa_movimentos
where patio_id = '<PATIO>' and tipo = 'sangria'
  and criado_em >= '<INI>' and criado_em <= '<FIM>';
-- Formas de pagamento consolidadas (tickets + mensalidades) — conferir manualmente
```
Commit: `Entrega 5: gerador de prestação de contas + PDF`.
