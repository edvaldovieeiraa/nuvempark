# NuvemPark — Handoff (estado ao retomar)

> Última atualização: 2026-07-23. **Gate de assinatura em tempo real** no app +
> API (ver seção dedicada) e menu lateral recolhido do painel (ícones/a11y).
> Web + API **em produção**; heartbeat validado
> end-to-end no Moto G05 (Android 15) contra `api.nuvempark.com`. APK de release
> instalado no aparelho. `flutter analyze` limpo, api typecheck limpo.
>
> **Restauração de sessão** (splash) e **ícone NuvemPark** (verde+P) já feitos.
> **Impressão BT + QR scan** integrados. Fluxo operacional 100%.
>
> **RELEASE:** keystore criado e assinatura configurada (ver memória
> parkflow-release-signing). Deploy: `DEPLOY-PRODUCAO.md` + skill `nuvempark-deploy`.
> ~~BLOQUEIO de marca/domínio~~ ✅ RESOLVIDO: **nuvempark.com** no ar (site),
> **dashboard.nuvempark.com** (painel), **api.nuvempark.com** (backend).
> O APK de release aponta pra `https://api.nuvempark.com` via `--dart-define`.
>
> ⚠️ **Fix de build:** `sqlite3` pinado em `3.3.2` via `dependency_overrides`
> (a 3.3.4 tem bug de hash nos native-assets nesta toolchain). Não remover o
> override sem testar o build. minSdk efetivo = 24 (default do Flutter, ≥23 ok).
> ⚠️ **Minify OFF** no release (R8 quebra ML Kit); `--split-per-abi` reduz o APK.

## Estado por fase

| Fase | Status |
|---|---|
| 0. Schema + RLS (Supabase) | ✅ aplicado em `xrwrsswhoywzzhutzrjx`, isolamento provado |
| 1. Backend `nuvempark-api` (Node+Fastify) | ✅ validado end-to-end (login, bootstrap, RLS) |
| 2. App Flutter `nuvempark-app` | ✅ **COMPLETO nesta sessão** (blocos 1-6) |
| 3. (era núcleo — feito dentro da Fase 2) | ✅ |
| 4. Pix dinâmico via PSP (Asaas) | ⏳ NÃO feito — há gancho na tela de saída |
| 5. Painel do gestor + dashboard (web) | ✅ **em produção** (dashboard.nuvempark.com) |
| 6. Super-admin + billing | ⏳ não iniciado (tenant criado via SQL manual) |

## O que o app Flutter tem agora (C:\VibeCoding\NuvemPark\app)

- **Fundação:** `nuvempark_core` (Dio, SecureStorage, widgets), tema **verde light-first**, env parametrizado (`API_BASE_URL` default `http://10.0.2.2:8080` p/ emulador).
- **Drift DB** (offline): 8 tabelas + 5 DAOs, schemaVersion 1, build_runner ok.
- **Core:** interceptors bearer(+X-Tenant-Id)/refresh **verbatim**, DI Riverpod.
- **Auth:** login por **código do tenant (4 díg) + usuário + senha**, JWT c/ tenant_id, state machine + router go_router.
- **Núcleo (testado):** motor de tarifa (7 testes) + sync engine (envelope c/ tenant_id/patio_id).
- **Features operacionais:**
  - Bootstrap (baixa config/tarifas/clientes → Drift)
  - Entrada: câmera + **OCR de placa** (14 testes), foto, reconhecimento de cliente livre-passagem, criar ticket
  - Saída/cobrança: cálculo via TarifaEngine, registro manual (dinheiro/pix manual/cartão), **gancho Pix desabilitado** ("em breve")
  - Home: ocupação, ações entrada/saída, lista de veículos no pátio
  - Caixa: abrir (fundo), sangria, fechar (conferência + divergência)
  - **Impressão Bluetooth** ✅: ESC/POS builder, printer service (print_bluetooth_thermal),
    storage (chaves parkflow_printer_*), templates (ticket entrada c/ QR, recibo saída,
    fechamento caixa, teste), provider (conexão blindada + reconexão), tela de config
    (permissões BT, pareados, 58/80mm, avanço, teste). **Auto-print integrado na
    entrada e na saída**. Acesso: ícone de impressora na home. Config em /impressora.
    - **Impressão FORA do caminho crítico (entrada E saída):** o recibo imprime
      em background DEPOIS do commit local + navegação — o botão de confirmar
      nunca espera o Bluetooth (que reconecta e leva segundos com o socket
      ocioso). Falha de impressão vira snackbar não-bloqueante com **Reimprimir**
      (a saída/entrada já está registrada e válida). A tela de saída ainda
      **pré-aquece** a conexão BT ao abrir, pra o print em background nem
      reconectar. Confirmar saída fica ≤300ms (só transação Drift + nav).

