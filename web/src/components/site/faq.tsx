"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { eyebrow, h2 } from "@/components/site/tokens";

const FAQ = [
  { q: "Preciso instalar cancela ou equipamento?", a: "Não. O NuvemPark roda no celular Android que o operador já tem e no navegador do gestor. Sem cancela, sem servidor local, sem obra." },
  { q: "E se a internet cair no meio da operação?", a: "A fila continua andando. O app registra entradas, saídas e pagamentos offline e sincroniza tudo sozinho quando a conexão volta." },
  { q: "Como funciona o teste grátis?", a: "São 15 dias com todos os recursos, sem cartão de crédito. Você mesmo cria a conta e usa na hora. Só vira mensalidade se decidir ficar." },
  { q: "Quanto custa depois do teste?", a: "R$ 129,90 por mês, por pátio — tudo incluso. Sem taxa de instalação, sem cobrança por operador, sem fidelidade." },
  { q: "Tenho mais de um pátio. Preciso de contas separadas?", a: "Não. Todos os pátios ficam na mesma conta, cada um com suas tarifas, operadores e caixa, consolidados num painel só." },
  { q: "Meus dados ficam seguros?", a: "Sim. Tudo trafega criptografado e fica guardado na nuvem com backup automático. Nada depende de um computador que pode queimar ou ser roubado no pátio." },
  { q: "Preciso de alguém técnico para configurar?", a: "Não. Cadastro em 1 minuto, sem vendedor. Você cria os pátios e seus operadores entram no app com o código do pátio." },
];

export function Faq() {
  const [aberto, setAberto] = useState(0);

  return (
    <section id="faq" data-sec style={{ background: "#fff", padding: "96px 0" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <div style={{ textAlign: "center" }}>
            <span style={eyebrow}>Dúvidas comuns</span>
            <h2 data-balance style={h2}>Antes de você perguntar</h2>
          </div>
        </Reveal>

        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 12 }}>
          {FAQ.map((item, i) => {
            const open = aberto === i;
            return (
              <div key={item.q} style={{ borderRadius: 16, border: "1px solid #E5E7EB", background: "#F3F4F6", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setAberto(open ? -1 : i)}
                  aria-expanded={open}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "20px 24px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#1F2937" }}>{item.q}</span>
                  <span style={{ flex: "none", display: "grid", placeItems: "center", transition: "transform .25s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <ChevronDown size={18} strokeWidth={2.4} color="#16A34A" />
                  </span>
                </button>
                {open && (
                  <div style={{ padding: "0 24px 20px", fontSize: 15, lineHeight: 1.65, color: "#6B7280" }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
