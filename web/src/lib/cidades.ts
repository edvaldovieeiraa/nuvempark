import type { PaginaSolucao } from "@/lib/solucoes";

/**
 * PÁGINAS DE CIDADE — `/sistema-para-estacionamento/<cidade>`.
 *
 * ⚠️ POR QUE ESTE ARQUIVO NÃO É UM TEMPLATE COM O NOME DA CIDADE TROCADO
 *
 * Gerar N páginas a partir de um molde, mudando só o topônimo, é o padrão que o
 * Google chama de DOORWAY PAGE e trata como spam — a punição não é a página
 * ficar mal posicionada, é o site inteiro perder confiança. Por isso cada
 * cidade abaixo tem texto próprio, escrito sobre o contexto real de operar um
 * pátio ali: o que é diferente em São Paulo não é o que é diferente em Olinda.
 *
 * A parte comum entre elas é a do PRODUTO (que de fato é a mesma em todo lugar)
 * e vive nas seções finais. A parte de cima, que é o que o leitor lê e o que o
 * buscador compara, é distinta.
 *
 * ⚠️ O QUE NÃO PODE ENTRAR AQUI
 *
 * Nenhuma afirmação sobre clientes, número de pátios atendidos ou depoimento
 * por cidade enquanto não houver caso real e verificável para citar. Prova
 * social inventada é o jeito mais rápido de transformar uma página de busca num
 * problema jurídico. Quando houver um cliente que autorize ser citado, o lugar
 * dele é aqui — e aí estas páginas ficam muito mais fortes do que são hoje.
 */

/**
 * Cada cidade carrega duas formas: o nome puro ("Rio de Janeiro") e a locativa
 * já com a preposição correta ("no Rio de Janeiro"). Concatenar `em ${nome}`
 * daria "em Rio de Janeiro" — erro que denuncia página gerada por molde, que é
 * o oposto do que estas páginas precisam parecer.
 */
type Cidade = { nome: string; locativo: string };

/** Fecho comum: como começar. É produto, e produto é igual em toda cidade. */
function comoComecar({ locativo }: Cidade): PaginaSolucao["secoes"][number] {
  return {
    h2: `Como começar a operar ${locativo}`,
    texto:
      "Não há visita técnica, instalação nem prazo de projeto — o que também significa que não há diferença de prazo entre uma cidade e outra:",
    lista: [
      "Você cria a conta pelo site, em cerca de um minuto",
      "Cadastra o pátio e a tabela de preço no painel",
      "Sua equipe baixa o aplicativo e entra com o código do pátio",
      "O primeiro ticket sai no mesmo dia",
      "São 15 dias grátis, sem cartão de crédito",
    ],
    link: {
      href: "/sistema-para-estacionamento",
      texto: "Ver tudo o que o sistema faz",
    },
  };
}

/** FAQ que toda cidade repete, porque a resposta é a mesma e é a verdadeira. */
function faqComum({ nome, locativo }: Cidade): PaginaSolucao["faq"] {
  return [
    {
      pergunta: `Vocês atendem ${nome}?`,
      resposta: `Sim. O NuvemPark é um sistema na nuvem: não depende de visita técnica, instalação nem equipamento no local, então funciona ${locativo} exatamente como em qualquer outra cidade. Você mesmo cria a conta e começa a usar no mesmo dia.`,
    },
    {
      pergunta: "Precisa de técnico indo até o pátio?",
      resposta:
        "Não. Não há servidor para instalar, cabo para passar nem obra para fazer. A operação roda no celular Android que a equipe já tem e o painel do gestor abre em qualquer navegador.",
    },
    {
      pergunta: "Como funciona o suporte?",
      resposta:
        "Pelo WhatsApp, de segunda a sexta, das 8h às 18h, falando com quem entende do produto — sem robô e sem fila. Mensagens fora do horário são respondidas no próximo dia útil.",
    },
  ];
}

function migalhas(): PaginaSolucao["migalhas"] {
  return [
    { nome: "Início", caminho: "/" },
    { nome: "Sistema para estacionamento", caminho: "/sistema-para-estacionamento" },
  ];
}

