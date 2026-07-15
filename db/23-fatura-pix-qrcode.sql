-- ============================================================================
-- 23 — QR Code do PIX nas faturas de assinatura
-- ----------------------------------------------------------------------------
-- O Asaas devolve, junto do copia-e-cola, a imagem do QR (base64 PNG) no
-- endpoint /payments/{id}/pixQrCode. Guardamos para exibir o QR na própria
-- tela do cliente (sem depender do link externo do gateway).
-- Idempotente.
-- ============================================================================

alter table public.faturas
  add column if not exists gateway_pix_qrcode text;

-- Pronto. A coluna guarda só o base64 do PNG (sem o prefixo data:). A tela
-- monta `data:image/png;base64,<valor>` na hora de exibir.
