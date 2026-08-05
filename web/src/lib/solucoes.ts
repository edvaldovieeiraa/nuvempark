/**
 * AS PÁGINAS COMERCIAIS DE BUSCA ("silo de solução").
 *
 * Por que existem, já que o site é ONEPAGE: a home é a página de MARCA e cobre
 * tudo um pouco — recursos, preço, sobre, contato, novidades. Isso a torna forte
 * para "NuvemPark" e fraca para uma consulta específica como "gestão de
 * estacionamentos": para o Google, o assunto dela é difuso. Cada página aqui
 * tem UM assunto, um H1 que é o próprio termo buscado e profundidade suficiente
 * para ser a melhor resposta daquela consulta.
 *
 * A home continua intacta. Estas páginas NÃO ressuscitam /recursos e /precos
 * (que seguem 301 para as âncoras) — são endereços novos, com intenção de busca
 * própria.
 *
 * ⚠️ REGRA DE CONTEÚDO: tudo aqui é afirmação pública sobre o produto. Só entra
 * o que o sistema faz HOJE. Preço, prazo de teste e telefone espelham
 * `components/site/precos.tsx`, `faq.tsx` e `tokens.ts` — se mudarem lá, mudam
 * aqui (a mesma regra que vale para `lib/agentes/paginas.ts`). Um recurso
 * prometido numa página de busca é uma venda feita com informação errada.
 */

import { CANCELA } from "@/lib/solucoes-cancela";

export type ItemH3 = { h3: string; texto: string };

export type SecaoSolucao = {
  h2: string;
  texto?: string;
  /** Subtópicos. Viram <h3> — o nível de detalhe do silo. */
  itens?: ItemH3[];
  /**
   * Lista simples. Formato que o Google mais promove a featured snippet quando
   * a consulta é "o que precisa ter / quais são / como escolher".
   */
  lista?: string[];
  /** Comparação. O outro formato que vira snippet (tabela). */
  tabela?: { cabecalho: string[]; linhas: string[][] };
  /** Fechamento da seção, depois da lista/tabela. */
  textoFinal?: string;
  /** Lista de links — usada pelo pilar para apontar às páginas de cidade. */
  links?: { href: string; texto: string }[];
  /** Link contextual no fim da seção — é assim que a autoridade circula. */
  link?: { href: string; texto: string };
};

export type PaginaSolucao = {
  /** Caminho público, exatamente como no sitemap. */
  caminho: string;
  h1: string;
  /** <title>. Até ~60 caracteres para não truncar no resultado. */
  titulo: string;
  /** Meta description. Até ~155 caracteres. */
  descricao: string;
  /**
   * Resposta direta em 40–55 palavras, logo abaixo do H1. É o bloco que o
   * Google recorta como definição/snippet — e o que um leitor apressado lê
   * antes de decidir se rola a página.
   */
  resposta: string;
  /** Frase de apoio no hero. */
  subtitulo: string;
  secoes: SecaoSolucao[];
  faq: { pergunta: string; resposta: string }[];
  /** Migalhas ANTES desta página (a própria é acrescentada na renderização). */
  migalhas: { nome: string; caminho: string }[];
  /** Caminhos das páginas irmãs/filhas ligadas ao pé. */
  relacionados: string[];
  /** Posts do blog que aprofundam o tema — passam autoridade nos dois sentidos. */
  leituras?: { href: string; titulo: string }[];
};

/* ═══════════════════════════════════════════════════════════════════════════
   PILAR — o termo de cabeça do mercado.
   ═══════════════════════════════════════════════════════════════════════════ */