const SP: Cidade = { nome: "São Paulo", locativo: "em São Paulo" };
const RJ: Cidade = { nome: "o Rio de Janeiro", locativo: "no Rio de Janeiro" };
const REC: Cidade = { nome: "Recife", locativo: "em Recife" };
const OLI: Cidade = { nome: "Olinda", locativo: "em Olinda" };
const JAB: Cidade = {
  nome: "Jaboatão dos Guararapes",
  locativo: "em Jaboatão dos Guararapes",
};

const RELACIONADOS = [
  "/sistema-para-estacionamento",
  "/gestao-de-estacionamento",
  "/controle-de-estacionamento",
];

/* ── São Paulo ─────────────────────────────────────────────────────────────
   Ângulo: escala. É o mercado onde uma rede de pátios é comum, e onde o
   problema deixa de ser "controlar um pátio" e vira "enxergar cinco". */

const SAO_PAULO: PaginaSolucao = {
  caminho: "/sistema-para-estacionamento/sao-paulo",
  h1: "Sistema para estacionamento em São Paulo",
  titulo: "Sistema para Estacionamento em São Paulo | NuvemPark",
  descricao:
    "Sistema para estacionamento em São Paulo: vários pátios num painel só, faturamento ao vivo e operação pelo celular. Sem instalação. 15 dias grátis.",
  subtitulo:
    "Quando são cinco pátios espalhados pela cidade, o problema deixa de ser controlar um — é enxergar todos ao mesmo tempo.",
  resposta:
    "Um sistema para estacionamento em São Paulo precisa dar conta de escala: rotatividade alta nas regiões comerciais, equipes que trocam de turno e, com frequência, mais de uma unidade sob a mesma gestão. O NuvemPark consolida todos os pátios num painel só, com faturamento em tempo real e caixa separado por operador.",
  secoes: [
    {
      h2: "O que pesa num pátio paulistano",
      texto:
        "São Paulo concentra os dois extremos: a garagem verticalizada de região comercial, com fila nos horários de pico, e o pátio de bairro que fecha o caixa no fim do turno. O que os dois têm em comum é o custo de cada minuto parado na entrada.",
      itens: [
        {
          h3: "Rotatividade alta castiga a digitação",
          texto:
            "Em pátio de região comercial a fila cresce enquanto o operador digita a placa. A leitura pela câmera resolve o gargalo onde ele realmente aparece — na entrada, não no relatório.",
        },
        {
          h3: "Subsolo é onde o sinal morre",
          texto:
            "Garagem em subsolo costuma não ter cobertura de celular. Um sistema que só registra online transfere o problema para o papel, e o papel é onde o dinheiro some. O aplicativo registra offline e sincroniza quando volta ao nível da rua.",
        },
        {
          h3: "Equipe grande exige caixa com dono",
          texto:
            "Com vários operadores por dia, uma diferença no fechamento sem nome e horário é impossível de apurar. Cada turno é uma sessão de caixa com responsável, sangria registrada e conferência contra o valor esperado.",
        },
      ],
    },
    {
      h2: "Vários pátios em São Paulo, uma conta só",
      texto:
        "Cada unidade tem sua tabela de preço, seus operadores e seu caixa — e todas aparecem consolidadas no mesmo painel. Abrir a sexta unidade não exige trocar de sistema, abrir outra conta nem renegociar contrato: a cobrança é por pátio ativo, R$ 129,90 por mês cada, e você adiciona ou remove quando quiser.",
      link: {
        href: "/gestao-de-estacionamento",
        texto: "Como a gestão de vários pátios funciona na prática",
      },
    },
    comoComecar(SP),
  ],
  faq: [
    {
      pergunta: "Dá para gerenciar vários estacionamentos em São Paulo na mesma conta?",
      resposta:
        "Sim, e é o caso mais comum. Cada pátio mantém suas próprias tarifas, operadores e caixa, e todos ficam consolidados num painel único. A cobrança é de R$ 129,90 por mês por pátio ativo.",
    },
    {
      pergunta: "Funciona em garagem de subsolo, sem sinal de celular?",
      resposta:
        "Sim. O aplicativo registra entradas, saídas e pagamentos offline e sincroniza sozinho quando a conexão volta — que é exatamente o cenário de garagem em subsolo.",
    },
    ...faqComum(SP),
  ],
  migalhas: migalhas(),
  relacionados: RELACIONADOS,
};

