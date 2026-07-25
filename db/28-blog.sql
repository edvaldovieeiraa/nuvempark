-- ============================================================================
-- NuvemPark — Blog público (conteúdo de MARKETING da plataforma)
-- Projeto: xrwrsswhoywzzhutzrjx · 100% IDEMPOTENTE (rodar 2x sem quebrar).
--
-- IMPORTANTE: isto NÃO é dado de tenant. O blog é conteúdo da PLATAFORMA e não
-- tem tenant_id nem passa por current_tenant_id(). A leitura é PÚBLICA (visitante
-- anônimo, sem sessão) e a ESCRITA é exclusiva do service_role (console master).
--
-- Modelo de acesso:
--   anon / authenticated -> SELECT apenas:
--                             posts      : status = 'publicado'
--                             categorias : tudo (são públicas)
--                             autores    : tudo (são públicos)
--                             inscritos  : NADA (nem o próprio e-mail)
--   anon                 -> INSERT em blog_inscritos (captura de e-mail no site)
--   service_role         -> tudo (bypassrls) — é como o master publica/edita.
--
-- Sem policy de INSERT/UPDATE/DELETE para anon/authenticated nas tabelas de
-- conteúdo: quem não tem policy não escreve (RLS é fail-closed).
--
-- OBS: nº da migration = 28. Os números 17 e 27 já estavam ocupados
-- (17-faturas-rls-gestor.sql, 27-bucket-downloads.sql) — mesmo critério usado
-- em db/26 quando o 25 estava ocupado. Rodar DEPOIS de db/01 (fn_set_updated_at).
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- PASSO 1 — Tabelas
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1a) Autores. Hoje é praticamente um registro ("Equipe NuvemPark"), mas a
--     tabela existe para o dia em que os posts forem assinados por pessoas.
-- ----------------------------------------------------------------------------
create table if not exists public.blog_autores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  bio         text,
  avatar_url  text,
  criado_em   timestamptz not null default now()
);

-- Nome único: é o que torna o seed idempotente sem inventar UUID fixo.
create unique index if not exists uq_blog_autores_nome
  on public.blog_autores (nome);

-- ----------------------------------------------------------------------------
-- 1b) Categorias. `ordem` controla a sequência das pílulas de filtro no site.
-- ----------------------------------------------------------------------------
create table if not exists public.blog_categorias (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  slug       text not null unique,
  descricao  text,
  ordem      int  not null default 0,
  criado_em  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 1c) Posts.
--     conteudo_md  : Markdown puro (renderizado server-side no Next).
--     resumo       : vira a meta description — manter entre 140 e 160 chars.
--     faq          : [{pergunta, resposta}] -> vira schema FAQPage (AEO/SEO).
--     seo_titulo   : override opcional do <title>; nulo = usa `titulo`.
--     publicado_em : data pública do post. Só é preenchida ao publicar.
-- ----------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  titulo         text not null,
  resumo         text not null,
  conteudo_md    text not null,
  capa_url       text,
  categoria_id   uuid references public.blog_categorias(id) on delete set null,
  autor_id       uuid references public.blog_autores(id) on delete set null,
  status         text not null default 'rascunho'
                   check (status in ('rascunho','publicado','arquivado')),
  destaque       boolean not null default false,
  faq            jsonb not null default '[]'::jsonb,
  seo_titulo     text,
  palavras_chave text[] not null default '{}'::text[],
  publicado_em   timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

-- Trigger de atualizado_em (mesma fn_set_updated_at do db/01).
drop trigger if exists trg_blog_posts_updated on public.blog_posts;
create trigger trg_blog_posts_updated before update on public.blog_posts
  for each row execute function public.fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- 1d) Inscritos da newsletter ("Receba dicas de gestão de estacionamento").
--     Só INSERT para anon. Ninguém lê a lista pelo anon key — nem o próprio
--     e-mail — para não virar oráculo de "esse e-mail está cadastrado?".
--     O envio (Resend/etc) fica para depois; aqui só guardamos.
-- ----------------------------------------------------------------------------
create table if not exists public.blog_inscritos (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  criado_em  timestamptz not null default now()
);

-- ============================================================================
-- PASSO 2 — Índices
-- ============================================================================

-- Listagem pública: WHERE status='publicado' ORDER BY publicado_em DESC.
create index if not exists idx_blog_posts_status_publicado
  on public.blog_posts (status, publicado_em desc);

-- Listagem por categoria (mesma ordenação).
create index if not exists idx_blog_posts_categoria
  on public.blog_posts (categoria_id, status, publicado_em desc);

-- `slug` já tem índice único implícito pela constraint UNIQUE (blog_posts_slug_key);
-- o mesmo vale para blog_categorias.slug e blog_inscritos.email. Não duplicamos.

