import type { PaginaSolucao } from "@/lib/solucoes";

/**
 * "Sistema de estacionamento para hotel" — a página do hotel e da pousada que
 * operam o PRÓPRIO estacionamento.
 *
 * Não confundir com o convênio da `/validacao-de-estacionamento`, em que o
 * hotel valida o ticket de um estacionamento vizinho. Aqui o recurso é a
 * ESTADIA DE HÓSPEDE (db/42): diárias pagas na chegada, entra e sai sem
 * cobrança até vencer, atraso calculado na saída. As duas páginas se citam
 * para o leitor achar a certa.
 *
 * Slug com "sistema-de": "estacionamento de/para hotel" sozinho tende a ser
 * busca de hóspede procurando onde parar, não de gestor procurando software.
 *
 * ⚠️ O QUE ESTÁ ESCRITO AQUI ESPELHA O APP E O PAINEL — confira antes de mexer:
 *
 * - Regras de dinheiro e tempo (atraso por bloco = menor entre avulsa e diária,
 *   tolerância, de onde a renovação conta):
 *   `app/lib/features/estadias/domain/estadia_engine.dart`
 * - 1 a 30 diárias por operação: `estadias/presentation/estadia_widgets.dart`
 * - Check-in depois da entrada (conta desde a entrada do carro):
 *   `estadias/presentation/converter_estadia_sheet.dart`
 * - Tabela "Diária de hóspede" (valor, duração, tabela do atraso) no painel:
 *   `components/tarifas/campos-hospede.tsx`
 * - Linha "Estadias de hóspede" na prestação de contas:
 *   `components/prestacao/prestacao-client.tsx`
 * - Os casos da tabela de atraso são os do teste:
 *   `app/test/features/estadias/estadia_engine_test.dart`
 * - Escopo e fora de escopo da v1: `.planning/specs/estadia-hospede.md` (pasta
 *   local, fora do git)
 *
 * O que NÃO pode ser escrito enquanto não for verdade: nome do hóspede ou nº do
 * quarto, integração com sistema de reservas (PMS), vencimento em horário fixo
 * de check-out, cancelamento com estorno, Pix na contratação, estadia listada
 * ou renovada pelo painel, tempo de contratação em segundos (é meta da spec,
 * não medição), qualquer hotel cliente citado (SEO.md 4.4).
 */
