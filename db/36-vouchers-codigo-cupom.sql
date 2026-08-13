-- ============================================================================
-- NuvemPark — 36: Vouchers, aceitar o código curto do cupom
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- O cupom de entrada imprime, abaixo do QR:
--
--     ID: A1B2C3D4
--
-- que é `ticketId.substring(0, 8).toUpperCase()` (ver print_templates.dart).
-- NÃO é o id inteiro. A `obter_ticket_parceiro` de db/33 comparava por
-- igualdade exata, então quem digitasse o que está impresso não achava nada —
-- e digitar o id completo não é opção: são 36 caracteres de UUID, no balcão,
-- com o cliente esperando.
--
-- Quem precisa disso é o lojista em navegador sem `BarcodeDetector` (Safari e
-- Firefox, boa parte dos celulares de balcão). Para ele o código curto não é
-- alternativa: é o único caminho.
--
-- O prefixo de 8 caracteres é seguro aqui porque o universo já é minúsculo: só
-- os tickets ABERTOS de UM pátio. Ainda assim a função devolve TODOS os
-- candidatos em vez de escolher um — se algum dia dois colidirem, a tela mostra
-- os dois com placa e horário e a pessoa decide. Escolher em silêncio seria
-- liberar o carro errado.
-- ============================================================================

create or replace function public.obter_ticket_parceiro(p_ticket_id text)
returns table (
  ticket_id  text,
  placa      text,
  entrada    timestamptz,
  ja_liberado boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id,
         t.placa,
         t.entrada,
         exists (
           select 1 from public.liberacoes l
            where l.ticket_id = t.id and l.cancelada_em is null
         )
    from public.tickets t
    join public.parceiros p
      on p.id = (select public.current_parceiro_id())
     and p.patio_id = t.patio_id
   where t.status = 'aberto'
     and (
       -- QR: o app manda a URL e o navegador extrai o id inteiro.
       t.id = p_ticket_id
       -- Cupom: os 8 primeiros, como saem impressos. Comparação sem caixa
       -- porque o template usa `toUpperCase()` e o id é minúsculo na origem.
       or (
         length(p_ticket_id) = 8
         and upper(left(t.id, 8)) = upper(p_ticket_id)
       )
     )
   order by t.entrada desc
   limit 5
$$;

revoke all on function public.obter_ticket_parceiro(text) from public;
grant execute on function public.obter_ticket_parceiro(text) to authenticated;

-- ============================================================================
-- VALIDAÇÃO (logado COMO USUÁRIO DE PARCEIRO, com um ticket aberto no pátio)
--
-- 1) Pelo id inteiro continua funcionando:
-- select * from public.obter_ticket_parceiro('<id completo>');
--
-- 2) Pelos 8 primeiros, MAIÚSCULOS, como está no cupom:
-- select * from public.obter_ticket_parceiro(upper(left('<id completo>', 8)));
--
-- 3) Minúsculo também (o lojista pode digitar como quiser):
-- select * from public.obter_ticket_parceiro(lower(left('<id completo>', 8)));
--
-- 4) Prefixo de tamanho diferente de 8 NÃO casa por prefixo (evita que uma
--    busca curta demais devolva meio pátio):
-- select * from public.obter_ticket_parceiro(left('<id completo>', 4));  -- 0 linhas
--
-- 5) Ticket de outro pátio continua invisível:
-- select * from public.obter_ticket_parceiro('<id de outro patio>');     -- 0 linhas
-- ============================================================================