-- ============================================================================
-- PASSO 3 — RLS
-- ============================================================================

alter table public.blog_autores    enable row level security;
alter table public.blog_autores    force  row level security;
alter table public.blog_categorias enable row level security;
alter table public.blog_categorias force  row level security;
alter table public.blog_posts      enable row level security;
alter table public.blog_posts      force  row level security;
alter table public.blog_inscritos  enable row level security;
alter table public.blog_inscritos  force  row level security;

-- ── Leitura pública ─────────────────────────────────────────────────────────

drop policy if exists blog_autores_select_publico on public.blog_autores;
create policy blog_autores_select_publico on public.blog_autores
  for select to anon, authenticated
  using (true);

drop policy if exists blog_categorias_select_publico on public.blog_categorias;
create policy blog_categorias_select_publico on public.blog_categorias
  for select to anon, authenticated
  using (true);

-- Rascunho e arquivado NÃO vazam: o filtro mora na policy, não no código.
drop policy if exists blog_posts_select_publicado on public.blog_posts;
create policy blog_posts_select_publicado on public.blog_posts
  for select to anon, authenticated
  using (status = 'publicado');

-- ── Captura de e-mail: só INSERT, e com validação de formato ────────────────

drop policy if exists blog_inscritos_insert_publico on public.blog_inscritos;
create policy blog_inscritos_insert_publico on public.blog_inscritos
  for insert to anon, authenticated
  with check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254);

-- Sem policy de SELECT/UPDATE/DELETE em blog_inscritos: a lista é invisível
-- para anon/authenticated. Só o service_role (master) lê.

-- ============================================================================
-- PASSO 4 — Seed idempotente
-- ============================================================================

-- ── Autor ───────────────────────────────────────────────────────────────────
insert into public.blog_autores (nome, bio)
select 'Equipe NuvemPark',
       'Quem constrói o NuvemPark todo dia — e conversa com dezenas de operadores de estacionamento para entender o que realmente pesa na rotina do pátio.'
where not exists (
  select 1 from public.blog_autores where nome = 'Equipe NuvemPark'
);

-- ── Categorias ──────────────────────────────────────────────────────────────
insert into public.blog_categorias (nome, slug, descricao, ordem) values
  ('Gestão de Estacionamento', 'gestao-de-estacionamento',
   'Rotina do pátio, equipe, tarifas e controle de fluxo — o dia a dia de quem opera.', 1),
  ('Tecnologia', 'tecnologia',
   'Leitura de placa, apps offline, impressão e tudo que faz a operação andar mais rápido.', 2),
  ('Financeiro', 'financeiro',
   'Faturamento, caixa, conciliação, Pix e inadimplência de mensalistas.', 3),
  ('Novidades NuvemPark', 'novidades-nuvempark',
   'O que entrou de novo no produto e como usar no seu pátio.', 4)
on conflict (slug) do nothing;

-- ── Posts de exemplo (publicados, para validar as telas) ────────────────────
-- Idempotência por slug. Se você editar o texto abaixo e rodar de novo, NADA
-- muda no banco (do nothing) — edite pelo console master ou apague o post antes.

insert into public.blog_posts (
  slug, titulo, resumo, conteudo_md, categoria_id, autor_id,
  status, destaque, faq, seo_titulo, palavras_chave, publicado_em
)
select
  'como-controlar-o-faturamento-do-estacionamento',
  'Como controlar o faturamento do estacionamento sem depender do operador',
  'Sete práticas para enxergar quanto o pátio faturou em tempo real, fechar o caixa sem discussão e parar de descobrir problema só no fim do mês.',
  $md$
Se a resposta para "quanto o pátio faturou hoje?" começa com *"deixa eu ligar para o operador"*, o problema não é o operador. É que o dinheiro passa por um lugar onde você não enxerga.

Este guia reúne o que funciona na prática em pátios de 30 a 400 vagas — sem cancela nova, sem obra e sem trocar a equipe.

## 1. Todo carro que entra vira um registro

Parece óbvio, mas é aqui que a maior parte do vazamento acontece. Enquanto a entrada for anotada em papel, existe um espaço entre o que entrou e o que foi cobrado — e esse espaço é onde o faturamento some.

O registro precisa de três coisas para servir de prova:

- **Placa** — identifica o veículo sem depender de memória.
- **Horário exato de entrada** — é o que define a tarifa.
- **Quem registrou** — o operador fica vinculado ao movimento.

Com os três, qualquer divergência no fim do dia tem nome, hora e placa.

## 2. A tarifa não pode morar na cabeça de ninguém