export const HOTEL: PaginaSolucao = {
  caminho: "/sistema-de-estacionamento-para-hotel",
  h1: "Sistema de estacionamento para hotel e pousada",
  titulo: "Sistema de Estacionamento para Hotel e Pousada | NuvemPark",
  descricao:
    "O hóspede paga as diárias do estacionamento na chegada, entra e sai à vontade até vencer, e o atraso sai calculado. Pelo celular, sem cancela e sem obra.",
  subtitulo:
    "Estacionamento de hotel não cobra permanência: cobra diária. O sistema precisa entender essa diferença.",
  resposta:
    "Um sistema de estacionamento para hotel cobra o hóspede por diária, e não pelo tempo de cada saída. No NuvemPark, o operador contrata as diárias no aplicativo e recebe na chegada; o carro entra e sai sem cobrança até o vencimento, contado da contratação e não do check-out, e o atraso sai calculado.",
  secoes: [
    {
      h2: "O problema do estacionamento de hotel",
      texto:
        "O hotel cobra o estacionamento por diária, mas o sistema comum de estacionamento só entende permanência: cobra cada saída pelo tempo que o carro ficou. Sem um jeito de registrar a diária, o operador fica entre saídas ruins:",
      itens: [
        {
          h3: "Cobrar o hóspede a cada saída",
          texto:
            "O hóspede que sai para jantar e volta paga de novo, e a reclamação vai parar na recepção. Para evitar a discussão, o operador acaba liberando no olho.",
        },
        {
          h3: "Liberar na mão, sem registro",
          texto:
            "O carro entra e sai porque “é hóspede”, e ninguém sabe dizer quantas diárias foram pagas, a quem e em qual forma de pagamento. O dinheiro do estacionamento não aparece no caixa nem nos relatórios.",
        },
        {
          h3: "Esquecer o atraso",
          texto:
            "O hóspede pagou duas diárias e ficou três. Sem um vencimento registrado, a diária a mais só é cobrada se alguém lembrar dela na hora da saída.",
        },
      ],
    },
    {
      h2: "Um hóspede, do check-in ao check-out",
      texto:
        "Exemplo com uma tabela de R$ 30 por diária de 24 horas. O valor e a duração da diária são os que o seu hotel configurar:",
      itens: [
        {
          h3: "Na chegada: 3 diárias, R$ 90",
          texto:
            "O operador lê a placa pela câmera, escolhe a tabela de hóspede e marca 3 diárias. O app mostra o total e até quando a estadia vale e registra a forma de pagamento. Com impressora, sai um cupom só, com o QR Code da entrada e a validade da estadia.",
        },
        {
          h3: "Durante a estadia: entra e sai sem cobrança",
          texto:
            "Cada vez que o carro volta, o app reconhece a placa e registra a entrada sem cobrança. Na saída, o valor é zero. Com internet, os outros celulares do pátio recebem a estadia em segundos — o hóspede é reconhecido por qualquer operador.",
        },
        {
          h3: "Vai ficar mais um dia: renova",
          texto:
            "O hóspede avisou na recepção que vai estender. O operador abre a ficha da estadia, com o carro dentro ou fora do pátio, e soma as diárias. Se a estadia ainda vale, as novas diárias contam do vencimento atual: nenhuma hora paga se perde.",
        },
        {
          h3: "Saiu depois do vencimento: atraso calculado",
          texto:
            "Na saída, o app mostra há quanto tempo a estadia venceu e o valor do atraso. O operador escolhe entre cobrar o atraso ou renovar, e todo pagamento passa por um resumo de confirmação antes de ser registrado.",
        },
      ],
    },
    {
      h2: "Como o atraso é cobrado",
      texto:
        "O atraso é o tempo entre o vencimento e a saída. Ele é dividido em períodos do tamanho da diária, e cada período custa o menor valor entre a tabela avulsa escolhida para o atraso e uma diária de hóspede. No exemplo, diária de R$ 30 por 24 horas e tabela avulsa de R$ 10 na primeira hora, R$ 5 por hora adicional e 10 minutos de tolerância:",
      tabela: {
        cabecalho: ["Atraso", "Como é calculado", "O que o hóspede paga"],
        linhas: [
          ["8 minutos", "Dentro da tolerância de 10 minutos", "R$ 0"],
          ["2 horas", "Tabela avulsa: R$ 15, menos que uma diária", "R$ 15"],
          ["9 horas", "A tabela avulsa daria R$ 50; vale a diária", "R$ 30"],
          [
            "30 horas",
            "Primeiras 24 h: uma diária. Últimas 6 h: a avulsa daria R$ 35; vale outra diária",
            "R$ 60",
          ],
        ],
      },
      textoFinal:
        "Quem se atrasa duas horas paga duas horas, não uma diária inteira; quem fica um dia a mais paga a diária, não a tabela avulsa do dia todo. A tolerância da tabela avulsa também vale: atraso dentro dela sai sem cobrança.",
    },
    {
      h2: "Como o hotel configura",
      texto: "A diária de hóspede é uma tabela de preço, criada no painel como as outras:",
      lista: [
        "Em Tarifas, crie uma tabela com a forma de cobrança “Diária de hóspede”",
        "Defina o valor e a duração da diária em horas — 24, ou a que o seu hotel usar",
        "Escolha a tabela avulsa que calcula o atraso",
        "A tabela é por tipo de veículo: crie uma para cada tipo cadastrado no pátio que receba hóspede",
        "No aplicativo, ela aparece para o operador na tela de entrada, ao lado das tabelas avulsas",
      ],
      textoFinal:
        "Hóspede, cliente avulso e mensalista convivem no mesmo pátio: quem não tem estadia continua pagando pela tabela de sempre, e o mensalista em dia mantém a livre passagem.",
    },
    {
      h2: "O que entra no caixa e nos relatórios",
      texto:
        "Toda contratação e toda renovação entram no caixa do turno do operador, com a forma de pagamento — por isso o app exige caixa aberto para cobrar a estadia. Na prestação de contas do painel, as estadias têm linha própria, “Estadias de hóspede”, separada do rotativo. O atraso entra como a cobrança de uma saída comum.",
      link: {
        href: "/gestao-de-estacionamento",
        texto: "Veja o que o gestor acompanha pelo painel",
      },
    },
    {
      h2: "O que a estadia de hóspede não faz hoje",
      texto: "Para o hotel decidir com a informação certa:",
      lista: [
        "Não guarda nome do hóspede nem número do quarto: a estadia é ligada à placa do veículo",
        "Não se integra ao sistema de reservas do hotel",
        "Não vence num horário fixo de check-out, como meio-dia: conta a partir da contratação",
        "Não tem cancelamento com estorno",
        "Não gera Pix na hora da contratação: o operador registra a forma de pagamento recebida",
        "Lista e renovação de estadias ficam no aplicativo; o painel mostra a receita",
      ],
    },
    {
      h2: "Estacionamento próprio ou estacionamento parceiro?",
      texto:
        "Esta página é para o hotel ou a pousada que opera o próprio estacionamento, com alguém na entrada. Se o seu hotel manda o hóspede para um estacionamento vizinho, o caminho é outro: o hotel valida o ticket do hóspede e o estacionamento libera as horas combinadas no convênio.",
      link: {
        href: "/validacao-de-estacionamento",
        texto: "Como funciona a validação para hotel parceiro",
      },
    },
  ],
  faq: [
    {
      pergunta: "A diária do estacionamento acompanha o check-out do hotel?",
      resposta:
        "Não. A diária conta a partir do momento em que a estadia é contratada no aplicativo — ou da entrada do carro, quando o hóspede faz o check-in depois de estacionar. Com diária de 24 horas, quem contrata às 15h tem até as 15h do dia do vencimento. Vencimento num horário fixo, como meio-dia, não existe hoje.",
    },
    {
      pergunta: "O carro entrou antes do check-in. Dá para contratar a estadia depois?",
      resposta:
        "Sim. Na ficha do veículo, o operador toca em Contratar estadia. A estadia conta desde a entrada do carro, e o tempo que ele já estava no pátio passa a fazer parte da diária, sem cobrança avulsa.",
    },
    {
      pergunta: "Dá para registrar o nome do hóspede ou o número do quarto?",
      resposta:
        "Não. Hoje a estadia é ligada à placa do veículo, e não há integração com o sistema de reservas do hotel.",
    },
    {
      pergunta: "Funciona sem internet?",
      resposta:
        "Sim. Contratação, renovação e reconhecimento do hóspede usam a cópia que fica no celular, e tudo sobe para o painel quando a conexão volta. Com o aparelho sem internet, uma estadia contratada nele só aparece nos outros celulares do pátio depois que ele sincronizar.",
    },
    {
      pergunta: "Dá para cancelar uma estadia e devolver o dinheiro?",
      resposta:
        "Hoje não: a estadia não tem cancelamento com estorno. Por isso a contratação, a renovação e a cobrança do atraso passam por um resumo de confirmação antes de serem registradas.",
    },
    {
      pergunta: "Preciso de cancela ou de algum equipamento?",
      resposta:
        "Não. O sistema roda no celular Android que o operador já usa e no navegador do gestor. A impressora térmica Bluetooth é opcional, para entregar o cupom impresso.",
    },
    {
      pergunta: "Quanto custa a diária de hóspede?",
      resposta:
        "Não é cobrada à parte: está incluída nos R$ 79,90 por mês, por pátio, como todo recurso do sistema. Para comparar, com uma diária de estacionamento de R$ 30, um hóspede de três noites já paga o mês. O teste são 15 dias completos, sem cartão de crédito.",
    },
  ],
  migalhas: [
    { nome: "Início", caminho: "/" },
    { nome: "Sistema para estacionamento", caminho: "/sistema-para-estacionamento" },
  ],
  relacionados: [
    "/sistema-para-estacionamento",
    "/validacao-de-estacionamento",
    "/aplicativo-para-estacionamento",
  ],
};
