import type { Metadata } from "next";
import { urlSite } from "@/lib/urls";

/**
 * Política de Privacidade — exigida pela Google Play (página pública, sem
 * login, HTML) e linkada no Menu do app e no rodapé do site.
 *
 * A seção `#exclusao` também é a URL de exclusão de conta/dados que a Play
 * pede no formulário "Segurança dos dados". Não mude o id sem atualizar o
 * Console.
 *
 * ⚠️ Este texto descreve o que o código FAZ. Ao adicionar um SDK, uma
 * permissão Android, um processador de dados (gateway, e-mail, analytics) ou
 * uma coluna com dado pessoal, atualize a seção correspondente e a data.
 */

const ATUALIZADA_EM = "19 de novembro de 2026";
const EMAIL = "contato@nuvempark.com";

export const metadata: Metadata = {
  title: "Política de Privacidade | NuvemPark",
  description:
    "Como o NuvemPark — app e painel de gestão de estacionamentos — coleta, usa, compartilha e protege dados pessoais, e como exercer seus direitos pela LGPD.",
  alternates: { canonical: urlSite("/privacidade") },
};

const h2: React.CSSProperties = {
  margin: "40px 0 12px",
  fontSize: 22,
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.3,
};
const h3: React.CSSProperties = {
  margin: "24px 0 8px",
  fontSize: 17,
  fontWeight: 700,
  color: "#1F2937",
};
const p: React.CSSProperties = { margin: "0 0 14px" };
// O preflight do Tailwind zera o marcador — sem `listStyle` a lista vira
// parágrafos soltos.
const ul: React.CSSProperties = {
  margin: "0 0 14px",
  paddingLeft: 22,
  listStyle: "disc",
};
const li: React.CSSProperties = { marginBottom: 6 };
const a: React.CSSProperties = { color: "#15803D", textDecoration: "underline" };

function Email() {
  return (
    <a href={`mailto:${EMAIL}`} style={a}>
      {EMAIL}
    </a>
  );
}