/* ── Rio de Janeiro ────────────────────────────────────────────────────────
   Ângulo: pico e sazonalidade. Verão, eventos e orla criam uma curva de
   movimento que a operação do dia comum não prepara. */

const RIO: PaginaSolucao = {
  caminho: "/sistema-para-estacionamento/rio-de-janeiro",
  h1: "Sistema para estacionamento no Rio de Janeiro",
  titulo: "Sistema para Estacionamento no Rio de Janeiro | NuvemPark",
  descricao:
    "Sistema para estacionamento no Rio: aguenta pico de evento e alta temporada, opera sem internet e mostra o faturamento ao vivo. 15 dias grátis.",
  subtitulo:
    "O pátio que dá conta de uma terça comum não é o mesmo que dá conta de um domingo de verão na orla.",
  resposta:
    "Um sistema para estacionamento no Rio de Janeiro é testado pelos picos: alta temporada, feriado prolongado, jogo e show enchem o pátio em poucas horas. O NuvemPark foi feito para esse momento — leitura de placa pela câmera para a fila não travar, operação offline e faturamento aparecendo ao vivo no painel.",
  secoes: [
    {
      h2: "O problema do Rio é a curva, não a média",
      texto:
        "Um pátio de orla ou de zona de eventos passa a maior parte do mês numa operação tranquila e concentra o resultado em poucos dias. É nesses dias que o controle costuma quebrar — e é justamente quando há mais dinheiro em jogo.",
      itens: [
        {
          h3: "Fila de pico não espera digitação",
          texto:
            "Quando chegam trinta carros em vinte minutos, o tempo de registrar cada entrada vira a capacidade real do pátio. A câmera lê a placa em um segundo e o operador não precisa escolher entre atender rápido e registrar direito.",
        },
        {
          h3: "Reforço de equipe sem perder o rastro",
          texto:
            "Dia de pico costuma trazer gente extra para ajudar. Cada um opera dentro da própria sessão de caixa, com dono e horário, então o fechamento continua apurável mesmo com quatro pessoas recebendo dinheiro no mesmo turno.",
        },
        {
          h3: "Rede congestionada é rede indisponível",
          texto:
            "Em aglomeração o sinal de celular cai na prática mesmo com antena por perto. O aplicativo não depende dele: registra local e sobe depois, sem o operador precisar fazer nada.",
        },
      ],
    },
    {
      h2: "Diária, pernoite e tolerância configurados de uma vez",
      texto:
        "Pátio de praia e de evento costuma trabalhar com regra diferente do rotativo comum — diária cheia, pernoite, tolerância maior na saída. Tudo isso é configurado uma vez na tabela de preço e aplicado sozinho na saída, inclusive nos dias em que o pátio está cheio e ninguém tem tempo de conferir conta.",
      link: {
        href: "/blog/como-montar-a-tabela-de-precos-do-estacionamento",
        texto: "Como montar a tabela de preços do estacionamento",
      },
    },
    comoComecar(RJ),
  ],
  faq: [
    {
      pergunta: "O sistema aguenta o movimento de um dia de evento?",
      resposta:
        "Sim. O registro é local no aparelho e não depende de resposta do servidor, então o tempo de atendimento não muda com o volume. Vários operadores podem trabalhar ao mesmo tempo, cada um na própria sessão de caixa.",
    },
    {
      pergunta: "Dá para cobrar diária em alta temporada e hora no resto do ano?",
      resposta:
        "Sim. Você configura tabelas de preço com fração, hora, teto de diária, tolerância e pernoite, e ajusta quando quiser pelo painel. A regra vigente é aplicada automaticamente no cálculo da saída.",
    },
    ...faqComum(RJ),
  ],
  migalhas: migalhas(),
  relacionados: RELACIONADOS,
};

