# NuvemPark — Resumo não técnico (apoio para prints / mockups da Play Store)

> Documento de apoio. Descreve o app em linguagem de produto, tela por tela,
> com o que aparece em cada uma — pensado para alimentar geração de
> prints/mockups e para escrever os textos da ficha da Play Store.

---

## 1. O que é, em uma frase

**NuvemPark é o aplicativo do operador de estacionamento**: registra a entrada
do veículo, calcula o valor na saída, recebe o pagamento, imprime o cupom e
fecha o caixa do dia — funcionando mesmo sem internet.

**Assinatura da ficha (uma linha):**
> Gestão de estacionamento na palma da mão. Entrada, saída, Pix e caixa.

## 2. Para quem é

| Quem | Onde usa | O que faz |
|---|---|---|
| **Operador do pátio** (usuário do app) | Celular ou tablet, no guichê ou na cancela | Entrada, saída, cobrança, caixa |
| Dono / gerente | Painel web (não é este app) | Faturamento, tarifas, operadores |

O público do app é o **operador**: pessoa de pé, no sol, com uma mão só e
pressa. Isso explica todas as escolhas de tela — botões grandes, letra grande,
poucos toques e nada que dependa de conexão.

## 3. Os 4 diferenciais (o que deve aparecer nos prints)

1. **Funciona offline.** Acabou a internet? O app continua registrando tudo.
   Quando a conexão volta, sincroniza sozinho, sem ninguém apertar nada.
2. **Lê a placa pela câmera.** Aponta para o carro, o app reconhece a placa.
   Sem digitação.
3. **Pix na hora.** QR code do Pix aparece na tela do celular do operador e a
   baixa do pagamento é automática.
4. **Imprime o cupom por Bluetooth.** Cupom de entrada com QR code, recibo de
   saída e fechamento de caixa — em impressora térmica 58mm ou 80mm.

## 4. Identidade visual (para os mockups ficarem fiéis)

- **Tema claro** ("light-first") — feito para ser lido sob sol forte.
- **Fundo do app:** verde-branco muito claro `#F4F8F5`; cards brancos.
- **Verde da marca (texto e ícones):** `#15803D`
- **Verde de preenchimento (botões e chips):** `#16A34A` com texto branco
- **Cards escuros de destaque:** verde profundo `#123B2A` com texto branco
- **Entrada = verde** `#16A34A` · **Saída = laranja** `#EA580C`
- **Alertas:** aviso âmbar `#B45309` · erro vermelho `#DC2626`
- **Fonte:** Plus Jakarta Sans
- **Formas:** botões em pílula (totalmente arredondados), cards com cantos de
  20–24px, chips de 14–18px, sombra suave esverdeada.
- **Barra inferior de navegação:** efeito vidro (translúcida, desfocada),
  flutuando sobre o conteúdo — 4 abas: **Início · Pátio · Caixa · Menu**.

---

## 5. As telas, uma a uma

### 5.1 Login
- Marca **NuvemPark** com o selo *"GESTÃO DE ESTACIONAMENTO"*.
- Três campos: **Código do pátio** (4 dígitos), **Usuário**, **Senha**.
- Botão em pílula verde: **Entrar no pátio**. Link *"Esqueci minha senha"*.
- Se a empresa tem mais de um estacionamento, aparece a tela **"Escolha o
  pátio"** logo depois.

### 5.2 Início (aba 1) — a tela-cartão-postal do app
Tudo o que o operador precisa saber em uma olhada:
- **Saudação** ("Bom dia", "Boa tarde", "Boa noite") + nome do operador e do pátio.
- **Card de ocupação:** número grande de vagas ocupadas — ex.: **`42` de 80** —
  e a etiqueta *"Pátio a 53%"*.
- **Card do caixa:** aberto ou fechado, com o valor do movimento.
- **Dois botões grandes de ação:** **Entrada** (verde) e **Saída** (laranja).
- **Últimas entradas:** lista de placas com horário.
- **Status no topo:** ícone da impressora Bluetooth (conectada/desconectada) e
  o estado da sincronização — *"Tudo em dia"* ou *"Sincronizando…"*.
