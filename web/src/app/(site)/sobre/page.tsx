import { Target, Zap, HeartHandshake, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { CtaFinal } from "@/components/site/secoes";

export const metadata = {
  title: "Sobre — NuvemPark",
  description:
    "Nascemos dentro da operação real de estacionamentos. O NuvemPark é a tecnologia que construímos para o nosso dia a dia — agora disponível para o seu.",
};

const VALORES = [
  {
    Icone: Zap,
    titulo: "Simplicidade primeiro",
    texto:
      "Se o operador precisa de treinamento longo, erramos. Cada tela é pensada para o ritmo real de um pátio cheio.",
    cor: "text-ambar",
    fundo: "bg-aviso-bg",
  },
  {
    Icone: ShieldCheck,
    titulo: "Confiabilidade",
    texto:
      "Estacionamento não pode parar. Por isso o app funciona offline e cada centavo é registrado e auditável.",
    cor: "text-brand-600",
    fundo: "bg-brand-50",
  },
  {
    Icone: Target,
    titulo: "Feito por quem opera",
    texto:
      "Não somos uma software house distante — a plataforma nasceu dentro de uma operação real de pátios.",
    cor: "text-ceu",
    fundo: "bg-info-bg",
  },
  {
    Icone: HeartHandshake,
    titulo: "Parceria de verdade",
    texto:
      "Seu sucesso é o nosso. O roadmap é guiado pelo que nossos clientes precisam no dia a dia.",
    cor: "text-violeta",
    fundo: "bg-violeta/10",
  },
];

export default function SobrePage() {
  return (
    <>
      <PageHero
        chip="Sobre nós"
        titulo={
          <>
            Tecnologia nascida
            <br className="hidden sm:block" />{" "}
            <span className="texto-brand-gradiente">dentro do pátio</span>
          </>
        }
        descricao="O NuvemPark não nasceu num escritório de software. Nasceu na fila das 18h, no caixa que não batia e na internet que caía na hora errada. A gente construiu para resolver o nosso problema — e hoje resolve o seu."
      />

      <section className="pb-10 bg-white">
        <div className="mx-auto max-w-3xl px-5">
          <Reveal>
            <div className="prose-sm text-texto-2 leading-relaxed space-y-4 text-base">
              <p>
                Antes de ser um produto, o NuvemPark foi a nossa própria
                ferramenta. Operando pátios no dia a dia, sentimos na pele o que
                falta nos sistemas tradicionais: eles são caros, dependem de
                internet estável e complicam o que deveria ser simples.
              </p>
              <p>
                Então construímos do zero uma plataforma com as prioridades
                invertidas: <b className="text-texto">o pátio primeiro</b>. O
                app funciona sem internet, o ticket sai em segundos e o gestor
                enxerga tudo em tempo real — de um pátio ou de uma rede inteira.
              </p>
              <p>
                Hoje, o NuvemPark é oferecido como serviço para operadores e
                redes de estacionamento que querem profissionalizar a operação
                sem investir em equipamento caro.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-fundo">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="text-center max-w-xl mx-auto">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">
              Nossos princípios
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-texto">
              O que guia cada decisão
            </h2>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {VALORES.map((v, i) => (
              <Reveal key={v.titulo} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-borda bg-white p-6 shadow-[var(--shadow-card)]">
                  <span
                    className={`inline-grid place-items-center w-11 h-11 rounded-xl ${v.fundo} ${v.cor}`}
                  >
                    <v.Icone className="w-5 h-5" />
                  </span>
                  <h3 className="mt-4 font-extrabold text-lg text-texto">
                    {v.titulo}
                  </h3>
                  <p className="mt-2 text-sm text-texto-2 leading-relaxed">
                    {v.texto}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaFinal />
    </>
  );
}
