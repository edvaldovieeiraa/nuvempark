# NuvemPark — Handoff (estado ao retomar)

> Última atualização: 2026-07-09 (sessão autônoma). Todo o app compila
> (`flutter analyze` limpo), passa nos testes (20 verdes) e o **APK debug BUILDA
> com sucesso** (`app-debug.apk`, 207MB). Ainda não INSTALADO/rodado em device.
>
> **Restauração de sessão** (splash) e **ícone NuvemPark** (verde+P) já feitos.
> **Impressão BT + QR scan** integrados. Fluxo operacional 100%.
>
> **RELEASE:** keystore criado e assinatura configurada (ver memória
> parkflow-release-signing). Deploy do backend documentado em api/DEPLOY.md.
> ⚠️ **BLOQUEIO:** marca/domínio — "parkflow" indisponível, usuário repensando o
> nome (dir. estacionamento/vaga; VagaFlow recomendado). A URL do backend fica
> embutida no APK, então o release final depende disso. Troca de marca é mecânica.
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
| 5. Painel do gestor + dashboard (web) | ⏳ não iniciado |
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

Rodar o app num device/emulador e fazer o **fluxo completo end-to-end**
(login → bootstrap → entrada → saída → caixa) contra a API local, ajustando o
que aparecer. Depois: Fase 4 (Pix) ou Fase 5 (painel do gestor).