- Quando o aparelho fica sem internet, sobe um **aviso discreto** acima da barra
  inferior (que pode ser recolhido para um badge fino).

### 5.3 Entrada do veículo
- Câmera aberta com a moldura da placa e a dica *"Ler placa com a câmera"*.
- A placa é reconhecida sozinha (formato `ABC1D23`) e pode ser corrigida à mão.
- Registra a **foto do veículo** (opcional: sai impressa no cupom).
- Permite marcar **avaria na entrada** — *"Danos no veículo na entrada — com
  fotos"* + descrição (ex.: *"risco na porta esquerda"*).
- Se a placa é de **mensalista ou credenciado**, o app avisa na hora.
- Confirmação: **"Entrada registrada!"** e o cupom com QR code imprime sozinho.

### 5.4 Saída e cobrança
Três formas de achar o veículo (o app pergunta *"QR, foto ou placa"*):
1. **Ler QR do cupom** — *"Escaneia o código do ticket de entrada"*
2. **Fotografar a placa** — *"A câmera lê a placa e encontra o veículo"*
3. **Digitar a placa** — *"Quando o cupom sumiu e a câmera não ajuda"*

Depois:
- Mostra placa, horário de entrada, tempo de permanência e o **valor calculado**
  pela tabela de preços vigente.
- Pergunta **"Como o cliente vai pagar?"** — **Dinheiro**, **Pix**,
  **Cartão de débito**, **Cartão de crédito**.
- No Pix: **"Gerar QR Pix na tela"** → aparece o QR grande com *"Pague com
  Pix"*, contagem regressiva (*"Link válido por mais 4 min"*) e o app espera a
  confirmação (*"Aguardando o pagamento…"* → **"PAGO ONLINE VIA PIX"**).
- Aceita **voucher de parceiro** (loja/restaurante que valida o estacionamento):
  a tela mostra *"Liberado por [nome do parceiro]"* e, se houver saldo,
  **"Cobrar diferença"**.
- Também existe a **saída livre** (isento/mensalista), sem cobrança.
- Confirmação e recibo impresso — sem travar a tela esperando a impressora.

### 5.5 Pátio (aba 2)
- Lista de todos os veículos, com **busca por placa** e filtros:
  **No pátio · Fechados · Cancelados · Todos**.
- Cada linha: placa, horário (*"Entrou 14:32"*) e botão **Registrar saída**.
- Estado vazio simpático: **"Pátio vazio"**.
- Permite **reimprimir o cupom** de um veículo.

### 5.6 Caixa (aba 3)
O turno inteiro do operador, do abrir ao fechar:
- **Abrir caixa** informando o **fundo inicial (R$)**.
- **Movimentos do caixa:** cada pagamento recebido, por forma de pagamento.
- **Sangria** (retirada de dinheiro) e **despesa** (ex.: *"compra de bobina"*).
- **Fechar caixa** com conferência às cegas: o operador digita o **contado**, o
  app compara com o **esperado** e mostra **"Caixa confere"** ou a
  **divergência** (*"Falta de R$ 12,00"*), com campo de justificativa.
- Comprovante de fechamento impresso (e reimprimível).

### 5.7 Menu (aba 4)
- **Mensalistas / credenciados:** busca por nome ou placa, com etiquetas
  **Em dia · A vencer · Atrasados** e a competência do mês.
- **Impressora Bluetooth:** parear, escolher 58mm ou 80mm, avanço de papel e
  **imprimir página de teste**.
- **Sincronização:** quantos registros faltam subir e botão
  **"Sincronizar agora"** (*"Nada pendente — tudo em dia."*).
- **Cadastros de consulta:** tabelas de preço, tipos de veículo, formas de
  pagamento.
- **Sobre:** nome do pátio, operador logado, versão do app, código do aparelho.
- **Sair do app.**

### 5.8 Telas de estado (podem virar prints, mas não são prioridade)
- Aparelho não autorizado, sessão revogada, assinatura suspensa.

