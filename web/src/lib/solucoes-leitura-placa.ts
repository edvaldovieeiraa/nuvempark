import type { PaginaSolucao } from "@/lib/solucoes";

/**
 * "Leitura de placa para estacionamento" / "LPR para estacionamento".
 *
 * Mesmo problema da página de cancela: no mercado, "LPR" quase sempre quer
 * dizer CÂMERA FIXA — poste ou pórtico na faixa, lendo o carro sem operador,
 * normalmente ligada à cancela. O NuvemPark não faz isso. Ele lê a placa pela
 * câmera do celular do operador, e a leitura é uma SUGESTÃO que o operador
 * confirma. A página responde ao termo dizendo isso logo na resposta direta,
 * em vez de deixar o comprador descobrir depois.
 *
 * ⚠️ O QUE ESTÁ ESCRITO AQUI ESPELHA O APP — confira antes de mexer:
 *
 * - Leitura on-device (ML Kit), funciona offline:
 *   `app/lib/features/tickets/data/placa_ocr_service.dart`
 * - Mercosul + antiga, no máximo 1 caractere corrigido, só pela posição:
 *   mesmo arquivo (`_maxCorrecoes`, máscaras).
 * - Moldura-guia, leitura ao vivo, trava ao repetir, "Confirmar"/"Corrigir"
 *   sem disparo automático: `presentation/camera_placa_screen.dart`.
 * - Saída pela placa (câmera → ticket aberto daquela placa):
 *   `app/lib/features/home/presentation/home_screen.dart` (`_saidaPorFoto`).
 * - Mensalista reconhecido pela placa na entrada, contra o cache local:
 *   `ticket_repository.dart` (`reconhecerPlaca`) e `reconhecimento_cliente.dart`.
 *
 * O que NÃO pode ser escrito enquanto não for verdade: taxa de acerto em
 * porcentagem, leitura sem operador, integração com câmera fixa ou cancela,
 * app de iPhone. A placa de moto (caracteres em duas linhas) não casa com a
 * análise por linha do OCR — por isso o FAQ avisa que ela pode exigir
 * digitação.
 */