## Heartbeat + status online no painel (2026-07-16)

O app bate `POST /heartbeat` a cada 60s carimbando `dispositivos.ultimo_acesso`;
a sidebar do painel escuta `dispositivos` e `tickets` via Supabase Realtime e
mostra a data + indicador verde/cinza (verde = visto há < 3 min), sem F5.
Migration: `db/24-heartbeat-realtime.sql` (dispositivos na publication).

**Validado em produção** com o Moto G05 (Android 15): heartbeat 204, chegando a
cada 61–92s **com a tela apagada, na bateria, sem Device Owner** — o pior caso.

### ⚠️ Duas armadilhas que só apareceram em produção

1. **`dispositivos` nunca era populada.** Nada no produto inseria nessa tabela —
   o painel só ativa/revoga, e a tela de cadastro do E-Park (código curto por
   aparelho) jamais foi portada. O heartbeat devolvia **404 silencioso** (o
   fail-silent do app engolia) e o indicador nunca acenderia. Hoje a rota
   registra o aparelho na 1ª batida (trust on first use), usando o `patio_id`
   que o app manda. **O registro nunca ressuscita um revogado** — a ordem é
   UPDATE → checar existência → `INSERT ON CONFLICT DO NOTHING`. Um upsert que
   resetasse `status` desfaria a revogação de um aparelho perdido a cada 60s.
   Efeito colateral bom: a tela "Dispositivos" do painel deixa de ficar vazia.

2. **Background no Android exige foreground service.** O Cached Apps Freezer
   (12+) congela o processo com a tela apagada e os `Timer.periodic` param —
   nem heartbeat nem sync rodam. `OperacaoService.kt` mantém o processo vivo;
   ele NÃO executa Dart (a lógica segue no isolate principal, com o Drift/Dio
   que já existem). **Tipo `specialUse`, NUNCA `dataSync`:** com `targetSdk 36`,
   `dataSync` é capado em **6h/dia** no Android 15+ e o sistema derruba o
   serviço — um pátio abre mais que isso. `WorkManager` não serve (piso de
   15 min). Camada extra p/ tablet fixo: Device Owner + `STAY_ON_WHILE_PLUGGED_IN`
   (tela não dorme na tomada → nem chega a ir pra background).

## Gate de assinatura em tempo real (2026-07-23)

Antes o estado da assinatura só era lido no login/bootstrap: quando o master
suspendia um tenant, o operador continuava operando até deslogar. Agora o
bloqueio comercial chega **em tempo real** (≤60s ou no próximo sync), **sem
deslogar**. Ver **decisão #11 (REVISTA)** no BRAINSTORM: `suspensa` deixou de ser
"modo restrito" e passou a ser **bloqueio total**.

**Modelo:** `suspensa` / `cancelada` / `tenants.ativo=false` → **bloqueio total**
(tela `/bloqueio`). `atrasada` → **banner + opera**. `trial` vigente / `ativa` →
normal. `trial` expirado → só barra no LOGIN (comportamento do trial preservado).

**API publica, app aplica** (nenhuma rota passou a rejeitar o que aceitava):
- `withAuth` resolve o status **tenant-scoped** (RLS; reusa `fn_assinatura_libera`;
  cache 30s por tenant) e carimba em TODA resposta autenticada:
  `X-Assinatura-Estado` + `X-Assinatura-Bloqueia`. Também injeta `request.assinatura`.
- `login`/`refresh`/`bootstrap` incluem o objeto `assinatura` no corpo
  (`assinatura_estado` mantido por compat). **`login` não recusa mais** tenant
  suspenso/cancelado/atrasado — o app entra e mostra a tela de bloqueio.
- `POST /sync` segue aceitando normal (dreno do outbox nunca para).
- **Nada de migration nova, nada de service_role** neste bloco.

**App (`app/lib/features/assinatura/`):**
- Interceptor Dio global lê os headers de toda resposta → `assinaturaProvider`.
  É o que faz o bloqueio chegar durante o sync/heartbeat.
