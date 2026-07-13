# NuvemPark — Processo de Publicação em Produção

> Documento canônico do deploy da NuvemPark. Base para a skill `nuvempark-deploy`.
> Escopo da skill: **commitar → pushar → deployar** o ambiente de produção.
> Última verificação da infra: 2026-07-12.

---

## 1. Panorama da infraestrutura

A NuvemPark roda na **mesma VPS do Leve** (não há servidor dedicado ainda).

| Item | Valor |
|---|---|
| **Host SSH** | `dashboard.levemobilidade.com.br` (= 187.77.251.45) |
| **Usuário SSH** | `root` |
| **Chave SSH** | `~/.ssh/id_ed25519` (`C:\Users\LEVE\.ssh\id_ed25519`) |
| **Node/npm na VPS** | Node v20.20.1 · npm 10.8.2 |
| **Gerenciador de processo** | pm2 |
| **Reverse proxy** | nginx |
| **Git remoto** | `github.com/edvaldovieeiraa/nuvempark` · branch `main` |

### Componentes e portas

| Componente | Dir local | Dir VPS | pm2 | Porta | Domínio |
|---|---|---|---|---|---|
| **Web** (Next.js 16, painel + site) | `C:\VibeCoding\NuvemPark\web` | `/root/nuvempark-web` | `nuvempark-web` | 8092 | https://nuvempark.com |
| **API** (Node/Fastify) | `C:\VibeCoding\NuvemPark\api` | `/root/nuvempark-api` | `nuvempark-api` | 8091 | api.nuvempark.com |
| App (Flutter) | `C:\VibeCoding\NuvemPark\app` | — | — | — | (build local, não deploya na VPS) |

> **A skill foca no `web`** (o que muda com mais frequência). A API segue o mesmo padrão, trocando dir/porta/nome pm2.

---

## 2. Verdades operacionais (LER ANTES)

Regras aprendidas na prática. Violar qualquer uma quebra o deploy:

1. **A VPS NÃO é um clone git.** `/root/nuvempark-web` recebe o código por **scp**, não `git pull`. Por isso o deploy é: commit/push (versiona no GitHub) **+** scp (leva o código pro servidor). Pushar sozinho **não** publica nada.

2. **`.env.local` mora SÓ no servidor.** Nunca sobrescrever. O scp envia apenas `src/` (e `package.json`/`package-lock.json` quando as deps mudam), jamais `.env*`, `node_modules`, `.next`.

3. **`npm ci` na VPS está QUEBRADO** (lockfile/versão de npm divergente). **Não usar `npm ci`.** O build usa os `node_modules` já instalados. Isso funciona porque a política é **não adicionar dependências novas** sem um passo manual de reconciliação. Se precisar instalar lib nova → resolver o lockfile primeiro, fora do fluxo normal.

4. **Build consome RAM e a sessão SSH pode cair.** O `next build` roda alguns minutos e derruba conexões SSH interativas. **Sempre rodar o build em background no servidor** (`nohup ... &`) e depois esperar terminar, em vez de manter o SSH preso. A VPS tem ~7.9GB RAM (folga suficiente).

5. **Nunca dois deploys concorrentes.** Um build por vez. Se um build estiver rodando (`pgrep -f 'node_modules/.bin/next build'`), esperar terminar antes de lançar outro.

6. **O restart só vale depois do build OK.** `pm2 restart` sem um `.next` novo e íntegro serve a versão antiga (ou quebra). Confirmar "Compiled successfully" antes de reiniciar.

7. **`next start` lê `.env.local` em runtime** (do cwd). Não precisa injetar env no pm2; basta o arquivo estar em `/root/nuvempark-web/.env.local`. Ao reiniciar, usar `--update-env` por garantia.

---

## 3. O fluxo de deploy (web) — passo a passo

### Passo 0 — Pré-checagem local (na máquina de dev)

```bash
cd /c/VibeCoding/NuvemPark/web
# Typecheck + build local: NÃO deployar se qualquer um falhar.
npx tsc --noEmit -p tsconfig.json     # deve sair 0
npx next build                        # deve terminar "Compiled successfully"
```

> Regra de ouro: **nunca deployar código que não builda localmente.** O build local é o portão.

### Passo 1 — Commit + push (versionamento)

```bash
cd /c/VibeCoding/NuvemPark
git add -A
git commit -m "<mensagem>"
git push origin main
```

> Isto versiona no GitHub, mas **não publica**. A publicação é o scp + build abaixo.
> Mensagem de commit termina com a linha de co-autoria padrão da casa.

### Passo 2 — Enviar o código pra VPS (scp)

```bash
cd /c/VibeCoding/NuvemPark/web
scp -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 -r src \
  root@dashboard.levemobilidade.com.br:/root/nuvempark-web/
# Só quando package.json mudou, envie também:
# scp ... package.json package-lock.json root@...:/root/nuvempark-web/
```

> Enviar `src/` inteiro (é pequeno, ~800KB) garante consistência total, melhor que
> tentar lembrar quais arquivos mudaram. **Nunca** enviar `.env*`, `node_modules`, `.next`.

