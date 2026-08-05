import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { eyebrow, h2 } from "@/components/site/tokens";

/**
 * As perguntas da home.
 *
 * Exportadas porque `app/(site)/page.tsx` monta o FAQPage (JSON-LD) a partir
 * DESTA lista. O dado estruturado precisa repetir literalmente o texto visível
 * — declarar uma resposta que não está na página é motivo de ação manual do
 * Google, e manter duas cópias do texto garante que uma hora vão divergir.
 */
export const FAQ_HOME = [
  {
    pergunta: "Preciso instalar cancela ou equipamento?",
    resposta:
      "Não. O NuvemPark roda no celular Android que o operador já tem e no navegador do gestor. Sem cancela, sem servidor local, sem obra.",
  },
  {
    pergunta: "E se a internet cair no meio da operação?",
    resposta:
      "A fila continua andando. O app registra entradas, saídas e pagamentos offline e sincroniza tudo sozinho quando a conexão volta.",
  },
  {
    pergunta: "Como funciona o teste grátis?",
    resposta:
      "São 15 dias com todos os recursos, sem cartão de crédito. Você mesmo cria a conta e usa na hora. Só vira mensalidade se decidir ficar.",
  },
  {
    pergunta: "Quanto custa depois do teste?",
    resposta:
      "R$ 129,90 por mês, por pátio — tudo incluso. Sem taxa de instalação, sem cobrança por operador, sem fidelidade.",
  },
  {
    pergunta: "Tenho mais de um pátio. Preciso de contas separadas?",
    resposta:
      "Não. Todos os pátios ficam na mesma conta, cada um com suas tarifas, operadores e caixa, consolidados num painel só.",
  },
  {
    pergunta: "Meus dados ficam seguros?",
    resposta:
      "Sim. Tudo trafega criptografado e fica guardado na nuvem com backup automático. Nada depende de um computador que pode queimar ou ser roubado no pátio.",
  },
  {
    pergunta: "Preciso de alguém técnico para configurar?",
    resposta:
      "Não. Cadastro em 1 minuto, sem vendedor. Você cria os pátios e seus operadores entram no app com o código do pátio.",
  },
];

/**
 * FAQ da home.
 *
 * ⚠️ Era um componente de cliente que renderizava SÓ a resposta aberta
 * (`{open && <div/>}`). Visualmente idêntico ao de hoje — e, para um rastreador,
 * uma página com uma resposta em vez de sete: as outras seis simplesmente não
 * existiam no HTML. Também custava um bundle de JavaScript para abrir e fechar
 * um painel.
 *
 * O `<details>` nativo resolve as duas coisas: o texto inteiro vai no HTML da
 * primeira resposta, abre e fecha sem JavaScript e é acessível por teclado. O
 * atributo `name` faz o conjunto se comportar como acordeão — abrir uma fecha a
 * outra, que era o comportamento do estado do React. Onde o navegador ainda não
 * suporta `name`, o único efeito é poder ficar com duas abertas ao mesmo tempo.
 */
export function Faq() {
  return (
    <section id="faq" data-sec style={{ background: "#fff", padding: "96px 0" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <div style={{ textAlign: "center" }}>
            <span style={eyebrow}>Dúvidas comuns</span>
            <h2 data-balance style={h2}>
              Antes de você perguntar
            </h2>
          </div>
        </Reveal>

        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 12 }}>
          {FAQ_HOME.map((item, i) => (
            <details
              key={item.pergunta}
              name="np-faq-home"
              open={i === 0}
              style={{
                borderRadius: 16,
                border: "1px solid #E5E7EB",
                background: "#F3F4F6",
                overflow: "hidden",
              }}
            >
              <summary
                className="np-faq-sumario"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "20px 24px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#1F2937",
                  listStyle: "none",
                }}
              >
                {item.pergunta}
                <ChevronDown
                  size={18}
                  strokeWidth={2.4}
                  color="#16A34A"
                  style={{ flex: "none" }}
                  aria-hidden
                />
              </summary>
              <div
                style={{
                  padding: "0 24px 20px",
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: "#4B5563",
                }}
              >
                {item.resposta}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
