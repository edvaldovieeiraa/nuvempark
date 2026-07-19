# NuvemPark — Build de release do APK

APK do operador apontando para a **API de produção** (`https://api.nuvempark.com`).

## Comando

```bat
cd C:\VibeCoding\NuvemPark\app
C:\src\flutter\bin\flutter.bat build apk --release --split-per-abi ^
  --dart-define=API_BASE_URL=https://api.nuvempark.com ^
  --dart-define=TICKET_PUBLIC_BASE_URL=https://nuvempark.com/t
```

> No Git Bash / Claude Code, prefixe com `!` para rodar no shell da sessão (o
> build é longo e é cortado se rodar como comando gerenciado/background):
> ```
> ! cd C:\VibeCoding\NuvemPark\app && C:\src\flutter\bin\flutter.bat build apk --release --split-per-abi --dart-define=API_BASE_URL=https://api.nuvempark.com --dart-define=TICKET_PUBLIC_BASE_URL=https://nuvempark.com/t
> ```

> **As DUAS `--dart-define` são obrigatórias em release.** Faltar a segunda não
> quebra nada visivelmente: o app abre, opera e imprime — só que o QR do cupom
> sai com o id cru do ticket em vez da URL, e o cliente que apontar a câmera não
> abre página nenhuma e não consegue pagar por Pix. Ver "Regras da URL embutida".

Leva ~5–15 min na 1ª vez (compila ML Kit). Avisos de KGP (`mobile_scanner`,
`print_bluetooth_thermal`) são **warnings**, não erros.

## Saída

`app\build\app\outputs\flutter-apk\`

| APK | Uso |
|---|---|
| `app-arm64-v8a-release.apk` | **Maioria dos celulares** (64-bit) |
| `app-armeabi-v7a-release.apk` | Aparelhos antigos (32-bit) |
| `app-x86_64-release.apk` | Emulador / x86 |

## Pré-requisitos (já configurados nesta máquina)

- **Assinatura:** `android/app/parkflow-release.jks` + `android/key.properties`
  (fora do git — guardar backup; perder o keystore = não conseguir atualizar o
  app publicado).
- **Gradle:** `minify OFF` no release (R8 quebra o ML Kit) e `--split-per-abi`
  para reduzir o tamanho — já no `android/app/build.gradle.kts`.
- **minSdk 23** (efetivo 24), desugaring on.
- `sqlite3` pinado em `3.3.2` via `dependency_overrides` (não remover sem testar).

## Regras da URL embutida

- `API_BASE_URL` fica **embutido no APK** — cada build aponta para o valor do
  `--dart-define`. Produção = `https://api.nuvempark.com`.
- O default do `lib/core/config/env.dart` (`http://10.0.2.2:8080`) é só para
  **dev no emulador** — NUNCA gere release sem o `--dart-define` de produção.
  Sem ele o app INSTALA E ABRE normalmente (mostra o cache local antigo) e só
  falha quando precisa da rede — Pix, sync, login. É uma falha silenciosa.
- `TICKET_PUBLIC_BASE_URL` é o que vai **dentro do QR do cupom**. Produção =
  `https://nuvempark.com/t` (a rota é `web/src/app/t/[id]`), e o QR fica
  `https://nuvempark.com/t/<ticket_id>` — é essa página que gera o Pix
  copia-e-cola para o cliente.
  O default é **vazio**, e aí `Env.qrDoTicket()` imprime o id cru: um QR que a
  câmera do cliente lê como texto sem sentido. O scanner de saída do app aceita
  os dois formatos, então o operador não percebe nada — **quem descobre é o
  cliente, na cancela, sem conseguir pagar.**

## Verificação rápida pós-build

1. Instale o `arm64-v8a` num aparelho.
2. Login (código do pátio + usuário + senha) → deve falar com a API de produção.
3. Confira em `Configurações → Dispositivos` (painel) que o device apareceu.

## Deploy dos serviços (contexto)

Web e API sobem pela skill de deploy (`deploy nuvempark`) — VPS recebe `scp` +
build remoto + `pm2`, não `git pull`. Ver `DEPLOY-PRODUCAO.md` na raiz.
- Web: `https://nuvempark.com` (pm2 `nuvempark-web`, :8092)
- API: `https://api.nuvempark.com` (pm2 `nuvempark-api`, :8091, `/health`)