Tabela de preço decorada é tabela de preço negociada. Quando a regra de cobrança está no sistema — primeira hora, hora adicional, diária, tolerância, valor de pernoite —, o preço deixa de ser conversa e vira cálculo.

> O ganho não é o centavo da tarifa. É que ninguém precisa decidir nada no balcão com a fila andando.

## 3. Feche o caixa por turno, não por dia

Fechamento diário junta o erro de três turnos numa conta só e impossibilita descobrir onde a diferença nasceu. Fechando por turno, a divergência aparece com dono e com hora.

Um fechamento útil mostra:

| Item | Para que serve |
|---|---|
| Abertura (fundo de troco) | Base da conferência |
| Total em dinheiro | O que deveria estar na gaveta |
| Total em cartão e Pix | O que caiu na conta |
| Sangrias e suprimentos | Explica saída/entrada fora do movimento |
| Diferença apurada | O número que interessa |

## 4. Separe "recebido" de "faturado"

São duas perguntas diferentes: *quanto foi cobrado* e *quanto efetivamente entrou*. Mensalista faturado e não pago continua sendo receita prevista — e continua fora do caixa.

Misturar os dois números é o jeito mais rápido de achar que o mês foi bom quando ele só foi movimentado.

## 5. Ofereça Pix no ticket

Dinheiro exige troco, cartão exige maquininha, e as duas coisas seguram a fila. Pix no próprio ticket resolve os dois problemas e, principalmente, **confirma sozinho**: o valor cai identificado, sem alguém precisar digitar que recebeu.

## 6. Acompanhe pelo celular, não pelo relatório

Relatório que você lê no dia seguinte serve para contabilidade, não para gestão. Se o pátio esvaziou às 15h de uma terça, você quer saber às 15h — não na quinta.

## 7. Reveja os números uma vez por semana

Quinze minutos por semana, três perguntas:

1. O ticket médio subiu ou caiu?
2. Qual turno concentra a receita?
3. Existe diferença de caixa recorrente no mesmo horário?

Padrão que se repete não é acaso. É processo com furo.

## Por onde começar

Comece pelo item 1. Enquanto a entrada não virar registro, os outros seis não têm em que se apoiar. Depois disso, cada item acrescenta previsibilidade — e tira você da posição de ter que perguntar quanto o próprio negócio faturou.
$md$,
  (select id from public.blog_categorias where slug = 'financeiro'),
  (select id from public.blog_autores  where nome = 'Equipe NuvemPark'),
  'publicado',
  true,
  $json$[
    {"pergunta":"Como saber quanto o estacionamento faturou hoje?","resposta":"Registrando toda entrada e saída em sistema, o faturamento do dia é calculado em tempo real e fica visível no painel — sem depender de o operador somar comandas ou enviar mensagem no fim do turno."},
    {"pergunta":"Qual a melhor forma de fechar o caixa de um estacionamento?","resposta":"Fechar por turno, e não por dia. O fechamento por turno mostra abertura, dinheiro, cartão, Pix, sangrias e a diferença apurada com hora e responsável, o que permite achar a origem de qualquer divergência."},
    {"pergunta":"Preciso de cancela ou equipamento para controlar o faturamento?","resposta":"Não. O controle vem do registro de cada movimento e da tarifa configurada no sistema. Um celular Android com o app já registra entrada, calcula a tarifa e emite o ticket."},
    {"pergunta":"Aceitar Pix no estacionamento reduz erro de caixa?","resposta":"Sim. O Pix cai identificado e com confirmação automática, então não depende de alguém marcar manualmente que recebeu — o que elimina a maior fonte de divergência depois do dinheiro em espécie."}
  ]$json$::jsonb,
  'Como controlar o faturamento do estacionamento em tempo real',
  array['controle de faturamento estacionamento','fechamento de caixa estacionamento','gestão de estacionamento','pix no estacionamento'],
  now() - interval '6 days'
where not exists (
  select 1 from public.blog_posts
   where slug = 'como-controlar-o-faturamento-do-estacionamento'
);

insert into public.blog_posts (
  slug, titulo, resumo, conteudo_md, categoria_id, autor_id,
  status, destaque, faq, seo_titulo, palavras_chave, publicado_em
)
select
  'leitura-de-placa-pelo-celular-no-estacionamento',
  'Leitura de placa pelo celular: o que muda na fila do seu pátio',
  'Como o reconhecimento de placa por câmera de celular corta o tempo de entrada, reduz erro de digitação e funciona mesmo quando a internet do pátio cai.',
  $md$
A entrada de um veículo tem um gargalo bem específico: **digitar a placa**. São sete caracteres, digitados por alguém em pé, com o carro parado e outro atrás. É onde nasce a fila e é onde nasce o erro que vai aparecer só na saída.

