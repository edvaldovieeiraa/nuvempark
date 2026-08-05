import type { PaginaSolucao } from "@/lib/solucoes";

/**
 * "Cancela para estacionamento" — o termo mais delicado do silo.
 *
 * É uma consulta de HARDWARE, e o NuvemPark é software que se posiciona
 * justamente como "sem cancela". Ignorar o termo seria abrir mão de um volume
 * de busca grande; responder com uma página de produto seria vender o que não
 * vendemos.
 *
 * ⚠️ SOBRE A INTEGRAÇÃO — leia antes de mexer nesta página.
 *
 * Não existe, hoje, nenhum código de integração com cancela neste repositório:
 * nem driver, nem controladora, nem endpoint. "Integrações via API" está na
 * seção PLANEJADO do roadmap (ver `components/site/secoes.tsx` e
 * `lib/agentes/paginas.ts`).
 *
 * O que é verdade e está escrito abaixo: onde o equipamento expõe uma
 * interface, a integração é POSSÍVEL e avaliada caso a caso. O que NÃO pode ser
 * escrito aqui, enquanto não houver implementação e um equipamento homologado:
 * "já integramos com <marca>", "compatível com <modelo>" ou qualquer lista de
 * fabricantes. Um comprador que escolher o produto por causa dessa frase foi
 * levado a decidir com informação errada.
 */