/* ── Recife ────────────────────────────────────────────────────────────────
   Ângulo: origem. É o único lugar em que podemos dizer, com verdade, que a
   plataforma nasceu dentro de uma operação de pátio da região (ver
   PRODUCT.md e o WhatsApp 81 no rodapé do site). */

const RECIFE: PaginaSolucao = {
  caminho: "/sistema-para-estacionamento/recife",
  h1: "Sistema para estacionamento em Recife",
  titulo: "Sistema para Estacionamento em Recife | NuvemPark",
  descricao:
    "Sistema para estacionamento em Recife feito por quem opera pátio na região: celular no lugar do caderno, funciona sem internet e mostra o caixa ao vivo.",
  subtitulo:
    "O NuvemPark não foi desenhado numa reunião sobre estacionamentos. Nasceu dentro de uma operação de pátio aqui na região.",
  resposta:
    "O NuvemPark é um sistema para estacionamento criado em Pernambuco, dentro de uma operação real de pátios, e hoje disponível para qualquer estacionamento de Recife. A equipe registra entradas e saídas por um aplicativo Android que funciona sem internet, e o gestor acompanha o faturamento ao vivo pelo navegador.",
  secoes: [
    {
      h2: "Feito por quem opera pátio, não por quem visitou um",
      texto:
        "A plataforma existe porque precisávamos dela: as telas foram desenhadas para o ritmo de um pátio cheio, com a linguagem de quem trabalha nele. Quando o operador precisa de treinamento longo para registrar uma entrada, o erro é do produto — essa é uma regra de projeto, não um slogan.",
      itens: [
        {
          h3: "Suporte no mesmo fuso e na mesma língua",
          texto:
            "O atendimento é por WhatsApp, de segunda a sexta das 8h às 18h, com quem conhece o produto. Sem robô, sem fila e sem a diferença de horário que faz uma dúvida da manhã ser respondida no fim da tarde.",
        },
        {
          h3: "Chuva forte e sinal fraco entram na conta",
          texto:
            "Instabilidade de rede não é hipótese aqui. O aplicativo registra tudo localmente e sincroniza quando a conexão volta, então a fila continua andando com o pátio alagando lá fora.",
        },
      ],
    },
    {
      h2: "Do Centro a Boa Viagem, o mesmo sistema",
      texto:
        "Pátio de rua no Centro, garagem de prédio comercial em Boa Viagem ou terreno no Recife Antigo operam com realidades diferentes de tarifa e de público, mas com o mesmo problema de fundo: saber quanto entrou e quanto disso chegou ao dono. Cada pátio tem sua tabela, seus operadores e seu caixa, e todos aparecem consolidados no mesmo painel.",
      link: {
        href: "/gestao-de-estacionamento",
        texto: "O que o painel do gestor mostra",
      },
    },
    comoComecar(REC),
  ],
  faq: [
    {
      pergunta: "O NuvemPark é uma empresa de Pernambuco?",
      resposta:
        "Sim. A plataforma nasceu dentro de uma operação real de pátios na região e o atendimento é feito daqui, por WhatsApp, de segunda a sexta das 8h às 18h.",
    },
    {
      pergunta: "Serve para um pátio pequeno, de uma vaga só de rua?",
      resposta:
        "Serve. O preço é o mesmo por pátio, independentemente do tamanho, e não há custo de equipamento nem de instalação — o que costuma inviabilizar sistema tradicional em pátio pequeno é justamente a entrada, não a mensalidade.",
    },
    ...faqComum(REC),
  ],
  migalhas: migalhas(),
  relacionados: RELACIONADOS,
};

/* ── Olinda ────────────────────────────────────────────────────────────────
   Ângulo: pátio pequeno, histórico e sazonal. É a cidade onde a obra é
   literalmente proibida em boa parte do território, e onde o carnaval cria
   pátios que existem por uma semana. */