- Estado persistido em SecureStorage (`nuvempark_assinatura_*`) e **restaurado no
  splash antes de rotear** — force-close não fura o bloqueio.
- Guard do go_router: `bloqueia=true` → `/bloqueio` (sem back). Desbloqueio
  automático quando volta `false` (master reativa → devolve à `/home`, sem relogin).
- Tela `/bloqueio`: nome do pátio, contador de outbox, **Tentar novamente**
  (revalida via heartbeat) e **Sair**. **Sync + heartbeat seguem rodando** ali
  (upload da fila + canal de desbloqueio); quando o outbox zera, avisa.
- **Fail-open offline:** sem sinal do servidor, mantém o último estado conhecido;
  modo avião com assinatura ativa opera normal (nunca bloqueia por falta de rede).
- Banner da home passa a ler o gate **vivo** e cobre só `atrasada`.
- Núcleo (TarifaEngine, sync engine, OCR) **intocado**. Testes: `api` 45/45,
  `app` 86/86, `flutter analyze` limpo, api typecheck limpo.

## ⚠️ Pontos de atenção / correções feitas (importantes)

1. **Chaves de payload alinhadas ao backend:** os payloads de sync do app usam
   `entrada`/`saida`/`abertura`/`fechamento` (epoch-ms) — NÃO `*_epoch` como o
   leve-patio. E **removi `operacao_id` interno** dos payloads: o envelope de
   sync já carrega `patio_id`+`tenant_id`. Se mudar o backend, revalidar.
2. **Tipo de movimento:** o schema tem CHECK `('entrada','sangria','isencao')`.
   O leve-patio usava `'receita'` — no NuvemPark receita de ticket vira
   `'entrada'`. Não reintroduzir `'receita'` sem alterar o CHECK.
3. **Colunas internas do Drift mantêm o nome `operacaoId`** (não renomeei p/
   patioId) para preservar as queries. O valor guardado É o patio_id. O
   mapeamento acontece na fronteira (bootstrap/sync).
4. **Segredos no .env** (api/.env): service_role + JWT Secret passaram pelo chat.
   **Rotacionar antes de produção.**
5. **Android:** minSdk 23, desugaring on, gradle `-Xmx3G` (máquina 11GB — 8G
   crasha OOM). Permissões: câmera, bluetooth (impressão), internet.

## O que FALTA no app (não bloqueia rodar o fluxo principal)

- ~~Impressão térmica~~ ✅ FEITA (auto-print entrada+saída+fechamento de caixa, tela de config).
- ~~QR na saída~~ ✅ FEITA (botão SAÍDA abre o scanner → lê o QR do cupom → vai pra
  saída daquele ticket; fallback pela lista de veículos continua funcionando).
- ~~Restauração de sessão no splash~~ ✅ FEITO (StartupNotifier portado).
- ~~Ícone do app~~ ✅ FEITO (verde+P, launcher icons gerados).
- **Version gate** (forçar atualização).
- **Tela de movimentos do caixa** (lista) — o repo tem getMovimentos, falta UI.

## Como rodar (quando o usuário voltar)

```bash
# 1. Backend (terminal 1)
cd C:\VibeCoding\NuvemPark\api
npm run dev          # sobe em :8080

# 2. App (terminal 2) — precisa de device/emulador conectado
cd C:\VibeCoding\NuvemPark\app
C:\src\flutter\bin\flutter.bat run --dart-define=API_BASE_URL=http://10.0.2.2:8080
# (10.0.2.2 = localhost do host no emulador Android; em device físico, use o IP da máquina)

# Login de teste: código 1234 / usuário ADMIN / senha senha123
# (seed em db/05-seed-teste-login.sql, já aplicado)
```

## Testes

```bash
cd C:\VibeCoding\NuvemPark\app
C:\src\flutter\bin\flutter.bat test    # 20 testes (7 tarifa + 13 OCR)
```

## Próximo passo sugerido

Fluxo operacional completo (entrada → saída → caixa) **contra produção**, no
aparelho, conferindo o reflexo no painel. Depois: Fase 4 (Pix) ou Fase 6
(super-admin + billing).

⚠️ **Pendência conhecida:** `dispositivos` só ganha linha quando um app bate o
heartbeat. Aparelhos que rodaram versões antigas do app não aparecem no painel
até abrirem o app novo pelo menos uma vez.
