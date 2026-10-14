# Golden do motor de tarifa por contrato

`tarifa-contrato.json` é a bateria única que as três cópias do motor leem:

- app: `app/test/features/tarifa/contrato/golden_test.dart`
- API: `api/src/lib/contrato/golden.test.ts`
- painel: `web/src/lib/contrato/golden.test.ts`

Nenhuma cópia está pronta enquanto não passar em todos os casos.

## Procedência

Os valores esperados vieram do simulador de contrato do CloudPark (pátio 1639,
fora de uso, contratos `REF C1`–`REF C10`, criados e apagados em 2026-10-14). A
grade e as respostas brutas estão no dossiê `cloudpark-clone/docs/engenharia-reversa`
(`06-grade-simulador.csv` e `golden/resultados.jsonl`). C8 (hotel) e C9 (convênio)
ficaram fora pela spec `tarifa-contrato` (decisão 2).

Os contratos estão traduzidos para o modelo do NuvemPark (`regras`, `faixas`,
`fracao`, centavos, dias ISO 1 = segunda … 7 = domingo). Horários em UTC;
`entrada_local`/`saida_local` são o horário de Brasília para leitura.

## O que cada caso confere

- `total_centavos`: total exato.
- `minutos_restantes`: minutos já pagos depois da saída.
- `fatias`: regra (ou `diarias`) e valor de cada fatia, na ordem.
- `memoria_cloudpark` é só diagnóstico: a duração que o CloudPark escreve em cada
  fatia não segue um critério único (a Padrão mostra o tempo decorrido; uma regra
  por horário mostra o tempo pago até o fim da janela).

## Não edite à mão

Um valor esperado errado aqui vira cobrança errada nas três cópias. Para
acrescentar casos, simule no CloudPark e regenere o arquivo.
