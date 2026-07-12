# Transformar o NuvemPark em Device Owner (trava total de maquininha)

Por padrão, o app já ativa o **Lock Task Mode** (fixa a tela, bloqueia barra de
notificação/status e botões) — mas o Android pede uma confirmação na 1ª vez e o
operador consegue soltar segurando os botões.

Para travar **de verdade** (sem diálogo, o operador não sai), registre o app
como **Device Owner** no aparelho. O mesmo código de lock task passa a travar
sem nenhuma confirmação — nada muda no app, só no provisionamento do aparelho.

## Requisitos do aparelho
- Aparelho **de fábrica ou recém-resetado** (sem nenhuma conta Google adicionada).
  Se já tem conta Google, é preciso remover TODAS as contas antes.
- Depuração USB (ou WiFi) ativada.

## Comando (uma vez por aparelho)

Com o app já instalado e o aparelho conectado via adb:

```bash
# Windows (adb no PATH ou caminho completo):
adb shell dpm set-device-owner com.nuvempark.nuvempark_app/com.nuvempark.nuvempark_app.NuvemParkDeviceAdminReceiver
```

Se der "Not allowed to set the device owner because there are already some
accounts on the device", remova as contas em Ajustes → Contas e tente de novo.

Sucesso aparece como:
```
Success: Device owner set to package com.nuvempark.nuvempark_app
```

## Para REMOVER o device owner (ex.: devolver o aparelho)

```bash
adb shell dpm remove-active-admin com.nuvempark.nuvempark_app/com.nuvempark.nuvempark_app.NuvemParkDeviceAdminReceiver
```
(ou um factory reset resolve.)

## Depois de provisionar
Nada a fazer no app — no próximo login, o lock task entra **sem diálogo** e o
operador fica preso no NuvemPark até o logout (que libera a tela).
