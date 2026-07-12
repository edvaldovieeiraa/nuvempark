#!/usr/bin/env bash
# ============================================================================
# Verificação da Camada 1 (Entrega 2, Parte C):
#   sync de UPDATE num ticket removido → HTTP 200 + {ignorado:true} e o banco
#   NÃO muda (o ticket removido no painel não é ressuscitado pelo app).
#
# Pré-requisitos:
#   1. API rodando:  cd api && npm run dev            (http://localhost:8080)
#   2. Um ticket com status='removido' no pátio de teste. Gere-o pelo painel:
#      /painel/patio → "Limpeza de Pátio" (ou rode um UPDATE manual no SQL).
#   3. Exporte o ID desse ticket antes de rodar:
#        export TICKET_ID='<uuid-do-ticket-removido>'
#
# Uso:
#   export TICKET_ID='...'
#   bash api/scripts/verificar-sync-removido.sh
#
# Variáveis opcionais (default = seed de teste do HANDOFF):
#   BASE, CODIGO, USUARIO, SENHA, DEVICE
# ============================================================================
set -euo pipefail

BASE="${BASE:-http://localhost:8080/api/mobile/v1/patio}"
CODIGO="${CODIGO:-1234}"
USUARIO="${USUARIO:-ADMIN}"
SENHA="${SENHA:-senha123}"
DEVICE="${DEVICE:-verif-sync-removido}"

if [ -z "${TICKET_ID:-}" ]; then
  echo "❌ Defina TICKET_ID com o id de um ticket status='removido'."
  echo "   Ex: export TICKET_ID='...'; bash $0"
  exit 1
fi

json() { # extrai um campo string simples de um JSON (sem depender de jq)
  grep -o "\"$1\":\"[^\"]*\"" | head -1 | sed "s/.*:\"//;s/\"//"
}

echo "1) Login…"
LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"codigo_tenant\":\"$CODIGO\",\"usuario\":\"$USUARIO\",\"senha\":\"$SENHA\",\"device_uuid\":\"$DEVICE\"}")

TOKEN=$(printf '%s' "$LOGIN" | json access_token)
TENANT=$(printf '%s' "$LOGIN" | json tenant_id)
# primeiro patio da resposta ( "patios":[{"id":"..." )
PATIO=$(printf '%s' "$LOGIN" | grep -o '"patios":\[{"id":"[^"]*"' | sed 's/.*"id":"//;s/"//')

if [ -z "$TOKEN" ] || [ -z "$PATIO" ]; then
  echo "❌ Login falhou. Resposta:"; echo "$LOGIN"; exit 1
fi
echo "   ok · tenant=$TENANT · patio=$PATIO"

echo "2) Enviando sync de UPDATE (saida agora) no ticket removido $TICKET_ID…"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"app_id\":\"verif\",
    \"tenant_id\":\"$TENANT\",
    \"patio_id\":\"$PATIO\",
    \"entidade\":\"ticket\",
    \"entidade_id\":\"$TICKET_ID\",
    \"operacao\":\"update\",
    \"payload\":{\"status\":\"fechado\",\"saida\":$(date +%s)000,\"valor_cobrado\":9.99}
  }")

BODY=$(printf '%s' "$RESP" | sed '$d')
CODE=$(printf '%s' "$RESP" | tail -1)

echo "   HTTP $CODE · body: $BODY"

echo "3) Conferindo critérios de aceite…"
PASS=1
echo "$CODE" | grep -q '^200$' || { echo "   ❌ esperado HTTP 200"; PASS=0; }
printf '%s' "$BODY" | grep -q '"ignorado":true' || { echo "   ❌ esperado ignorado:true"; PASS=0; }
printf '%s' "$BODY" | grep -q '"motivo":"removido"' || { echo "   ❌ esperado motivo:removido"; PASS=0; }

if [ "$PASS" = "1" ]; then
  echo "✅ Camada 1 OK: update ignorado, contrato preservado (ok:true)."
  echo "   Confirme no banco que o ticket segue status='removido' e saida IS NULL:"
  echo "   select status, saida, valor_cobrado from public.tickets where id='$TICKET_ID';"
else
  echo "❌ Falhou. Revise api/src/routes/sync.ts (case ticket)."
  exit 1
fi