const OLINDA: PaginaSolucao = {
  caminho: "/sistema-para-estacionamento/olinda",
  h1: "Sistema para estacionamento em Olinda",
  titulo: "Sistema para Estacionamento em Olinda | NuvemPark",
  descricao:
    "Sistema para estacionamento em Olinda sem obra e sem equipamento: roda no celular, serve pátio de temporada e mostra o faturamento ao vivo.",
  subtitulo:
    "No sítio histórico não se faz obra — e num pátio que existe por uma semana de carnaval, nenhuma instalação se paga.",
  resposta:
    "Em Olinda, um sistema para estacionamento precisa funcionar sem obra e sem equipamento fixo: boa parte da cidade é sítio histórico e uma fatia relevante do movimento é sazonal. O NuvemPark roda inteiramente no celular Android do operador, o que permite montar e desmontar a operação de um pátio sem instalar nada.",
  secoes: [
    {
      h2: "Onde não se pode furar o chão, o sistema tem que caber no bolso",
      texto:
        "Cancela, laço indutivo e cabeamento pressupõem uma obra que grande parte dos imóveis de Olinda não comporta — por restrição do sítio histórico, por rua estreita ou simplesmente porque o terreno é alugado. Sem hardware no local, essas restrições deixam de ser um problema.",
      lista: [
        "Nada é fixado no piso, na parede ou no muro",
        "Não há ponto de energia a puxar nem cabo a passar",
        "Mudou de terreno? A operação vai junto, no mesmo celular",
        "Terreno alugado por temporada não vira investimento perdido",
      ],
    },
    {
      h2: "Pátio de carnaval: monta, opera, desmonta",
      texto:
        "Uma parte importante do faturamento de estacionamento em Olinda acontece em poucos dias, em pátios que abrem só para a temporada, com equipe contratada para a ocasião. É o cenário mais hostil para o controle: gente nova, movimento altíssimo e nenhum tempo para treinar ninguém.",
      itens: [
        {
          h3: "Operador entra com o código do pátio",
          texto:
            "Sem cadastro complicado e sem instalação técnica. Quem vai ajudar na temporada baixa o aplicativo, entra com o código e começa a registrar — e sai da conta quando a temporada acaba.",
        },
        {
          h3: "Cada pessoa com seu caixa",
          texto:
            "Com equipe temporária, caixa sem dono é prejuízo garantido. Cada operador trabalha na própria sessão, com sangria registrada e fechamento conferido contra o valor esperado.",
        },
        {
          h3: "Multidão derruba a rede, não a operação",
          texto:
            "Em dia de prévia ou de carnaval o sinal de celular fica indisponível na prática. O aplicativo registra offline e sincroniza depois — a fila não para porque a antena está congestionada.",
        },
      ],
    },
    comoComecar(OLI),
  ],
  faq: [
    {
      pergunta: "Dá para usar num pátio que só abre no carnaval?",
      resposta:
        "Dá, e é um bom uso: não há instalação nem equipamento, então montar e desmontar a operação não custa nada além da mensalidade dos meses em que o pátio está ativo. Você adiciona e remove pátios pelo painel quando quiser.",
    },
    {
      pergunta: "Preciso instalar alguma coisa no terreno?",
      resposta:
        "Não. Nada é fixado, cabeado ou alimentado por energia no local. A operação acontece no celular Android do operador — o que resolve as restrições de obra do sítio histórico e o caso do terreno alugado.",
    },
    ...faqComum(OLI),
  ],
  migalhas: migalhas(),
  relacionados: RELACIONADOS,
};

/* ── Jaboatão dos Guararapes ───────────────────────────────────────────────
   Ângulo: pátio de bairro, operação enxuta, dono que também opera. */

