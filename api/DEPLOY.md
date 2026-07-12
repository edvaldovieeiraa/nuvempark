# NuvemPark API — Deploy na VPS

> Backend Node + Fastify. Roda na mesma VPS do Leve (`dashboard.levemobilidade.com.br`
> = 187.77.251.45), sob um subdomínio próprio, gerenciado por **pm2** + **nginx**.
> **Aguarda a decisão de marca/domínio** para fixar o subdomínio (ver memória
> parkflow-release-signing).

## Pré-requisitos na VPS (uma vez)

1. **DNS:** apontar o subdomínio escolhido (ex: `api.nuvempark.com`) para `187.77.251.45` (registro A).
2. **Código na VPS:** clonar/subir o `nuvempark-api` para `/root/nuvempark-api`
   (git ou scp — o repo ainda não existe remoto; pode ser scp do local por ora).
3. **.env de produção** em `/root/nuvempark-api/.env`:
   ```
   PORT=8091
   NODE_ENV=production
   SUPABASE_URL=https://xrwrsswhoywzzhutzrjx.supabase.co
   SUPABASE_ANON_KEY=<anon>
   SUPABASE_SERVICE_ROLE_KEY=<service_role>
   SUPABASE_JWT_SECRET=<jwt secret legacy>
   NUVEMPARK_JWT_SECRET=<gerar novo p/ prod: openssl rand -hex 32>
   CORS_ORIGINS=https://<dominio-do-painel>,https://<dominio-api>
   ```
   ⚠️ Rotacionar os segredos que passaram pelo chat antes de produção.
   Escolher uma PORTA livre na VPS (o Leve usa 3000; usado 8091 (8090 = painel NOC) p/ o nuvempark-api).

## Deploy (SSH manual — padrão da casa, igual ao Leve ERP)

```bash
# 1. subir o código (do Windows, se não houver git remoto ainda):
#    scp -r -i ~/.ssh/id_ed25519 C:/VibeCoding/NuvemPark/api/* root@187.77.251.45:/root/nuvempark-api/
#    (exceto node_modules e .env — .env fica só no servidor)

# 2. build + start por SSH:
ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 root@dashboard.levemobilidade.com.br \
"cd /root/nuvempark-api && npm ci && npm run build && (pm2 restart nuvempark-api || pm2 start dist/server.js --name nuvempark-api) && sleep 3 && curl -s -o /dev/null -w 'health:%{http_code}\n' http://localhost:8091/health"
```

## nginx (subdomínio → porta do pm2)

`/etc/nginx/sites-available/nuvempark-api` (ajustar `server_name` ao domínio final):
```nginx
server {
    listen 80;
    server_name api.nuvempark.com;
    location / {
        proxy_pass http://127.0.0.1:8091;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;   # uploads de foto de entrada
    }
}
```
Depois: `ln -s ... /etc/nginx/sites-enabled/`, `nginx -t`, `systemctl reload nginx`,
e HTTPS com `certbot --nginx -d api.nuvempark.com`.

## Depois do deploy — regenerar o APK com a URL real

```bash
cd C:\VibeCoding\NuvemPark\app
# (setar JAVA_HOME/ANDROID_HOME — ver HANDOFF)
C:\src\flutter\bin\flutter.bat build apk --release --split-per-abi \
  --dart-define=API_BASE_URL=https://api.nuvempark.com
```

## Checklist de go-live
- [ ] Domínio/subdomínio registrado + DNS apontando pra VPS
- [ ] .env de produção na VPS (segredos rotacionados)
- [ ] Porta livre escolhida (usado 8091 (8090 = painel NOC))
- [ ] pm2 start + pm2 save (persistir no reboot)
- [ ] nginx + certbot (HTTPS)
- [ ] APK regenerado com a URL real
- [ ] Storage bucket `nuvempark-entradas` já aplicado (db/04-storage.sql) ✅
- [ ] Testar login real do app contra a API de produção