---

## 6. Roteiro sugerido dos 6 a 8 prints da Play Store

Ordem pensada para contar a história em 5 segundos de rolagem:

| # | Tela | Legenda sugerida (curta, 3–6 palavras) |
|---|---|---|
| 1 | **Início** com o card de ocupação | *Seu pátio inteiro numa tela* |
| 2 | **Câmera lendo a placa** | *A câmera lê a placa* |
| 3 | **Saída com o valor calculado** | *Cobrança certa, sem calculadora* |
| 4 | **QR do Pix na tela** | *Receba no Pix na hora* |
| 5 | **Cupom saindo da impressora** (mockup com impressora térmica) | *Cupom impresso na hora* |
| 6 | **Fechamento de caixa "Caixa confere"** | *Caixa fechado sem surpresa* |
| 7 | **Aviso de offline / sincronização** | *Funciona sem internet* |
| 8 | **Lista de mensalistas** | *Mensalistas sempre em dia* |

**Dica de mockup:** o app é usado em pé, no pátio. Cenas de fundo que funcionam:
guichê de estacionamento, cancela, operador de colete segurando o celular com
uma mão, impressora térmica na cintura. Evitar cenário de escritório.

---

## 7. Textos prontos para a ficha da Play Store

**Nome:** NuvemPark — Gestão de Estacionamento

**Descrição curta (até 80 caracteres):**
> Entrada, saída, Pix e caixa do seu estacionamento. Funciona até sem internet.

**Descrição completa (rascunho):**

> **O aplicativo que o operador do pátio realmente usa.**
>
> O NuvemPark cuida da operação do seu estacionamento do começo ao fim: registra
> a entrada, calcula o valor na saída, recebe o pagamento, imprime o cupom e
> fecha o caixa do turno.
>
> **Rápido de verdade**
> • A câmera lê a placa — sem digitar
> • Foto do veículo e registro de avaria na entrada
> • Achou o carro pelo QR do cupom, pela placa ou pela foto
>
> **Recebe do jeito que o cliente quer**
> • Pix com QR code na tela e baixa automática
> • Dinheiro, débito e crédito
> • Vouchers de lojas parceiras que validam o estacionamento
>
> **Funciona sem internet**
> Caiu a conexão, o app continua trabalhando. Quando a rede volta, tudo
> sincroniza sozinho — nada se perde.
>
> **Cupom impresso na hora**
> Impressora térmica Bluetooth (58mm ou 80mm): cupom de entrada com QR, recibo
> de saída e fechamento de caixa.
>
> **Caixa fechado sem dor de cabeça**
> Fundo inicial, sangrias, despesas e conferência no fim do turno — com o
> esperado e o contado lado a lado.
>
> **Mensalistas e credenciados**
> Consulta na hora quem está em dia, a vencer ou atrasado.
>
> **Vários pátios, uma conta**
> Rede de estacionamentos? Cada pátio com sua operação, tudo no mesmo lugar.
>
> O NuvemPark é vendido por assinatura mensal por estacionamento. Para usar o
> app, é preciso ter uma conta ativa. Conheça em nuvempark.com.

**Categoria:** Empresas
**Palavras-chave:** estacionamento, pátio, controle de estacionamento, ticket,
caixa, valet, mensalista, Pix, cupom, cancela

---

## 8. Vocabulário do produto (usar sempre estes termos)

| Termo | Significa |
|---|---|
| **Pátio** | Um estacionamento (uma unidade física) |
| **Ticket** | O registro de um veículo, da entrada à saída |
| **Cupom** | O papel impresso entregue ao cliente na entrada |
| **Caixa** | O turno de trabalho do operador, com dinheiro dentro |
| **Sangria** | Retirada de dinheiro do caixa durante o turno |
| **Mensalista** | Cliente que paga mensalidade |
| **Credenciado** | Cliente com passagem livre, sem mensalidade |
| **Voucher** | Validação de um parceiro que abate o valor do cliente |
| **Operador** | Quem usa o app |
| **Gestor** | Dono/gerente, que usa o painel web |
