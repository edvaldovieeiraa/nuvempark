/**
 * O SITE EM MARKDOWN — a versão que agentes de IA leem.
 *
 * Por que existe: a landing é feita de componentes React com muito estilo inline
 * e três variantes de aba. Um agente que baixa o HTML recebe ~200 KB de markup
 * para extrair uma dúzia de fatos. Aqui os mesmos fatos estão em texto puro,
 * servidos na MESMA URL via negociação de conteúdo (`Accept: text/markdown`) e
 * também no sufixo `.md` (ex.: `/precos.md`).
 *
 * REGRA DE MANUTENÇÃO: este arquivo é conteúdo, não fonte de verdade de preço.
 * Se o preço, o telefone ou o prazo do teste mudarem na página, mudam aqui —
 * um agente citando R$ 129,90 quando o site já cobra outro valor é pior do que
 * não ter markdown nenhum. Os números abaixo espelham
 * `components/site/precos.tsx`, `faq.tsx`, `recursos.tsx` e as páginas de
 * `app/(site)`.
 *
 * Sem `server-only`: o middleware não importa este módulo (só a lista de
 * caminhos, duplicada lá de propósito), mas o build do Edge não precisa saber
 * disso — mantê-lo neutro evita surpresa se alguém importar do lugar errado.
 */

import { SOLUCOES, type PaginaSolucao, tituloCurto } from "@/lib/solucoes";
import { urlSite } from "@/lib/urls";

export type PaginaAgente = {
  /** Caminho público, exatamente como no sitemap. */
  caminho: string;
  titulo: string;
  /** Uma linha — é o que entra no índice do llms.txt. */
  resumo: string;
  /** Corpo em Markdown, sem o `# título` (adicionado na serialização). */
  corpo: string;
};

const INICIO = `NuvemPark é um sistema de gestão de estacionamento (SaaS brasileiro) para
operadores e redes de pátios. A operação acontece num app Android que funciona
100% offline; o gestor acompanha faturamento, ocupação e caixa em tempo real por
um painel web.

## Em números

- **100% offline** — a fila anda mesmo sem internet.
- **3 segundos** da placa lida ao ticket na mão do cliente.
- **R$ 0 de equipamento** — usa o celular que a equipe já tem.
- **1 painel** para todos os pátios ao vivo.

## O que resolve

- **Offline-first.** O app registra entradas, saídas e pagamentos sem sinal e
  sincroniza sozinho quando a conexão volta.
- **Leitura de placa por câmera.** O operador aponta o celular e a placa entra
  sem digitação.
- **Tarifa calculada.** Fração inicial, fração adicional, teto de diária,
  tolerância e pernoite aplicados automaticamente.
- **Ticket impresso.** Comprovante com QR Code em impressora térmica Bluetooth
  comum (a mesma usada em delivery).
- **Caixa por operador.** Sessão com dono e horário, sangria registrada e
  fechamento com conferência.
- **Multi-pátio.** Cada pátio com suas tarifas, operadores e caixa, tudo
  consolidado numa conta só.
- **Pix no ticket.** O cliente escaneia o QR do cupom, vê o valor da estadia e
  paga por Pix; a confirmação chega automaticamente.

## Como começar

1. **Criar a conta** (1 minuto, sem cartão e sem vendedor) em
   https://dashboard.nuvempark.com/cadastro — confirmado o e-mail, o painel abre
   com 15 dias liberados.
2. **Cadastrar pátios e operadores** no painel. Os operadores instalam o app no
   Android e entram com o código do pátio — sem obra e sem técnico.
3. **Operar.** Carro chega, câmera lê a placa, ticket sai impresso e o valor
   aparece no painel do gestor na hora.

## Preço

R$ 129,90 por mês, por pátio, tudo incluso. 15 dias de teste grátis com todos os
recursos, sem cartão de crédito. Sem taxa de instalação, sem cobrança por
operador, sem fidelidade e sem multa de cancelamento.

## Perguntas frequentes

**Preciso instalar cancela ou equipamento?**
Não. Roda no celular Android que o operador já tem e no navegador do gestor. Sem
cancela, sem servidor local, sem obra.

**E se a internet cair no meio da operação?**
A fila continua andando. O app registra entradas, saídas e pagamentos offline e
sincroniza tudo sozinho quando a conexão volta.

**Como funciona o teste grátis?**
15 dias com todos os recursos, sem cartão de crédito. Só vira mensalidade se
você decidir ficar.

**Quanto custa depois do teste?**
R$ 129,90 por mês, por pátio — tudo incluso.

**Tenho mais de um pátio. Preciso de contas separadas?**
Não. Todos os pátios ficam na mesma conta, cada um com suas tarifas, operadores
e caixa, consolidados num painel só.

**Meus dados ficam seguros?**
Tudo trafega criptografado e fica guardado na nuvem com backup automático. Nada
depende de um computador que pode queimar ou ser roubado no pátio.

**Preciso de alguém técnico para configurar?**
Não. Cadastro em 1 minuto, sem vendedor. Você cria os pátios e seus operadores
entram no app com o código do pátio.`;

