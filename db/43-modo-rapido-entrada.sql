-- ============================================================================
-- 43 — Modo rápido de entrada do app (por pátio)
--
-- Parametrização do painel. Com o pátio liberado, cada operador pode ligar no
-- app o modo rápido: com a câmera aberta, a placa travada entra sozinha depois
-- de 2 s de contagem — o operador só toca para corrigir.
--
--   modo_rapido_entrada → o pátio libera o modo no app. Default FALSE: nada
--                         muda para quem não ligar no painel.
--   modo_rapido_imprime → o modo rápido imprime o cupom de entrada. Default
--                         TRUE (mesmo comportamento da entrada normal);
--                         desligado, o carro é achado na saída pela placa.
--
-- O app lê os dois valores pelo bootstrap. A API pede estas colunas no select
-- do pátio: aplicar ANTES de publicar a API, senão o bootstrap falha.
--
-- Idempotente. Aplicar MANUALMENTE no SQL Editor.
-- ============================================================================

alter table public.patios
  add column if not exists modo_rapido_entrada boolean not null default false;

alter table public.patios
  add column if not exists modo_rapido_imprime boolean not null default true;

comment on column public.patios.modo_rapido_entrada is
  'Modo rápido de entrada do app: o pátio libera (cada operador liga no aparelho).';

comment on column public.patios.modo_rapido_imprime is
  'Modo rápido de entrada imprime o cupom de entrada (desligado: acha o carro pela placa na saída).';
