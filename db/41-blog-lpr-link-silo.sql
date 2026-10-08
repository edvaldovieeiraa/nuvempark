-- ============================================================================
-- NuvemPark — Post de LPR passa a linkar a página de leitura de placa do silo.
--
-- Conteúdo de PLATAFORMA (não é dado de tenant). Complementa db/28-blog.sql.
--
-- Por quê: a página /leitura-de-placa-para-estacionamento (lib/solucoes-
-- leitura-placa.ts) disputa a busca comercial ("leitura de placa para
-- estacionamento", "lpr para estacionamento"); o post fica com a informativa.
-- O bloco "Sobre o sistema" no fim de todo post já aponta para a página, mas
-- link no corpo do texto passa mais autoridade (web/SEO.md, seção 6).
--
-- Idempotente: só altera se o link ainda não estiver no texto. Se a frase de
-- âncora tiver sido editada no /master/blog, o replace não casa e nada muda —
-- confira com o select do fim.
-- ============================================================================

update public.blog_posts
set conteudo_md = replace(
  conteudo_md,
  'O LPR do NuvemPark nasceu para esse cenário: toda a leitura, sem nenhum hardware novo.',
  'O LPR do NuvemPark nasceu para esse cenário: toda a leitura, sem nenhum hardware novo. A comparação completa entre os dois formatos, com o que o app lê e o que ele não faz, está na página de [leitura de placa para estacionamento](/leitura-de-placa-para-estacionamento).'
)
where slug = 'lpr-leitura-automatica-de-placas-no-app'
  and position('/leitura-de-placa-para-estacionamento' in conteudo_md) = 0;

-- Conferência: deve devolver true.
select slug,
       position('/leitura-de-placa-para-estacionamento' in conteudo_md) > 0 as tem_link
from public.blog_posts
where slug = 'lpr-leitura-automatica-de-placas-no-app';