const RECURSOS = `O operador trabalha mais rápido com o app; o gestor enxerga cada movimento pelo
painel.

## Offline-first — a internet caiu? Ninguém percebe

O app registra entradas, saídas e pagamentos mesmo sem sinal. Quando a conexão
volta, tudo sobe sozinho para o painel.

- Nada de fila parada quando o Wi-Fi some.
- Sincronização automática, sem clique.

## Leitura de placa + tarifa

A câmera do celular lê a placa em cerca de 1 segundo, sem erro de digitação.
Fração, hora, diária, tolerância e pernoite: o valor certo sai calculado.

- Zero fila crescendo por digitação lenta.
- Tarifa que você configura, aplicada sem falha.

## Painel do gestor ao vivo

Cada entrada e cada real aparecem no painel na hora em que acontecem. Um pátio
ou uma rede inteira, consolidados numa conta só.

- Caixa por operador, com dono e horário.
- Da primeira vaga à quinta filial, sem trocar de sistema.

## Demais recursos

- **Ticket profissional na hora** — comprovante com QR Code e o nome do pátio,
  impresso em térmica Bluetooth de bolso.
- **Cada centavo tem dono** — caixa por operador, sangria registrada,
  fechamento com conferência.
- **Mensalistas e livre passagem.**
- **Relatórios de faturamento.**
- **Pagamento por Pix no ticket**, com confirmação automática.
- **Foto do veículo na entrada**, para comprovação de avaria.

## Como funciona (3 passos)

1. **Crie sua conta em 1 minuto** — cadastro grátis, sem cartão e sem vendedor.
   Confirmou o e-mail, o painel abre com 15 dias liberados.
2. **Baixe o app e chame a equipe** — cadastre pátios e operadores no painel;
   eles entram no app Android com o código do pátio.
3. **Opere e acompanhe ao vivo** — carro chega, câmera lê a placa, ticket sai
   impresso, e cada real aparece no painel.`;

const PRECOS = `## Plano único

**R$ 129,90 por mês, por pátio — tudo incluso.**

Antes disso, **15 dias grátis** com todos os recursos e sem cartão de crédito.

- Sem taxa de instalação.
- Sem cobrança por operador.
- Sem fidelidade e sem multa de cancelamento.
- Atualizações incluídas: todo recurso novo entra no plano, sem custo extra.

## O que está incluso

- App operacional offline-first
- Cobrança automática por tempo
- Leitura de placa por câmera
- Impressão Bluetooth com QR Code
- Painel web em tempo real
- Vários pátios na mesma conta
- Mensalistas e livre passagem
- Operadores e caixa por sessão
- Relatórios de faturamento
- Suporte no WhatsApp
- Atualizações incluídas
- Sem fidelidade — cancele quando quiser

## Perguntas frequentes sobre o preço

**Preciso comprar algum equipamento?**
Não. Funciona em qualquer celular Android. Para imprimir tickets, basta uma
impressora térmica Bluetooth comum — a mesma usada em deliveries.

**E se a internet do pátio cair?**
A operação continua normalmente. O app funciona 100% offline e sincroniza tudo
sozinho quando a conexão volta.

**Tenho mais de um estacionamento. Como funciona?**
Cada pátio é uma assinatura de R$ 129,90/mês, todos na mesma conta. Você
gerencia a rede inteira em um único painel.

**Existe fidelidade ou multa de cancelamento?**
Não. Pode cancelar quando quiser, sem multa. Os dados ficam disponíveis para
exportação.

**Quanto tempo leva para começar?**
Minutos, e você mesmo faz. Cria a conta grátis no site, cadastra os operadores
no painel e eles baixam o app no Android. Na primeira entrada já está cobrando.

**As atualizações são cobradas à parte?**
Nunca. Todos os novos recursos entram automaticamente no plano.`;

