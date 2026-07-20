#!/usr/bin/env bash
# Deploy do NuvemPark web. Commits já feitos e pré-check (typecheck+build) já
# passou nesta sessão. Não faz `git add` — não toca no WIP do app/.
set -uo pipefail

SSH="ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -i $HOME/.ssh/id_ed25519 root@dashboard.levemobilidade.com.br"
SSH_KEY="$HOME/.ssh/id_ed25519"
HOST="root@dashboard.levemobilidade.com.br"
ROOT="/c/VibeCoding/NuvemPark"
die(){ echo "❌ $*" >&2; exit 1; }

echo "== 1/6 push =="
git -C "$ROOT" push origin main || die "push falhou"

echo "== 2/6 scp src =="
( cd "$ROOT/web" && scp -o StrictHostKeyChecking=no -i "$SSH_KEY" -r src "$HOST:/root/nuvempark-web/" ) \
  || die "scp falhou"

echo "== 3/6 env vars na VPS (copia do .env da API, sem duplicar) =="
$SSH 'cd /root/nuvempark-web && for V in NUVEMPARK_CRYPTO_KEY ASAAS_BASE_URL; do \
    grep -q "^$V=" .env.local || grep "^$V=" /root/nuvempark-api/.env >> .env.local; done && \
    echo "vars presentes:" && grep -oE "^(NUVEMPARK_CRYPTO_KEY|ASAAS_BASE_URL)" .env.local | sort -u' \
  || die "ajuste de env falhou"

echo "== 4/6 build remoto (background, com sentinela de exit-code) =="
$SSH "cd /root/nuvempark-web && rm -f /tmp/npd_build.exit && \
  nohup sh -c 'npm run build > /tmp/npd_build.log 2>&1; echo \$? > /tmp/npd_build.exit' >/dev/null 2>&1 & echo lancado" >/dev/null 2>&1 || true
echo "aguardando o build terminar..."
CODE=""
for i in $(seq 1 120); do
  CODE="$($SSH "cat /tmp/npd_build.exit 2>/dev/null" | tr -d ' \r\n')"
  [ -n "$CODE" ] && break
  sleep 10; printf '.'
done
echo
[ -n "$CODE" ] || die "build remoto não terminou no tempo esperado — pm2 NÃO reiniciado."
echo "  → $($SSH "grep -E 'Compiled successfully|Failed|Type error|error TS' /tmp/npd_build.log | head -2")"
[ "$CODE" = "0" ] || die "build remoto FALHOU (exit $CODE) — pm2 NÃO reiniciado. Veja /tmp/npd_build.log na VPS."
echo "✅ build ok"

echo "== 5/6 restart pm2 =="
$SSH "pm2 restart nuvempark-web --update-env" >/dev/null 2>&1 || die "restart falhou"
echo "aguardando subir..."
UP=0
for i in $(seq 1 20); do
  if $SSH "curl -s -o /dev/null http://127.0.0.1:8092/"; then UP=1; break; fi
  sleep 3; printf '.'
done
echo
[ "$UP" -eq 1 ] || die "app não respondeu após restart — ver 'pm2 logs nuvempark-web'"
echo "✅ nuvempark-web online"

echo "== 6/6 verificação pública =="
curl -s -o /dev/null -w "/              -> %{http_code}\n" --max-time 12 https://nuvempark.com/
curl -s -o /dev/null -w "/master/login  -> %{http_code}\n" --max-time 12 https://nuvempark.com/master/login
echo "🎉 pronto. Abra https://nuvempark.com/master/pagamentos"