export const LEITURA_PLACA: PaginaSolucao = {
  caminho: "/leitura-de-placa-para-estacionamento",
  h1: "Leitura de placa para estacionamento",
  titulo: "Leitura de Placa (LPR) para Estacionamento | NuvemPark",
  descricao:
    "Leitura de placa (LPR) pela câmera do celular do operador: sem câmera fixa e sem obra, funciona sem internet e cada leitura é confirmada antes do registro.",
  subtitulo:
    "A placa entra pela câmera do celular que o operador já segura — sem poste, sem câmera fixa e sem digitar sete caracteres com a fila andando.",
  resposta:
    "Leitura de placa para estacionamento (LPR) é o reconhecimento automático dos caracteres da placa a partir da imagem do veículo. No NuvemPark, quem lê é a câmera do celular Android do operador, no próprio aparelho e sem internet; a leitura é uma sugestão que o operador confirma antes de registrar. Não depende de câmera fixa.",
  secoes: [
    {
      h2: "Como funciona a leitura de placa no NuvemPark",
      texto:
        "A leitura acontece dentro do aplicativo que o operador já usa para registrar a entrada. São quatro momentos, e só o último exige decisão:",
      itens: [
        {
          h3: "O operador aponta a câmera e o app lê ao vivo",
          texto:
            "Uma moldura na tela marca onde a placa deve ficar. Com vários carros no enquadramento — fila na entrada, pátio cheio —, só conta a placa que está dentro dela, e não a mais nítida da cena. Enquanto lê, o app mostra o que está reconhecendo, para o operador se aproximar se estiver saindo errado.",
        },
        {
          h3: "A placa trava quando a leitura se repete",
          texto:
            "Uma leitura isolada pode oscilar de um quadro para o outro. O app só dá a placa como estável quando a mesma sequência se repete em leituras seguidas; aí ela fica verde e a leitura pausa, para o valor não mudar enquanto o operador decide.",
        },
        {
          h3: "O operador confirma ou corrige",
          texto:
            "Confirmar leva a placa para o registro. Corrigir descarta a leitura e volta a ler. Nada é registrado sem o toque do operador — e a placa continua editável no formulário de entrada.",
        },
        {
          h3: "Se a leitura ao vivo não fechar, vale a foto",
          texto:
            "O operador fotografa e o app tenta ler a placa na foto. Se ainda assim não reconhecer, ele digita. A fila não para porque o reconhecimento falhou numa placa difícil.",
        },
      ],
    },
    {
      h2: "Leitura de placa pelo celular ou por câmera fixa",
      texto:
        "São dois jeitos diferentes de resolver o mesmo trecho — e servem a pátios diferentes:",
      tabela: {
        cabecalho: ["", "Câmera fixa de LPR", "NuvemPark"],
        linhas: [
          [
            "Equipamento",
            "Câmera dedicada em poste ou pórtico, em geral ligada a uma cancela",
            "O celular Android que a equipe já usa",
          ],
          [
            "Instalação",
            "Projeto por faixa: suporte, cabeamento e energia",
            "Nenhuma: instala o app e entra com o código do pátio",
          ],
          [
            "Quem dispara a leitura",
            "O veículo, ao parar na faixa",
            "O operador, ao apontar a câmera",
          ],
          [
            "Operador na entrada",
            "Dispensável quando integrada à cancela",
            "Necessário — é quem confirma a leitura",
          ],
          [
            "Sem internet",
            "Depende do sistema contratado",
            "Continua lendo e registrando; sincroniza depois",
          ],
          [
            "Custo",
            "Equipamento e instalação à parte",
            "Incluído nos R$ 79,90 por mês, por pátio",
          ],
        ],
      },
      textoFinal:
        "A câmera fixa se paga onde o objetivo é tirar o operador da faixa: garagem de alto fluxo com cancela automática. Se esse é o seu caso, o NuvemPark não substitui esse equipamento. Para o pátio que já tem alguém na entrada, a câmera fixa duplica uma função que o celular na mão dele já cumpre.",
      link: {
        href: "/cancela-para-estacionamento",
        texto: "O que a cancela resolve — e o que ela não resolve",
      },
    },
    {
      h2: "Por que a leitura é uma sugestão, e não uma decisão",
      texto:
        "Placa suja de estrada, sol batendo de frente, adesivo sobre os caracteres: nenhum reconhecimento automático acerta todas. Por isso a leitura do NuvemPark foi feita para errar pouco e avisar quando não sabe, em vez de chutar:",
      lista: [
        "Lê os dois formatos de placa brasileira: Mercosul (ABC1D23) e o antigo (ABC-1234)",
        "Corrige no máximo um caractere trocado pelo reconhecimento — O por 0, I por 1 — e só quando a posição na placa exige",
        "Prefere não sugerir nada a sugerir uma placa errada; nesse caso, o operador digita",
        "Com mais de uma placa na imagem, considera apenas a que está dentro da moldura",
      ],
      textoFinal:
        "Na prática, o operador deixa de digitar as placas limpas da hora de pico e passa a revisar. Os casos difíceis continuam com ele, que é quem está vendo o carro.",
    },
    {
      h2: "O que a placa lida resolve na entrada e na saída",
      itens: [
        {
          h3: "Mensalista reconhecido na entrada",
          texto:
            "Com a placa completa, o app confere a lista de clientes de livre passagem do pátio, guardada no próprio aparelho, e avisa na hora: livre passagem, plano vencido, cliente bloqueado ou limite de vagas atingido. Nos três últimos casos, a entrada é cobrada como avulsa.",
        },
        {
          h3: "Saída pela placa",
          texto:
            "Na saída, o operador aponta a câmera de novo e o app abre o ticket daquele veículo, com a permanência e o valor calculados. Se não houver veículo aberto com aquela placa, o app avisa. O QR Code do ticket e a digitação continuam como alternativa.",
        },
        {
          h3: "Foto da entrada guardada",
          texto:
            "Quando a placa entra pela câmera, a foto fica salva junto do movimento e aparece no painel do gestor — registro de como e quando o veículo entrou.",
        },
      ],
      link: {
        href: "/controle-de-estacionamento",
        texto: "Como cada placa vira controle de entrada e saída",
      },
    },
    {
      h2: "Sem internet, a leitura continua",
      texto:
        "O reconhecimento roda no próprio celular: nenhuma imagem precisa ir a um servidor para a placa ser lida. Com a internet fora do ar, a placa é lida, a entrada registrada e o ticket impresso normalmente; quando a conexão volta, os movimentos sobem sozinhos para o painel. Em subsolo, galpão ou terreno com sinal ruim, é isso que impede o operador de voltar ao papel “só enquanto o sinal não volta”.",
      link: {
        href: "/aplicativo-para-estacionamento",
        texto: "Tudo o que o aplicativo faz dentro do pátio",
      },
    },
  ],
  faq: [
    {
      pergunta: "Preciso comprar câmera para ter leitura de placa?",
      resposta:
        "Não. A leitura é feita pela câmera do celular Android que o operador já usa. Não há câmera fixa, cancela, servidor nem computador no pátio. O único equipamento opcional do sistema é uma impressora térmica Bluetooth, para quem quer entregar ticket impresso.",
    },
    {
      pergunta: "Preciso de internet no pátio para a leitura funcionar?",
      resposta:
        "Não. O reconhecimento acontece no próprio aparelho, então a placa é lida e a entrada registrada mesmo sem conexão. A internet só serve para os movimentos subirem para o painel, o que acontece sozinho quando ela volta.",
    },
    {
      pergunta: "Lê placa Mercosul e placa antiga?",
      resposta:
        "Sim, os dois formatos de sete caracteres: Mercosul (ABC1D23) e o antigo (ABC-1234). Placa de moto, com os caracteres em duas linhas, pode não ser reconhecida — nesse caso o operador digita a placa.",
    },
    {
      pergunta: "O operador precisa conferir cada placa lida?",
      resposta:
        "Sim, e é de propósito. A leitura aparece na tela como sugestão: o operador confirma ou toca em Corrigir para ler de novo, e a placa continua editável no formulário antes do registro. Quando o reconhecimento não tem segurança, ele não sugere nada e o operador digita.",
    },
    {
      pergunta: "A leitura de placa abre a cancela sozinha?",
      resposta:
        "Não. A leitura do NuvemPark é feita pelo operador com o celular e não comanda equipamento. Onde a cancela ou a controladora oferece uma interface, a integração é avaliada caso a caso; hoje, o operador registra a entrada no app e libera a passagem como já faz.",
    },
    {
      pergunta: "Quanto custa a leitura de placa?",
      resposta:
        "Não é cobrada à parte. Está incluída nos R$ 79,90 por mês, por pátio, como todo recurso do sistema. O teste são 15 dias completos, sem cartão de crédito.",
    },
    {
      pergunta: "Funciona em iPhone?",
      resposta:
        "O aplicativo de operação, onde a leitura acontece, é Android. O painel do gestor é web e abre normalmente no iPhone ou em qualquer navegador.",
    },
  ],
  migalhas: [
    { nome: "Início", caminho: "/" },
    { nome: "Sistema para estacionamento", caminho: "/sistema-para-estacionamento" },
  ],
  relacionados: [
    "/sistema-para-estacionamento",
    "/aplicativo-para-estacionamento",
    "/controle-de-estacionamento",
  ],
  leituras: [
    {
      href: "/blog/lpr-leitura-automatica-de-placas-no-app",
      titulo: "LPR: leitura automática de placas no aplicativo",
    },
  ],
};