const SOBRE = `O NuvemPark não nasceu num escritório de software. Nasceu na fila das 18h, no
caixa que não batia e na internet que caía na hora errada.

Antes de ser um produto, foi a nossa própria ferramenta. Operando pátios no dia
a dia, sentimos o que falta nos sistemas tradicionais: são caros, dependem de
internet estável e complicam o que deveria ser simples.

Então construímos do zero uma plataforma com as prioridades invertidas: **o
pátio primeiro**. O app funciona sem internet, o ticket sai em segundos e o
gestor enxerga tudo em tempo real — de um pátio ou de uma rede inteira.

Hoje o NuvemPark é oferecido como serviço para operadores e redes de
estacionamento que querem profissionalizar a operação sem investir em
equipamento caro.

## Princípios

- **Simplicidade primeiro.** Se o operador precisa de treinamento longo,
  erramos. Cada tela é pensada para o ritmo real de um pátio cheio.
- **Confiabilidade.** Estacionamento não pode parar: o app funciona offline e
  cada centavo é registrado e auditável.
- **Feito por quem opera.** A plataforma nasceu dentro de uma operação real de
  pátios.
- **Parceria de verdade.** O roadmap é guiado pelo que os clientes precisam no
  dia a dia.`;

const CONTATO = `- **WhatsApp:** (81) 99614-2120 — https://wa.me/5581996142120
- **E-mail:** contato@nuvempark.com
- **Horário de atendimento:** segunda a sexta, das 8h às 18h (America/Recife).
  Mensagens fora do horário são respondidas no próximo dia útil.

Para começar sem falar com ninguém, a conta é auto-atendida:
https://dashboard.nuvempark.com/cadastro (15 dias grátis, sem cartão).`;

const NOVIDADES = `Todo recurso novo entra automaticamente na assinatura — sem upgrade, sem módulo
extra e sem custo adicional.

## Em desenvolvimento

- **Pagamento por Pix integrado** — QR Code de pagamento direto no ticket, com
  confirmação automática.
- **Exportação de relatórios** — faturamento e movimentos em planilha, prontos
  para a contabilidade.
- **Foto do veículo na entrada** — registro visual de cada entrada para
  segurança e comprovação.

## Planejado

- **App para o cliente final** — o cliente acompanha o ticket e paga pelo
  próprio celular.
- **Alertas inteligentes** — avisos de pátio lotado, caixa aberto há muito
  tempo e mais.
- **Credenciais para eventos** — venda e validação de credenciais de
  estacionamento.
- **Relatórios avançados** — comparativos entre pátios, horários de pico e
  projeções.
- **Integrações via API** — conectar o NuvemPark a sistemas que o cliente já
  usa.
- **Conciliação bancária.**`;

/**
 * Encaixa o corpo de uma antiga página como seção do documento da home.
 *
 * Os títulos internos são rebaixados um nível (`##` vira `###`) para que o
 * título da seção fique acima deles — sem isso o documento teria vários `##`
 * soltos no mesmo nível e a hierarquia mentiria sobre o que contém o quê.
 *
 * A âncora vai escrita no texto de propósito: um agente que resume o site
 * precisa conseguir devolver ao usuário um link que rola até o ponto certo.
 */