export const CANCELA: PaginaSolucao = {
  caminho: "/cancela-para-estacionamento",
  h1: "Cancela para estacionamento",
  titulo: "Cancela para Estacionamento: quando compensa | NuvemPark",
  descricao:
    "O que a cancela resolve, o que ela não resolve e quando o controle do pátio pode ser feito só pelo celular. Integração avaliada conforme o equipamento.",
  subtitulo:
    "A cancela controla a passagem. Ela não controla o seu faturamento — e é comum pagar por uma achando que resolve a outra.",
  resposta:
    "Uma cancela para estacionamento é a barreira física que libera a passagem de veículos na entrada e na saída. Ela controla o acesso, não o dinheiro: quem registra o veículo, calcula a tarifa e fecha o caixa é o sistema de gestão. São duas funções separadas e podem ser contratadas separadamente.",
  secoes: [
    {
      h2: "O que é função da cancela e o que é função do sistema",
      texto:
        "A confusão entre as duas é o erro mais caro na hora de montar um pátio. Elas resolvem problemas diferentes:",
      tabela: {
        cabecalho: ["Problema", "Cancela", "Sistema de gestão"],
        linhas: [
          ["Impedir a passagem sem pagar", "Sim", "Não"],
          ["Registrar qual carro entrou e quando", "Não", "Sim"],
          ["Calcular a tarifa da estadia", "Não", "Sim"],
          ["Saber quanto o pátio faturou hoje", "Não", "Sim"],
          ["Amarrar cada real a um operador", "Não", "Sim"],
          ["Controlar mensalistas e credenciados", "Não", "Sim"],
          ["Documentar avaria com foto", "Não", "Sim"],
        ],
      },
      textoFinal:
        "Um pátio com cancela e sem sistema tem barreira e não tem contabilidade. Um pátio com sistema e sem cancela tem contabilidade e depende do operador para a barreira — que é como a maioria dos pátios de rua já opera hoje, só que no caderno.",
    },
    {
      h2: "Quanto custa colocar uma cancela",
      texto:
        "Não há um preço único, e desconfie de quem der um. O custo se divide em parcelas que costumam aparecer separadas no orçamento — vale pedir cada uma discriminada antes de comparar propostas:",
      lista: [
        "O equipamento em si: o pedestal e o braço, por faixa de entrada e de saída",
        "A obra: base de concreto, passagem de cabo e, às vezes, calçada refeita",
        "O laço indutivo ou sensor de presença, cortado no piso",
        "O ponto de energia elétrica até o local da cancela",
        "A controladora e o software que decide quando abrir",
        "A instalação e a configuração, normalmente por visita técnica",
        "A manutenção: braço quebrado por carro é ocorrência comum, não exceção",
      ],
      textoFinal:
        "Some tudo antes de decidir. Em muitos pátios o valor da entrada em equipamento é maior do que anos de mensalidade de um sistema de gestão.",
    },
    {
      h2: "Quando a cancela compensa",
      itens: [
        {
          h3: "Compensa quando a barreira física é o problema",
          texto:
            "Pátio fechado com fluxo alto e saída sem atendente, garagem de prédio, estacionamento que precisa funcionar fora do horário da equipe. Aqui a cancela substitui uma pessoa na guarita, e a conta costuma fechar.",
        },
        {
          h3: "Não compensa quando o problema é de controle",
          texto:
            "Se a dúvida é “quanto entrou hoje e quanto disso chegou até mim”, a cancela não responde. Ela levanta o braço para quem passou pelo processo, seja qual for o processo — inclusive um em que o carro não foi registrado.",
        },
        {
          h3: "Não compensa quando o pátio é de rua ou temporário",
          texto:
            "Terreno alugado, pátio de evento, operação que pode mudar de endereço: a obra não vai junto. É o cenário em que o controle pelo celular tem a vantagem óbvia de caber no bolso do operador.",
        },
      ],
    },
    {
      h2: "Já tenho cancela. Dá para usar o NuvemPark junto?",
      texto:
        "Dá para usar em paralelo desde o primeiro dia: a cancela segue cuidando da barreira e o NuvemPark cuida do registro, da tarifa e do caixa. Nenhuma das duas depende da outra para funcionar, e é assim que a maioria começa.",
      itens: [
        {
          h3: "Integração: depende do que o seu equipamento expõe",
          texto:
            "Onde a cancela ou a controladora oferece uma interface de integração ou de leitura, a conversa entre os dois é possível e avaliamos caso a caso, com o modelo do seu equipamento em mãos. Onde o equipamento é fechado, não há o que integrar — e isso é uma característica dele, não do sistema. Preferimos dizer isso antes da venda a descobrir depois da instalação.",
        },
        {
          h3: "Sem integração, nada se perde",
          texto:
            "O operador registra a entrada pelo aplicativo e libera a cancela como já faz hoje. Você continua com a barreira que já pagou e passa a ter o faturamento ao vivo, que era o que faltava.",
        },
      ],
      link: {
        href: "/sistema-para-estacionamento",
        texto: "Veja o que o sistema controla, com ou sem cancela",
      },
    },
    {
      h2: "Como o controle funciona sem cancela",
      texto:
        "É o modo padrão do NuvemPark e o que permite começar no mesmo dia, sem obra:",
      lista: [
        "O operador aponta o celular e a câmera lê a placa na entrada",
        "O sistema calcula a tarifa na saída, com fração, diária e pernoite",
        "O ticket sai impresso com QR Code numa impressora Bluetooth comum",
        "O pagamento entra em dinheiro, cartão ou Pix, registrado no caixa da sessão",
        "Tudo funciona offline e sobe para o painel quando a conexão volta",
      ],
    },
  ],
  faq: [
    {
      pergunta: "O NuvemPark vende cancela?",
      resposta:
        "Não. O NuvemPark é o software de gestão do pátio: registro de veículos, cálculo de tarifa, ticket, pagamentos e caixa. A barreira física, quando o seu pátio precisa de uma, é compra separada com um fornecedor de equipamento.",
    },
    {
      pergunta: "O sistema integra com a cancela que eu já tenho?",
      resposta:
        "Depende do equipamento. Onde a cancela ou a controladora disponibiliza integração ou leitura, a conexão é possível e avaliamos caso a caso — mande o modelo pelo WhatsApp que a gente verifica. Onde o equipamento é fechado, não há interface para conversar com ele; nesse caso os dois seguem funcionando lado a lado, sem prejuízo para o controle.",
    },
    {
      pergunta: "Preciso de cancela para usar o NuvemPark?",
      resposta:
        "Não. O sistema foi feito para operar sem cancela, sem servidor local e sem obra: a operação acontece num aplicativo Android no celular que a equipe já tem.",
    },
    {
      pergunta: "Sem cancela, o que impede alguém de sair sem pagar?",
      resposta:
        "O mesmo que impede hoje na maioria dos pátios de rua: o operador na saída. O que muda com o sistema é que a estadia daquele veículo está registrada com placa e horário, então uma saída sem pagamento vira uma pendência visível no painel em vez de um prejuízo que ninguém percebeu.",
    },
    {
      pergunta: "Quanto custa uma cancela para estacionamento?",
      resposta:
        "Varia muito conforme o equipamento, o número de faixas e a obra necessária. Peça o orçamento discriminado — equipamento, base, laço indutivo, ponto de energia, controladora, instalação e manutenção — porque as parcelas que não aparecem na primeira proposta costumam ser as que pesam.",
    },
  ],
  migalhas: [
    { nome: "Início", caminho: "/" },
    { nome: "Sistema para estacionamento", caminho: "/sistema-para-estacionamento" },
  ],
  relacionados: [
    "/sistema-para-estacionamento",
    "/controle-de-estacionamento",
    "/aplicativo-para-estacionamento",
  ],
};