Reconhecimento de placa pela câmera do celular resolve esse trecho — e só ele. Vale entender exatamente o que muda.

## O que a câmera realmente faz

O operador aponta o celular para a placa. O aplicativo lê os caracteres, preenche o campo e mostra o resultado na tela para confirmação.

A confirmação é a parte que costuma ser esquecida em demonstração e que importa na vida real: a leitura é uma **sugestão**, não uma decisão. Placa suja, refletindo sol ou com adesivo continua existindo, e o operador corrige em um toque.

## O ganho de tempo, em números honestos

| Etapa | Digitando | Com leitura |
|---|---|---|
| Informar a placa | 8 a 15 s | 2 a 3 s |
| Corrigir erro de digitação | acontece | raro |
| Conferir na saída | comum | dispensável |

Em um pátio com 300 entradas por dia, economizar 8 segundos por carro é cerca de **40 minutos de operação por dia**. Não é o fim da fila — é a fila andando no horário de pico sem precisar de mais gente.

## Onde o erro some de verdade

O erro de digitação não custa 3 segundos. Custa a saída inteira:

- Placa errada não é encontrada na busca.
- O operador procura, não acha, e faz um novo ticket.
- O tempo de permanência se perde e a tarifa vira estimativa.
- No fechamento, aparece uma diferença sem explicação.

Cortar a digitação corta essa cadeia inteira — e é aí que a leitura de placa se paga.

## E quando a internet cai?

Essa é a pergunta certa a fazer para qualquer fornecedor. Num sistema feito para pátio, a leitura e o registro acontecem **no próprio aparelho**. A operação continua: entrada, saída, cálculo de tarifa e impressão do ticket.

Quando a conexão volta, o aparelho sincroniza o que ficou pendente. O que não pode acontecer é a fila parar porque o Wi-Fi do pátio caiu.

```text
Sem internet  ->  registra no aparelho  ->  imprime o ticket  ->  fila anda
Internet volta ->  sincroniza           ->  painel atualizado
```

## O que checar antes de contratar

1. A leitura roda **no aparelho** ou depende de servidor?
2. O operador consegue corrigir a placa lida em um toque?
3. A entrada e a saída funcionam offline?
4. Precisa de câmera especial ou serve o celular que a equipe já tem?
5. A foto do veículo fica guardada junto do movimento?

As respostas para essas cinco perguntas separam "leitura de placa" de marketing de leitura de placa.

## Resumo

Leitura de placa pelo celular não substitui processo, não substitui operador e não faz sozinha a gestão do pátio. Ela ataca um ponto único, muito bem: o tempo e o erro de digitar sete caracteres, trezentas vezes por dia.
$md$,
  (select id from public.blog_categorias where slug = 'tecnologia'),
  (select id from public.blog_autores  where nome = 'Equipe NuvemPark'),
  'publicado',
  false,
  $json$[
    {"pergunta":"O celular consegue ler placa de carro com precisão?","resposta":"Sim. A câmera do próprio celular lê os caracteres da placa e preenche o campo automaticamente; o resultado aparece na tela para o operador confirmar ou corrigir em um toque, o que cobre casos de placa suja, com reflexo ou danificada."},
    {"pergunta":"A leitura de placa funciona sem internet?","resposta":"Num app feito para pátio, sim: a leitura e o registro acontecem no próprio aparelho, então entrada, saída, cálculo de tarifa e impressão continuam funcionando offline. Quando a conexão volta, os movimentos pendentes sincronizam com o painel."},
    {"pergunta":"Preciso de câmera ou equipamento especial para reconhecimento de placa?","resposta":"Não. Um celular Android com câmera comum é suficiente. Não é necessário instalar câmera fixa, cancela ou servidor local para começar a operar com leitura de placa."},
    {"pergunta":"Quanto tempo a leitura de placa economiza por veículo?","resposta":"A digitação manual da placa leva de 8 a 15 segundos; com leitura por câmera, cai para 2 a 3 segundos. Em um pátio com 300 entradas diárias, isso representa cerca de 40 minutos de operação economizados por dia."}
  ]$json$::jsonb,
  null,
  array['leitura de placa estacionamento','reconhecimento de placa celular','app estacionamento offline','controle de entrada de veículos'],
  now() - interval '2 days'
where not exists (
  select 1 from public.blog_posts
   where slug = 'leitura-de-placa-pelo-celular-no-estacionamento'
);

-- ============================================================================
-- FIM
-- Conferência rápida:
--   select slug, status, destaque, publicado_em from public.blog_posts order by publicado_em desc;
--   select nome, slug, ordem from public.blog_categorias order by ordem;
-- ============================================================================