const JABOATAO: PaginaSolucao = {
  caminho: "/sistema-para-estacionamento/jaboatao-dos-guararapes",
  h1: "Sistema para estacionamento em Jaboatão dos Guararapes",
  titulo: "Sistema para Estacionamento em Jaboatão | NuvemPark",
  descricao:
    "Sistema para estacionamento em Jaboatão dos Guararapes: troque o caderno pelo celular, veja o caixa de longe e pague R$ 129,90 por mês, por pátio.",
  subtitulo:
    "Para quem não fica no pátio o dia inteiro, o problema não é o movimento — é depender da palavra de quem ficou.",
  resposta:
    "Em Jaboatão dos Guararapes o pátio típico é de bairro: equipe pequena, um ou dois operadores por turno e um dono que não consegue estar lá o tempo todo. O NuvemPark resolve exatamente esse ponto — cada carro é registrado no celular do operador e o faturamento aparece ao vivo no painel, de onde você estiver.",
  secoes: [
    {
      h2: "O pátio de bairro tem um problema específico",
      texto:
        "Não é falta de movimento, é falta de visibilidade. Quem toca um pátio em Piedade, Candeias ou no centro de Jaboatão raramente tem uma segunda pessoa de confiança para conferir o caixa — e conferir sozinho, todo dia, no fim do turno, é o que ninguém sustenta por muito tempo.",
      itens: [
        {
          h3: "O caderno não soma",
          texto:
            "Ele guarda a informação e devolve o trabalho: para saber o faturamento do dia é preciso folhear e somar à mão. E um caderno molhado ou perdido leva o histórico junto.",
        },
        {
          h3: "A conferência vira discussão",
          texto:
            "Sem registro por veículo, uma diferença no fim do dia não tem como ser apurada — sobra desconfiança dos dois lados. Com caixa por sessão, a diferença aparece com nome e horário, e deixa de ser uma questão de palavra.",
        },
        {
          h3: "Você acompanha sem estar lá",
          texto:
            "O painel abre no navegador do seu próprio celular. Faturamento do dia, quantos carros estão no pátio e os últimos movimentos, em tempo real, de qualquer lugar.",
        },
      ],
    },
    {
      h2: "Um carro por dia paga o sistema",
      texto:
        "São R$ 129,90 por mês, por pátio, com tudo incluso — sem taxa de instalação, sem cobrança por operador e sem fidelidade. Não há investimento em equipamento: o aplicativo roda no celular Android que a equipe já tem. Para um pátio de bairro, é a diferença entre um sistema caber no orçamento e não caber.",
      link: {
        href: "/blog/quanto-fatura-um-estacionamento",
        texto: "Quanto fatura um estacionamento",
      },
    },
    comoComecar(JAB),
  ],
  faq: [
    {
      pergunta: "Compensa para um pátio pequeno, com um operador só?",
      resposta:
        "Compensa quando o dono não está no pátio o tempo todo — que é o caso mais comum. O custo é R$ 129,90 por mês, por pátio, sem equipamento e sem instalação, e o retorno vem de deixar de depender da conferência manual no fim do turno.",
    },
    {
      pergunta: "Consigo ver o caixa sem ir até o estacionamento?",
      resposta:
        "Sim. O painel do gestor abre em qualquer navegador, inclusive no celular, e mostra faturamento, ocupação e os últimos movimentos em tempo real.",
    },
    ...faqComum(JAB),
  ],
  migalhas: migalhas(),
  relacionados: RELACIONADOS,
};

/**
 * As cidades publicadas. Acrescentar uma exige ESCREVER a página — não copiar
 * a de cima trocando o nome. Ver o aviso no topo do arquivo.
 */
export const CIDADES: PaginaSolucao[] = [
  SAO_PAULO,
  RIO,
  RECIFE,
  OLINDA,
  JABOATAO,
];

/** Só o último segmento da URL — é o que a rota dinâmica recebe. */
export function slugDaCidade(pagina: PaginaSolucao): string {
  return pagina.caminho.split("/").pop() as string;
}

const POR_SLUG = new Map(CIDADES.map((c) => [slugDaCidade(c), c]));

export function obterCidade(slug: string): PaginaSolucao | undefined {
  return POR_SLUG.get(slug);
}