function comoSecao(titulo: string, ancora: string, corpo: string): string {
  const rebaixado = corpo.replace(/^(#{1,5}) /gm, "#$1 ");
  return `## ${titulo}\n\nNesta página: ${urlSite("/")}#${ancora}\n\n${rebaixado}`;
}

/**
 * O site institucional inteiro num documento — porque ele é ONEPAGE.
 *
 * Recursos, preços, novidades, sobre e contato eram páginas próprias e viraram
 * seções da home. O texto delas não foi jogado fora: está aqui embaixo, na
 * mesma ordem do menu. Um agente que baixa `/index.md` continua recebendo tudo
 * o que recebia antes em cinco requisições.
 */
const HOME = [
  INICIO,
  comoSecao("Recursos", "recursos", RECURSOS),
  comoSecao("Preços", "precos", PRECOS),
  comoSecao("Novidades e roadmap", "novidades", NOVIDADES),
  comoSecao("Sobre a NuvemPark", "sobre", SOBRE),
  comoSecao("Contato", "contato", CONTATO),
].join("\n\n---\n\n");

/**
 * Serializa uma página de solução em Markdown.
 *
 * GERADO, não escrito à mão: o texto do documento e o texto do HTML saem da
 * MESMA fonte (`lib/solucoes.ts`). Uma segunda cópia manual divergiria na
 * primeira correção de preço — que é exatamente o cenário que o comentário no
 * topo deste arquivo manda evitar.
 */
function markdownDaSolucao(pagina: PaginaSolucao): string {
  const partes: string[] = [pagina.resposta, ""];

  for (const secao of pagina.secoes) {
    partes.push(`## ${secao.h2}`, "");
    if (secao.texto) partes.push(secao.texto, "");
    if (secao.lista) {
      partes.push(...secao.lista.map((i) => `- ${i}`), "");
    }
    if (secao.tabela) {
      const { cabecalho, linhas } = secao.tabela;
      partes.push(
        `| ${cabecalho.map((c) => c || " ").join(" | ")} |`,
        `| ${cabecalho.map(() => "---").join(" | ")} |`,
        ...linhas.map((l) => `| ${l.join(" | ")} |`),
        "",
      );
    }
    for (const item of secao.itens ?? []) {
      partes.push(`### ${item.h3}`, "", item.texto, "");
    }
    if (secao.textoFinal) partes.push(secao.textoFinal, "");
    if (secao.link) {
      partes.push(`Veja também: [${secao.link.texto}](${urlSite(secao.link.href)})`, "");
    }
  }

  partes.push("## Perguntas frequentes", "");
  for (const item of pagina.faq) {
    partes.push(`### ${item.pergunta}`, "", item.resposta, "");
  }

  if (pagina.relacionados.length > 0) {
    partes.push("## Páginas relacionadas", "");
    partes.push(
      ...pagina.relacionados.map((c) => `- [${tituloCurto(c)}](${urlSite(c)})`),
      "",
    );
  }

  return partes.join("\n").trim();
}

/**
 * Páginas institucionais: a home (o site onepage inteiro) e o silo de páginas
 * de solução. O blog não entra aqui — o Markdown dele é montado a partir do
 * banco, em `agentes/markdown.ts`.
 */
export const PAGINAS_AGENTE: readonly PaginaAgente[] = [
  {
    caminho: "/",
    titulo: "NuvemPark — gestão de estacionamento na nuvem",
    resumo:
      "O site inteiro: visão geral, recursos, preços (R$ 129,90/mês por pátio), roadmap, quem somos e contato. App Android offline-first para o operador, painel web em tempo real para o gestor.",
    corpo: HOME,
  },
  ...SOLUCOES.map((s) => ({
    caminho: s.caminho,
    titulo: s.h1,
    resumo: s.descricao,
    corpo: markdownDaSolucao(s),
  })),
] as const;

/** Busca por caminho normalizado ("/precos"). `null` quando não é página do site. */
export function paginaPorCaminho(caminho: string): PaginaAgente | null {
  return PAGINAS_AGENTE.find((p) => p.caminho === caminho) ?? null;
}

/** Documento Markdown completo de uma página (título + corpo). */
export function markdownDaPagina(pagina: PaginaAgente): string {
  return `# ${pagina.titulo}\n\n${pagina.corpo}\n`;
}