export default function PrivacidadePage() {
  return (
    <article
      style={{
        maxWidth: 760,
        margin: "0 auto",
        // 128px no topo: o header do site é `fixed` (mesmo respiro das
        // páginas de solução).
        padding: "128px 20px 80px",
        fontSize: 16,
        lineHeight: 1.7,
        color: "#374151",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: "clamp(28px, 5vw, 38px)",
          fontWeight: 800,
          color: "#111827",
          lineHeight: 1.2,
        }}
      >
        Política de Privacidade
      </h1>
      <p style={{ margin: "10px 0 32px", fontSize: 14, color: "#6B7280" }}>
        Última atualização: {ATUALIZADA_EM}
      </p>

      <p style={p}>
        Esta política explica como o <strong>NuvemPark</strong> trata dados
        pessoais no aplicativo NuvemPark para Android e iPhone (usado por
        operadores de estacionamento), no painel de gestão em dashboard.nuvempark.com e no
        site nuvempark.com. Ela segue a Lei Geral de Proteção de Dados (Lei nº
        13.709/2018 — LGPD).
      </p>

      <h2 style={h2}>1. Quem somos e qual é o nosso papel</h2>
      <p style={p}>
        O NuvemPark é um sistema de gestão de estacionamentos contratado por
        empresas (os <strong>estacionamentos clientes</strong>). Atuamos em dois
        papéis diferentes:
      </p>
      <ul style={ul}>
        <li style={li}>
          <strong>Controlador</strong> dos dados das pessoas que contratam e
          usam o sistema (gestores, operadores e parceiros), dos visitantes do
          site e de quem nos envia contato.
        </li>
        <li style={li}>
          <strong>Operador</strong> dos dados que cada estacionamento registra
          sobre os próprios clientes (placas, fotos de veículos, mensalistas,
          hóspedes). Nesse caso, o controlador é o estacionamento: tratamos
          esses dados somente para prestar o serviço contratado e conforme as
          instruções dele. Pedidos sobre esses dados devem ser feitos
          primeiro ao estacionamento; se nos procurarem, encaminhamos.
        </li>
      </ul>
      <p style={p}>
        Contato para assuntos de privacidade e proteção de dados
        (encarregado): <Email />.
      </p>

      <h2 style={h2}>2. Quais dados coletamos</h2>

      <h3 style={h3}>2.1 Conta e uso do sistema (gestores, operadores, parceiros)</h3>
      <ul style={ul}>
        <li style={li}>Nome, e-mail e telefone; dados de login (incluindo login com Google, quando escolhido).</li>
        <li style={li}>
          Dados da empresa para cobrança da assinatura: razão social ou nome e
          CPF ou CNPJ.
        </li>
        <li style={li}>
          Registros de operação: quem abriu e fechou caixa, registrou entradas
          e saídas, recebeu pagamentos ou alterou cadastros (trilha de
          auditoria).
        </li>
      </ul>

      <h3 style={h3}>2.2 Aparelho em que o app é usado</h3>
      <ul style={ul}>
        <li style={li}>
          Um identificador gerado pelo próprio app na instalação, enviado no
          login para licenciar o aparelho no estacionamento.
        </li>
        <li style={li}>
          No Android, também o identificador do aparelho (Android ID),
          fabricante, modelo e versão do sistema. O Android ID é guardado
          apenas como hash (nunca o valor original). No iPhone, o app não lê
          identificadores do aparelho.
        </li>
        <li style={li}>Endereço IP e data/hora dos acessos à API.</li>
        <li style={li}>
          Sinais de funcionamento (o app avisa periodicamente que está online e
          sincronizado), usados para o gestor acompanhar os aparelhos do pátio.
        </li>
      </ul>
      <p style={p}>
        O app <strong>não</strong> coleta localização, contatos, mensagens,
        arquivos pessoais nem lista de apps instalados, e não exibe anúncios.
      </p>

      <h3 style={h3}>2.3 Dados que o estacionamento registra sobre os próprios clientes</h3>
      <ul style={ul}>
        <li style={li}>
          Placa do veículo, horário de entrada e saída, valores pagos e forma de
          pagamento.
        </li>
        <li style={li}>
          Foto do veículo na entrada e fotos de avarias, quando o estacionamento
          usa esses recursos.
        </li>
        <li style={li}>
          Mensalistas, parceiros e hóspedes: nome, documento (CPF/CNPJ),
          e-mail, telefone e placas vinculadas, conforme o cadastro feito pelo
          estacionamento.
        </li>
      </ul>

      <h3 style={h3}>2.4 Site</h3>
      <ul style={ul}>
        <li style={li}>
          Formulários de contato e cadastro: nome, telefone, e-mail, endereço IP
          e navegador (user agent), para responder e evitar abuso.
        </li>
        <li style={li}>
          Google Analytics: dados de navegação (páginas vistas, origem da visita,
          tipo de dispositivo) coletados por cookies, para medir a audiência do
          site. O Google Analytics não é usado no app.
        </li>
      </ul>

      <h2 style={h2}>3. Permissões do app e para que servem</h2>
      <ul style={ul}>
        <li style={li}>
          <strong>Câmera:</strong> fotografar a placa e o veículo na entrada,
          registrar avarias e ler QR codes de tickets. A leitura da placa (OCR)
          é feita <strong>no próprio aparelho</strong>; a imagem não é enviada a
          terceiros para reconhecimento.
        </li>
        <li style={li}>
          <strong>Bluetooth:</strong> encontrar e conectar a impressora térmica
          de cupons. Não é usado para localização.
        </li>
        <li style={li}>
          <strong>Notificações, serviço em primeiro plano e otimização de
          bateria (só no Android):</strong> manter a sincronização e o sinal de funcionamento
          ativos com a tela apagada. A notificação fixa é a exigida pelo
          Android para indicar que o serviço está rodando.
        </li>
        <li style={li}>
          <strong>Armazenamento (só no Android 9 ou anterior):</strong>{" "}
          exigido pelo componente de câmera para gravar a foto antes do envio.
          O app não lê seus arquivos pessoais.
        </li>
        <li style={li}>
          <strong>Galeria de fotos e microfone (iPhone):</strong> o iPhone pede
          a descrição dessas permissões porque o componente de câmera as
          prevê, mas o app não grava áudio nem lê a galeria por conta própria.
        </li>
        <li style={li}>
          <strong>Internet:</strong> sincronizar os dados com o servidor. O app
          funciona offline e guarda os registros no aparelho até conseguir
          enviá-los.
        </li>
      </ul>

      <h2 style={h2}>4. Para que usamos os dados</h2>
      <ul style={ul}>
        <li style={li}>Prestar o serviço contratado: controle de pátio, tickets, caixa, mensalistas, convênios e relatórios (execução de contrato).</li>
        <li style={li}>Cobrar a assinatura do sistema e processar pagamentos de estadias (execução de contrato e obrigações legais e fiscais).</li>
        <li style={li}>Garantir a segurança da conta, licenciar aparelhos e manter a trilha de auditoria (legítimo interesse e prevenção a fraudes).</li>
        <li style={li}>Dar suporte e responder contatos (legítimo interesse ou execução de contrato).</li>
        <li style={li}>Medir o uso do site para melhorá-lo (legítimo interesse).</li>
      </ul>
      <p style={p}>Não vendemos dados pessoais e não os usamos para publicidade.</p>

      <h2 style={h2}>5. Com quem compartilhamos</h2>
      <ul style={ul}>
        <li style={li}>
          <strong>Estacionamento cliente:</strong> os dados da operação de cada
          estacionamento ficam visíveis apenas para os usuários autorizados
          dele. Os dados de um estacionamento não são acessíveis a outro.
        </li>
        <li style={li}>
          <strong>Asaas (instituição de pagamento):</strong> processa a cobrança
          da assinatura (Pix, boleto ou cartão) e os pagamentos Pix de
          estadias. Os dados de cartão são informados diretamente ao Asaas; o
          NuvemPark não os armazena.
        </li>
        <li style={li}>
          <strong>Provedores de infraestrutura:</strong> hospedagem de
          servidores, banco de dados e armazenamento de arquivos (fotos), que
          tratam os dados apenas em nosso nome.
        </li>
        <li style={li}>
          <strong>Google:</strong> login com Google (quando escolhido), Google
          Analytics no site e Google ML Kit, a biblioteca que lê a placa no
          aparelho. O ML Kit pode enviar ao Google métricas técnicas de uso e
          desempenho (como modelo do aparelho e tempo de processamento), mas
          não as fotos.
        </li>
        <li style={li}>
          <strong>Autoridades:</strong> quando houver obrigação legal ou ordem
          judicial.
        </li>
      </ul>
      <p style={p}>
        Alguns desses provedores podem armazenar dados fora do Brasil. Nesses
        casos, exigimos garantias de proteção compatíveis com a LGPD.
      </p>

      <h2 style={h2}>6. Segurança</h2>
      <p style={p}>
        Os dados trafegam por conexão criptografada (HTTPS). As fotos ficam em
        armazenamento privado, acessível só por links temporários. No aparelho,
        as credenciais de acesso ficam no armazenamento seguro do sistema
        (Keystore no Android, Keychain no iPhone). O
        acesso aos dados é separado por estacionamento e por perfil de usuário,
        e as ações relevantes ficam registradas em auditoria.
      </p>

      <h2 style={h2}>7. Por quanto tempo guardamos</h2>
      <p style={p}>
        Guardamos os dados enquanto a conta do estacionamento estiver ativa e
        pelo tempo necessário para cumprir as finalidades acima. Depois do
        encerramento, os dados são excluídos ou anonimizados, exceto os que
        precisamos manter por obrigação legal, fiscal ou para defesa em
        processos (por exemplo, registros de cobrança e de acesso a
        aplicações, que o Marco Civil da Internet manda guardar por 6 meses).
        Dados que o estacionamento exclui no sistema deixam de ser usados na
        operação.
      </p>

      <h2 style={h2}>8. Seus direitos</h2>
      <p style={p}>
        Pela LGPD, você pode pedir: confirmação de que tratamos seus dados,
        acesso, correção, anonimização, bloqueio ou eliminação de dados
        desnecessários, portabilidade, informação sobre com quem compartilhamos,
        e revogação de consentimento, quando o tratamento depender dele. Você
        também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>
      <p style={p}>
        Envie o pedido para <Email />. Responderemos em até 15 dias. Se o
        pedido for sobre dados registrados por um estacionamento (placa, foto,
        cadastro de mensalista), procure também o estacionamento, que é o
        controlador desses dados.
      </p>

      <h2 id="exclusao" style={{ ...h2, scrollMarginTop: 96 }}>
        9. Como excluir sua conta e seus dados
      </h2>
      <p style={p}>
        As contas de operador do app são criadas pelo gestor do
        estacionamento no painel. Para excluir uma conta ou os dados ligados a
        ela:
      </p>
      <ul style={ul}>
        <li style={li}>
          <strong>Operador ou parceiro:</strong> peça ao gestor do
          estacionamento, que pode remover seu acesso no painel, ou escreva para{" "}
          <Email />{" "}
          com o assunto &quot;Excluir conta&quot;, informando seu
          e-mail e o nome do estacionamento.
        </li>
        <li style={li}>
          <strong>Gestor (conta do estacionamento):</strong> escreva para{" "}
          <Email /> a partir do e-mail cadastrado, pedindo o encerramento da
          conta e a exclusão dos dados.
        </li>
      </ul>
      <p style={p}>
        Confirmamos a identidade do solicitante e concluímos a exclusão em até
        30 dias. São excluídos os dados de cadastro e acesso da conta; ficam
        guardados apenas os registros que a lei nos obriga a manter (item 7),
        pelo prazo legal.
      </p>

      <h2 style={h2}>10. Crianças</h2>
      <p style={p}>
        O NuvemPark é uma ferramenta profissional para empresas e não é
        destinado a menores de 18 anos.
      </p>

      <h2 style={h2}>11. Mudanças nesta política</h2>
      <p style={p}>
        Podemos atualizar esta política quando o serviço mudar. A data no topo
        indica a versão em vigor. Mudanças relevantes serão avisadas no painel
        ou por e-mail.
      </p>
    </article>
  );
}