export const PILAR: PaginaSolucao = {
  caminho: "/sistema-para-estacionamento",
  h1: "Sistema para estacionamento",
  titulo: "Sistema para Estacionamento: 15 dias grátis | NuvemPark",
  descricao:
    "Sistema para estacionamento que roda no celular do operador, funciona sem internet e mostra o faturamento ao vivo. Sem cancela e sem obra. 15 dias grátis.",
  subtitulo:
    "O poder de um sistema caro, sem a cancela, o servidor e a instalação que ninguém quer.",
  resposta:
    "Um sistema para estacionamento é o software que registra a entrada e a saída de cada veículo, calcula a tarifa, emite o ticket e controla o caixa do pátio. No NuvemPark isso acontece num aplicativo Android que funciona mesmo sem internet, com o faturamento aparecendo ao vivo no painel do gestor.",
  secoes: [
    {
      h2: "O que um sistema para estacionamento precisa ter",
      texto:
        "Antes de comparar preço, compare capacidade. Estes são os pontos que separam um sistema que aguenta sexta-feira às 18h de um que só funciona na demonstração:",
      lista: [
        "Operação offline — a fila não pode parar quando a internet cai",
        "Registro de entrada e saída com placa, sem depender de digitação",
        "Cálculo automático de tarifa por fração, hora, diária e pernoite",
        "Ticket impresso com comprovante para o cliente",
        "Caixa por operador, com abertura, sangria e fechamento conferido",
        "Controle de mensalistas separado do rotativo",
        "Painel do gestor acessível de fora do pátio",
        "Relatório de faturamento que fecha com o dinheiro em caixa",
      ],
    },
    {
      h2: "Como o NuvemPark funciona no dia a dia do pátio",
      itens: [
        {
          h3: "Na entrada: a câmera digita a placa",
          texto:
            "O operador aponta o celular para o veículo e a placa entra sozinha, sem erro de digitação e sem fila crescendo. Ele escolhe o tipo de veículo e o registro já nasce com data, hora e dono.",
        },
        {
          h3: "Na saída: o sistema faz a conta",
          texto:
            "Fração inicial, fração adicional, teto de diária, tolerância e pernoite são aplicados automaticamente sobre a tabela que você configurou. Sem conta de cabeça e sem prejuízo no arredondamento. O comprovante sai numa impressora térmica Bluetooth comum, com QR Code e o nome do seu pátio.",
        },
        {
          h3: "No fechamento: cada real tem dono",
          texto:
            "Cada operador trabalha dentro de uma sessão de caixa com dono e horário. Sangrias ficam registradas e o fechamento é conferido contra o valor esperado. A diferença, quando existe, aparece com nome e hora.",
        },
      ],
    },
    {
      h2: "Sistema para estacionamento com cancela ou sem cancela?",
      texto:
        "A cancela controla a barreira física. O sistema controla o dinheiro. São coisas diferentes, e é comum pagar caro por uma achando que está resolvendo a outra. A comparação honesta:",
      tabela: {
        cabecalho: ["", "Sistema com cancela", "NuvemPark"],
        linhas: [
          ["Investimento inicial", "Equipamento, instalação e obra", "R$ 0 — usa o celular da equipe"],
          ["Prazo para operar", "Semanas de projeto e instalação", "No mesmo dia"],
          ["Se a internet cair", "Depende do equipamento", "Opera offline e sincroniza depois"],
          ["Se faltar energia", "Barreira parada", "Celular com bateria segue registrando"],
          ["Mudar de endereço", "Desinstalar e reinstalar", "Leva o celular"],
          ["Barreira física", "Sim", "Não — o controle é do registro e do caixa"],
        ],
      },
      textoFinal:
        "Se o seu pátio precisa de barreira física, a cancela continua fazendo sentido — só não é ela que vai te dizer quanto você faturou hoje.",
    },
    {
      h2: "Quanto custa um sistema para estacionamento",
      texto:
        "O modelo tradicional cobra pelo equipamento, pela instalação e depois pela licença — o que empurra o custo de entrada para milhares de reais antes do primeiro carro. O NuvemPark cobra R$ 129,90 por mês, por pátio, com tudo incluso: sem taxa de instalação, sem cobrança por operador e sem fidelidade. O teste são 15 dias completos, sem cartão de crédito.",
      lista: [
        "R$ 129,90 por mês, por pátio",
        "15 dias grátis, sem cartão de crédito",
        "Sem taxa de instalação e sem cobrança por operador",
        "Atualizações e suporte no WhatsApp inclusos",
        "Sem fidelidade — cancele quando quiser",
      ],
    },
    {
      h2: "Onde o NuvemPark é usado",
      texto:
        "O sistema é na nuvem e não exige visita técnica, então funciona em qualquer cidade do país sem diferença de prazo ou de preço. Escrevemos sobre o contexto de operar um pátio nestas:",
      links: [
        { href: "/sistema-para-estacionamento/sao-paulo", texto: "Sistema para estacionamento em São Paulo" },
        { href: "/sistema-para-estacionamento/rio-de-janeiro", texto: "Sistema para estacionamento no Rio de Janeiro" },
        { href: "/sistema-para-estacionamento/recife", texto: "Sistema para estacionamento em Recife" },
        { href: "/sistema-para-estacionamento/olinda", texto: "Sistema para estacionamento em Olinda" },
        { href: "/sistema-para-estacionamento/jaboatao-dos-guararapes", texto: "Sistema para estacionamento em Jaboatão dos Guararapes" },
      ],
    },
    {
      h2: "Para que tipo de estacionamento serve",
      texto:
        "O mesmo sistema atende de um pátio de bairro a uma rede com várias unidades. O que muda é a configuração, não o produto:",
      itens: [
        {
          h3: "Pátio avulso e estacionamento privativo",
          texto:
            "Um operador, uma tabela de preço, caixa fechado no fim do turno. É o cenário mais simples e o que mais sofre com caderno e planilha.",
        },
        {
          h3: "Redes com vários pátios",
          texto:
            "Cada pátio com suas tarifas, seus operadores e seu caixa, tudo consolidado num painel só. Crescer não exige trocar de sistema nem abrir outra conta.",
        },
        {
          h3: "Shoppings, condomínios e hotéis",
          texto:
            "Mensalistas, credenciados e livre passagem convivem com o rotativo na mesma operação, cada um com sua regra de cobrança.",
        },
      ],
    },
  ],
  faq: [
    {
      pergunta: "Preciso instalar cancela ou algum equipamento?",
      resposta:
        "Não. O NuvemPark roda no celular Android que o operador já tem e no navegador do gestor. Sem cancela, sem servidor local e sem obra. A única compra opcional é uma impressora térmica Bluetooth comum, a mesma usada em delivery, se você quiser entregar ticket impresso.",
    },
    {
      pergunta: "O sistema funciona sem internet?",
      resposta:
        "Sim. O aplicativo registra entradas, saídas e pagamentos offline e sincroniza tudo sozinho quando a conexão volta. A fila continua andando mesmo com o sinal fora do ar.",
    },
    {
      pergunta: "Quanto custa o sistema para estacionamento?",
      resposta:
        "R$ 129,90 por mês, por pátio, com tudo incluso. Não há taxa de instalação, cobrança por operador nem fidelidade. O teste são 15 dias completos, sem cartão de crédito.",
    },
    {
      pergunta: "Quanto tempo leva para começar a usar?",
      resposta:
        "No mesmo dia. Você mesmo cria a conta em cerca de um minuto, cadastra o pátio e a tabela de preço, e seus operadores entram no aplicativo com o código do pátio. Não há visita técnica nem instalação.",
    },
    {
      pergunta: "Tenho mais de um pátio. Preciso de contas separadas?",
      resposta:
        "Não. Todos os pátios ficam na mesma conta, cada um com suas tarifas, operadores e caixa, consolidados num painel só. A cobrança é por pátio ativo.",
    },
    {
      pergunta: "Meus dados ficam seguros?",
      resposta:
        "Sim. Tudo trafega criptografado e fica guardado na nuvem com backup automático. Nada depende de um computador que pode queimar ou ser roubado dentro do pátio.",
    },
  ],
  migalhas: [{ nome: "Início", caminho: "/" }],
  relacionados: [
    "/gestao-de-estacionamento",
    "/controle-de-estacionamento",
    "/aplicativo-para-estacionamento",
    "/cancela-para-estacionamento",
  ],
  leituras: [
    {
      href: "/blog/sistema-para-estacionamento-o-que-precisa-ter",
      titulo: "Sistema para estacionamento: o que precisa ter",
    },
    {
      href: "/blog/como-administrar-um-estacionamento",
      titulo: "Como administrar um estacionamento",
    },
    {
      href: "/blog/quanto-fatura-um-estacionamento",
      titulo: "Quanto fatura um estacionamento",
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   IRMÃS — cada uma com uma intenção de busca distinta da do pilar.
   ═══════════════════════════════════════════════════════════════════════════ */

export const GESTAO: PaginaSolucao = {
  caminho: "/gestao-de-estacionamento",
  h1: "Gestão de estacionamento",
  titulo: "Gestão de Estacionamentos: como controlar o caixa | NuvemPark",
  descricao:
    "Gestão de estacionamento sem depender da palavra do operador: caixa por sessão, faturamento ao vivo, mensalistas e vários pátios num painel só.",
  subtitulo:
    "Pare de perguntar “quanto faturou hoje?”. A resposta já está na tela.",
  resposta:
    "Gestão de estacionamento é o controle do dinheiro e da ocupação do pátio: quanto entrou, por qual operador, em que forma de pagamento e quantas vagas estão ocupadas agora. Sem registro por veículo e caixa com dono, o gestor depende da palavra de quem está no pátio.",
  secoes: [
    {
      h2: "Onde o dinheiro de um estacionamento costuma vazar",
      texto:
        "Nenhum desses buracos aparece no fim do mês como uma linha chamada “prejuízo”. Eles aparecem como um faturamento que nunca bate com o movimento que você viu:",
      lista: [
        "Carro que entrou e nunca foi registrado",
        "Valor arredondado para baixo “porque o cliente reclamou”",
        "Caixa sem dono no fim do turno, com diferença que ninguém explica",
        "Mensalista que parou de pagar e continuou entrando",
        "Avaria discutida sem foto, resolvida no prejuízo",
        "Movimento do fim de semana que só chega na segunda, de cabeça",
      ],
    },
    {
      h2: "Os quatro controles que fecham a gestão",
      itens: [
        {
          h3: "Faturamento ao vivo",
          texto:
            "Cada entrada e cada real aparecem no painel no momento em que acontecem. Um pátio ou uma rede inteira, consolidados numa conta só — de casa, do carro ou de outra cidade.",
        },
        {
          h3: "Caixa por operador",
          texto:
            "Cada turno é uma sessão com dono e horário. Sangria registrada, fechamento conferido contra o valor esperado e a diferença, quando existe, com nome e hora. É o que transforma “sumiu dinheiro” em um fato verificável.",
        },
        {
          h3: "Mensalistas e credenciados",
          texto:
            "Planos, vencimentos e pagamentos separados do rotativo. Livre passagem para quem tem direito, sem misturar com a tarifa por hora.",
        },
        {
          h3: "Avarias com foto",
          texto:
            "O registro fotográfico do veículo fica anexado ao movimento. A discussão sobre um risco na porta deixa de ser palavra contra palavra.",
        },
      ],
    },
    {
      h2: "Caderno, planilha ou sistema: o que muda na prática",
      tabela: {
        cabecalho: ["", "Caderno", "Planilha", "NuvemPark"],
        linhas: [
          ["Saber o faturamento agora", "Não", "Só depois de digitar", "Ao vivo"],
          ["Conferir caixa por operador", "Não", "Manual", "Automático"],
          ["Rastrear um carro específico", "Folheando", "Se alguém digitou", "Busca por placa"],
          ["Ver de fora do pátio", "Não", "Se estiver na nuvem", "Sim"],
          ["Risco de perder o histórico", "Alto", "Alto", "Backup automático"],
        ],
      },
      link: {
        href: "/blog/planilha-de-controle-de-estacionamento",
        texto: "Leia também: os limites da planilha de controle de estacionamento",
      },
    },
    {
      h2: "Como começar a organizar a gestão hoje",
      texto:
        "A ordem importa. Tentar controlar tudo de uma vez é o motivo mais comum de um sistema ser abandonado na segunda semana:",
      itens: [
        {
          h3: "1. Acerte a tabela de preço primeiro",
          texto:
            "Fração, hora cheia, teto de diária e tolerância definidos antes de qualquer coisa. É a regra que vai calcular todo o resto — errar aqui contamina o faturamento inteiro.",
        },
        {
          h3: "2. Registre 100% das entradas por uma semana",
          texto:
            "Sem exceção “só esse aqui”. Uma semana de registro completo já mostra o tamanho real do movimento e a distância entre o que entra e o que era declarado.",
        },
        {
          h3: "3. Só então feche caixa por operador",
          texto:
            "Com entrada e tarifa confiáveis, o fechamento passa a medir a operação em vez de medir a falha de registro.",
        },
      ],
      link: {
        href: "/blog/como-administrar-um-estacionamento",
        texto: "Guia completo: como administrar um estacionamento",
      },
    },
  ],
  faq: [
    {
      pergunta: "Como saber quanto o estacionamento faturou hoje?",
      resposta:
        "Com registro por veículo e caixa por sessão, o valor aparece no painel em tempo real, sem precisar perguntar ao operador. No NuvemPark cada entrada e cada pagamento sobem para o painel do gestor no momento em que acontecem.",
    },
    {
      pergunta: "Dá para gerenciar vários estacionamentos na mesma conta?",
      resposta:
        "Sim. Cada pátio tem suas próprias tarifas, operadores e caixa, e todos aparecem consolidados num painel só. A cobrança é de R$ 129,90 por mês por pátio ativo.",
    },
    {
      pergunta: "Como controlar o caixa de cada operador?",
      resposta:
        "Cada turno é uma sessão de caixa com dono e horário. Sangrias ficam registradas e o fechamento é conferido contra o valor esperado do período, mostrando a diferença com nome e hora quando ela existe.",
    },
    {
      pergunta: "O gestor precisa estar no pátio para acompanhar?",
      resposta:
        "Não. O painel é web e abre em qualquer navegador, inclusive no celular. Faturamento, ocupação e últimos movimentos ficam visíveis de onde você estiver.",
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
  leituras: [
    {
      href: "/blog/como-administrar-um-estacionamento",
      titulo: "Como administrar um estacionamento",
    },
    {
      href: "/blog/quanto-fatura-um-estacionamento",
      titulo: "Quanto fatura um estacionamento",
    },
    {
      href: "/blog/como-montar-a-tabela-de-precos-do-estacionamento",
      titulo: "Como montar a tabela de preços do estacionamento",
    },
  ],
};

export const CONTROLE: PaginaSolucao = {
  caminho: "/controle-de-estacionamento",
  h1: "Controle de estacionamento",
  titulo: "Controle de Estacionamento: entrada e saída de veículos | NuvemPark",
  descricao:
    "Controle de entrada e saída de veículos com placa, hora e valor registrados por operador. Substitui caderno e planilha, e funciona sem internet.",
  subtitulo:
    "Cada carro registrado, com placa, hora e dono — e nada dependendo de memória.",
  resposta:
    "Controle de estacionamento é o registro rastreável de cada veículo que entra e sai do pátio: placa, horário de entrada, horário de saída, valor cobrado e qual operador atendeu. É esse registro que permite conferir o caixa e localizar qualquer movimento depois.",
  secoes: [
    {
      h2: "O que precisa ficar registrado em cada movimento",
      texto:
        "Um controle serve para responder perguntas depois que o carro já foi embora. Para isso, cada movimento precisa carregar:",
      lista: [
        "Placa do veículo e tipo (carro, moto, utilitário)",
        "Data e hora de entrada",
        "Data e hora de saída",
        "Valor cobrado e como foi calculado",
        "Forma de pagamento",
        "Qual operador registrou a entrada e qual registrou a saída",
        "Foto do veículo, quando há avaria a documentar",
      ],
    },
    {
      h2: "Por que caderno e planilha não sustentam o controle",
      itens: [
        {
          h3: "O caderno registra, mas não soma",
          texto:
            "Ele guarda a informação e devolve o trabalho: para saber o faturamento do dia é preciso folhear e somar à mão, e qualquer conferência depende de a letra estar legível. Um caderno molhado ou perdido leva o histórico junto.",
        },
        {
          h3: "A planilha soma, mas depende de digitação",
          texto:
            "Alguém precisa transcrever o movimento depois — normalmente no fim do turno, de memória. O que não foi digitado simplesmente não existe, e é exatamente aí que o carro não registrado desaparece.",
        },
        {
          h3: "Nenhum dos dois amarra o dinheiro a uma pessoa",
          texto:
            "Sem sessão de caixa com dono e horário, uma diferença no fim do dia não tem responsável nem explicação possível.",
        },
      ],
      link: {
        href: "/blog/planilha-de-controle-de-estacionamento",
        texto: "Comparação detalhada: planilha de controle de estacionamento",
      },
    },
    {
      h2: "Como o controle acontece no NuvemPark",
      itens: [
        {
          h3: "A placa entra pela câmera",
          texto:
            "O operador aponta o celular e a placa é lida na hora, sem digitação. Menos erro no registro significa menos movimento impossível de localizar depois.",
        },
        {
          h3: "O registro sobe sozinho, mesmo sem sinal",
          texto:
            "Se a internet cair, o aplicativo continua registrando e sincroniza quando a conexão volta. O controle não tem buraco de horário porque o Wi-Fi falhou.",
        },
        {
          h3: "Tudo fica pesquisável por placa",
          texto:
            "Histórico, movimentos e veículos removidos ficam no painel, com busca por placa e por período. Localizar uma estadia de três semanas atrás leva segundos.",
        },
      ],
    },
    {
      h2: "Controle de ocupação: quantas vagas estão livres agora",
      texto:
        "Além do dinheiro, o controle responde por espaço. O painel mostra a ocupação de cada pátio em tempo real — quantos veículos estão dentro e quanto resta da capacidade — o que muda a decisão de aceitar ou não mais um carro na hora do pico.",
    },
  ],
  faq: [
    {
      pergunta: "Como fazer o controle de entrada e saída de veículos?",
      resposta:
        "Registrando placa, horário de entrada, horário de saída, valor e operador responsável em cada movimento. No NuvemPark a placa é lida pela câmera do celular e o registro sobe para o painel do gestor automaticamente, mesmo que a internet caia no meio da operação.",
    },
    {
      pergunta: "Dá para controlar o estacionamento pelo celular?",
      resposta:
        "Sim. A operação inteira acontece num aplicativo Android — entrada, saída, cálculo da tarifa, pagamento e impressão do ticket. O gestor acompanha pelo painel web, que também abre no celular.",
    },
    {
      pergunta: "Consigo localizar um carro que saiu semanas atrás?",
      resposta:
        "Sim. O histórico fica no painel com busca por placa e por período, incluindo o valor cobrado e qual operador atendeu.",
    },
    {
      pergunta: "E se o operador registrar a entrada errada?",
      resposta:
        "A correção fica registrada como tal, com autor e horário. Movimentos cancelados e removidos têm tela própria no painel, justamente para que uma correção nunca seja confundida com um movimento que nunca existiu.",
    },
  ],
  migalhas: [
    { nome: "Início", caminho: "/" },
    { nome: "Sistema para estacionamento", caminho: "/sistema-para-estacionamento" },
  ],
  relacionados: [
    "/sistema-para-estacionamento",
    "/gestao-de-estacionamento",
    "/aplicativo-para-estacionamento",
  ],
  leituras: [
    {
      href: "/blog/planilha-de-controle-de-estacionamento",
      titulo: "Planilha de controle de estacionamento: quando ela deixa de servir",
    },
    {
      href: "/blog/lpr-leitura-automatica-de-placas-no-app",
      titulo: "LPR: leitura automática de placas no aplicativo",
    },
  ],
};

export const APLICATIVO: PaginaSolucao = {
  caminho: "/aplicativo-para-estacionamento",
  h1: "Aplicativo para estacionamento",
  titulo: "Aplicativo para Estacionamento: opera offline | NuvemPark",
  descricao:
    "Aplicativo Android para estacionamento: lê a placa pela câmera, calcula a tarifa, imprime o ticket por Bluetooth e funciona sem internet.",
  subtitulo:
    "O sistema inteiro cabe no celular que a sua equipe já tem no bolso.",
  resposta:
    "O aplicativo para estacionamento do NuvemPark é um app Android usado pelo operador dentro do pátio. Ele lê a placa pela câmera, calcula a tarifa na saída, recebe o pagamento, imprime o ticket numa impressora Bluetooth e continua funcionando quando não há internet.",
  secoes: [
    {
      h2: "O que o aplicativo faz dentro do pátio",
      lista: [
        "Lê a placa pela câmera, sem digitação",
        "Registra entrada por tipo de veículo",
        "Calcula a tarifa na saída, incluindo diária e pernoite",
        "Recebe pagamento em dinheiro, cartão ou Pix",
        "Imprime ticket com QR Code em impressora térmica Bluetooth",
        "Registra avaria com foto do veículo",
        "Abre, sangra e fecha o caixa do turno",
        "Funciona offline e sincroniza sozinho depois",
      ],
    },
    {
      h2: "Por que “funciona offline” é o requisito que mais importa",
      texto:
        "Pátio costuma ser subsolo, galpão ou terreno com sinal ruim — e a fila não espera a operadora voltar. Um aplicativo que só registra online transfere o problema para o operador, que volta a anotar no papel “só enquanto o sinal não volta”. Esse papel é exatamente o dinheiro que some depois.",
      itens: [
        {
          h3: "Registro local primeiro",
          texto:
            "Entrada, saída e pagamento são gravados no próprio aparelho no instante em que acontecem. A confirmação para o operador não depende da rede.",
        },
        {
          h3: "Sincronização sem clique",
          texto:
            "Quando a conexão volta, a fila de envio sobe sozinha para o painel. O operador não precisa lembrar de sincronizar nada — e o app mostra quantos registros ainda estão na fila.",
        },
      ],
    },
    {
      h2: "O que o operador precisa para começar",
      tabela: {
        cabecalho: ["Item", "Necessário?"],
        linhas: [
          ["Celular Android", "Sim — o que a equipe já tem serve"],
          ["Internet no pátio", "Não para operar; só para sincronizar"],
          ["Impressora térmica Bluetooth", "Opcional, para ticket impresso"],
          ["Cancela ou controlador", "Não"],
          ["Servidor ou computador no pátio", "Não"],
          ["Treinamento técnico", "Não — entra com o código do pátio"],
        ],
      },
    },
    {
      h2: "E o gestor, usa o mesmo aplicativo?",
      texto:
        "Não. O aplicativo é a ferramenta de quem está no pátio; o gestor usa o painel web, que abre em qualquer navegador, inclusive no celular. É essa separação que permite dar acesso à operação sem entregar o financeiro do negócio junto.",
      link: {
        href: "/gestao-de-estacionamento",
        texto: "Veja o que o gestor acompanha pelo painel",
      },
    },
  ],
  faq: [
    {
      pergunta: "O aplicativo funciona sem internet?",
      resposta:
        "Sim. Entradas, saídas e pagamentos são registrados offline e sincronizam sozinhos quando a conexão volta. O aplicativo mostra quantos registros ainda estão na fila de envio.",
    },
    {
      pergunta: "Funciona em iPhone?",
      resposta:
        "O aplicativo de operação é Android. O painel do gestor é web e abre normalmente no iPhone, no iPad ou em qualquer navegador.",
    },
    {
      pergunta: "Preciso comprar celular novo para a equipe?",
      resposta:
        "Não. O aplicativo foi feito para rodar no celular Android que a equipe já usa. O único item opcional é uma impressora térmica Bluetooth comum, se você quiser entregar ticket impresso.",
    },
    {
      pergunta: "Como o operador entra no aplicativo?",
      resposta:
        "Você cadastra o pátio e os operadores no painel, e cada um entra no aplicativo com o código do pátio. Não há instalação técnica nem configuração de rede.",
    },
    {
      pergunta: "Qual impressora funciona com o aplicativo?",
      resposta:
        "Impressoras térmicas Bluetooth comuns, do mesmo tipo usado em delivery. O ticket sai com QR Code e o nome do seu pátio.",
    },
  ],
  migalhas: [
    { nome: "Início", caminho: "/" },
    { nome: "Sistema para estacionamento", caminho: "/sistema-para-estacionamento" },
  ],
  relacionados: [
    "/sistema-para-estacionamento",
    "/controle-de-estacionamento",
    "/gestao-de-estacionamento",
  ],
  leituras: [
    {
      href: "/blog/lpr-leitura-automatica-de-placas-no-app",
      titulo: "LPR: leitura automática de placas no aplicativo",
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTRO
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Todas as páginas de solução, na ordem em que entram no sitemap.
 *
 * `CANCELA` mora em arquivo próprio: é a única página que fala de um produto
 * que NÃO vendemos, e o aviso no topo daquele arquivo precisa ser lido por quem
 * for editá-la. Aqui só entra na lista.
 *
 * As páginas de CIDADE ficam de fora desta lista de propósito — elas são filhas
 * do pilar (`/sistema-para-estacionamento/<cidade>`) e entram no sitemap e na
 * camada de agentes por `lib/cidades.ts`. Empilhar cinco cidades no rodapé
 * diluiria os links que importam.
 */
export const SOLUCOES: PaginaSolucao[] = [
  PILAR,
  GESTAO,
  CONTROLE,
  APLICATIVO,
  CANCELA,
];

const POR_CAMINHO = new Map(SOLUCOES.map((p) => [p.caminho, p]));

export function obterSolucao(caminho: string): PaginaSolucao | undefined {
  return POR_CAMINHO.get(caminho);
}

/**
 * Título curto de uma página, para montar cartão de "relacionados" sem
 * duplicar texto. Cai no H1 quando a página não é do silo.
 */
export function tituloCurto(caminho: string): string {
  return POR_CAMINHO.get(caminho)?.h1 ?? caminho;
}

/** Uma linha sobre a página — o texto do cartão de relacionados. */
export function resumoCurto(caminho: string): string {
  return POR_CAMINHO.get(caminho)?.subtitulo ?? "";
}