### Passo 3 — Build no servidor (em background)

```bash
ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 \
  root@dashboard.levemobilidade.com.br \
  "cd /root/nuvempark-web && nohup npm run build > /tmp/np_build.log 2>&1 & echo PID:\$!"
```

Depois **esperar** o build terminar (não manter SSH preso) e checar sucesso:

```bash
# Poll até o build sumir da lista de processos:
until ssh ... "pgrep -f 'node_modules/.bin/next build' > /dev/null"; do sleep 10; done
ssh ... "grep -E 'Compiled successfully|Failed|Type error' /tmp/np_build.log | head -3"
```

> Se aparecer `Failed`/`Type error`: **parar aqui**, corrigir localmente, refazer do Passo 0. Não reiniciar o pm2.

### Passo 4 — Restart do pm2

```bash
ssh ... "pm2 restart nuvempark-web --update-env"
# Esperar o Next subir (next start leva alguns segundos):
until ssh ... "curl -s -o /dev/null http://127.0.0.1:8092/"; do sleep 3; done
```

### Passo 5 — Verificação pública (obrigatória)

```bash
curl -s -o /dev/null -w "/ -> %{http_code}\n"                --max-time 12 https://nuvempark.com/
curl -s -o /dev/null -w "/master/login -> %{http_code}\n"     --max-time 12 https://nuvempark.com/master/login
curl -s -o /dev/null -w "/cadastro -> %{http_code}\n"         --max-time 12 https://nuvempark.com/cadastro
```

Esperado: `/` = 200, rotas de gate = 200 ou 307 (redirect de login), rotas protegidas = 307. Qualquer 5xx = deploy falhou → investigar `pm2 logs nuvempark-web`.

---

## 4. Sintaxe correta no ambiente do dev (Windows + Git Bash)

O ambiente de dev é **Windows com Git Bash**. Cuidados que mordem:

- Paths do tipo `/c/Users/LEVE/...` funcionam no shell, mas o **Node `require()` não os resolve** — usar caminho Windows (`C:\...`) quando passar path pro Node, ou ler via ferramenta de arquivo.
- `/tmp` no Git Bash ≠ `/tmp` que o Node enxerga. Para arquivos temporários que o Node vai ler, usar o scratchpad ou caminho absoluto Windows.
- O comando SSH que lança `nohup` costuma retornar "exit 124" (timeout do wrapper) mesmo com o build já disparado em background — isso é esperado, o build segue.
- Não encadear `sleep` longos antes de checar; usar loop `until <check>; do sleep N; done`.

---

## 5. Rollback

Se o deploy publicar algo quebrado:

1. **Reverter o código** (git) e refazer o fluxo do Passo 0, OU
2. **Restaurar o `.next` anterior** se ainda existir (o build sobrescreve; sem backup automático hoje — melhoria futura: `mv .next .next.bak` antes do build).
3. `pm2 restart nuvempark-web` com o código bom.

> Hoje não há blue-green nem backup de build. Rollback = re-deploy da versão anterior.

---

## 6. Comandos de diagnóstico úteis (VPS)

```bash
pm2 list                          # estado dos processos
pm2 logs nuvempark-web --lines 50 # logs do web
pm2 describe nuvempark-web        # cwd, script, restarts
free -m                           # RAM disponível antes de buildar
grep proxy_pass /etc/nginx/sites-enabled/nuvempark-web  # confirmar porta
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8092/  # health local
```

---

## 7. Escopo da skill `nuvempark-deploy`

A skill automatiza os **Passos 0–5** para o `web` (com flag opcional para a `api`). Ela deve:

1. **Pré-checar** (typecheck + build local); abortar se falhar.
2. **Commitar + pushar** (pedir/gerar mensagem de commit).
3. **scp** do `src/` (e package files só se mudaram).
4. **Build em background** no servidor + esperar + validar sucesso.
5. **Restart pm2** + esperar subir.
6. **Verificação pública** (curl nas rotas-chave) e reportar o resultado.

Invariantes que a skill NUNCA viola: não toca `.env*`; não usa `npm ci`; um build por vez; não reinicia sem build OK; não deploya sem build local verde.

### Decisões de comportamento (confirmadas pelo dono, 2026-07-12)

- **Fluxo padrão = completo:** um comando faz commit + push **e** publica (scp + build + pm2 + verify). Versionar e publicar juntos por padrão.
- **Pré-checagem é PORTÃO OBRIGATÓRIO:** typecheck + `next build` local sempre rodam antes de qualquer publicação. Se falhar, aborta e não publica. Sem flag de bypass — a rede de segurança é o ponto (pegou bugs reais nesta sessão).
- **Flags de escape** (casos especiais, não o padrão): `--skip-push` (publica sem versionar), `--skip-scp` (só versiona/pusha, não publica).
- **Confirmação antes de push/publicar:** por serem ações externas e difíceis de reverter, a skill confirma antes de pushar e antes de reiniciar produção, a menos que o usuário autorize o fluxo direto na invocação.
