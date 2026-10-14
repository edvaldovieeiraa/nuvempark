# Golden do motor de tarifa por contrato

`tarifa-contrato.json` é a bateria única que as três cópias do motor leem:

- app: `app/test/features/tarifa/contrato/golden_test.dart`
- API: `api/src/lib/contrato/golden.test.ts`
- painel: `web/src/lib/contrato/golden.test.ts`

Nenhuma cópia está pronta enquanto não passar em todos os casos.

## Procedência

Os valores esperados vieram do simulador de contrato do CloudPark (pátio 1639,
fora de uso, contratos `REF C1`–`REF C10`, criados e apagados em 2026-10-14). A
grade e as respostas brutas estão em `origem/` (`06-grade-simulador.csv` e
`resultados.jsonl`), copiadas do dossiê de engenharia reversa. C8 (hotel) e C9
(convênio) ficaram fora pela spec `tarifa-contrato` (decisão 2).

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

## Escolhas que o golden não prova

O motor decide estes casos sem resposta do CloudPark (spec, tabela a–f). Os
que mudariam preço sem prova são recusados por `validar` (códigos `nao_provado_*`):

- recomeçar a tabela numa regra por horário — recusado;
- diária com regras por horário (e, com isso, "cobrar menor valor" + diária) — recusado;
- "usar minutos pagos" com mais de uma regra por horário — recusado;
- janela que cruza a meia-noite pertence ao dia em que começa;
- a Padrão para no começo da próxima janela (uma Padrão curta não empurra a regra);
- os minutos pagos param no começo da próxima janela;
- empates: "cobrar menor valor" fica com todas as regras; tabela × diária fica com a diária.

## Não edite à mão

Um valor esperado errado aqui vira cobrança errada nas três cópias. Para
acrescentar casos: simule no CloudPark, acrescente as respostas em `origem/` e
rode `python3 golden/gerar.py` na raiz do repositório.
