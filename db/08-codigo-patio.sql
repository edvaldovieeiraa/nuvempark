-- ============================================================================
-- NuvemPark — 08: Código de acesso de 4 dígitos POR PÁTIO
-- Decisão (2026-07-10): o operador loga com o código do PÁTIO, não do tenant.
-- O código é único GLOBALMENTE (entre pátios E tenants) → lookup inequívoco.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================================

-- 1) Coluna (o `codigo` existente segue sendo o código interno livre, ex. CT01)
alter table public.patios
  add column if not exists codigo_acesso text unique;

-- 2) Gerador: 4 dígitos que não colidem com NENHUM pátio nem tenant
create or replace function public.fn_gerar_codigo_patio()
returns text language plpgsql as $$
declare
  novo text;
  tentativas int := 0;
begin
  loop
    novo := lpad((1000 + floor(random() * 9000))::int::text, 4, '0');
    exit when
      not exists (select 1 from public.patios  where codigo_acesso = novo)
      and not exists (select 1 from public.tenants where codigo = novo);
    tentativas := tentativas + 1;
    if tentativas > 80 then
      raise exception 'Não foi possível gerar código de pátio único';
    end if;
  end loop;
  return novo;
end $$;

-- 3) Tenants novos também não podem colidir com códigos de pátio
create or replace function public.fn_gerar_codigo_tenant()
returns text language plpgsql as $$
declare
  novo text;
  tentativas int := 0;
begin
  loop
    novo := lpad((1000 + floor(random() * 9000))::int::text, 4, '0');
    exit when
      not exists (select 1 from public.tenants where codigo = novo)
      and not exists (select 1 from public.patios  where codigo_acesso = novo);
    tentativas := tentativas + 1;
    if tentativas > 80 then
      raise exception 'Não foi possível gerar código de tenant único';
    end if;
  end loop;
  return novo;
end $$;

-- 4) Backfill: todo pátio existente ganha um código
update public.patios
set codigo_acesso = public.fn_gerar_codigo_patio()
where codigo_acesso is null;

-- 5) Trigger: pátio novo nasce com código
create or replace function public.trg_patio_codigo_acesso()
returns trigger language plpgsql as $$
begin
  if new.codigo_acesso is null then
    new.codigo_acesso := public.fn_gerar_codigo_patio();
  end if;
  return new;
end $$;

drop trigger if exists trg_patios_codigo_acesso on public.patios;
create trigger trg_patios_codigo_acesso
  before insert on public.patios
  for each row execute function public.trg_patio_codigo_acesso();

-- 6) Confira o código gerado para o pátio de teste:
select nome, codigo_acesso from public.patios order by nome;
