import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { Precos, CtaFinal } from "@/components/site/secoes";

export const metadata = {
  title: "Preços — NuvemPark",
  description:
    "Um plano simples: R$ 129,90 por mês, por pátio. Tudo incluso, sem taxa de instalação e sem fidelidade.",
};

const FAQ = [
  {
    p: "Preciso comprar algum equipamento?",
    r: "Não. O NuvemPark funciona em qualquer celular Android. Se quiser imprimir tickets, basta uma impressora térmica Bluetooth comum — a mesma usada em deliveries.",
  },
  {
    p: "E se a internet do pátio cair?",
    r: "A operação continua normalmente. O app funciona 100% offline e sincroniza tudo sozinho quando a conexão volta.",
  },
  {
    p: "Tenho mais de um estacionamento. Como funciona?",
    r: "Cada pátio é uma assinatura de R$ 129,90/mês, todos na mesma conta. Você gerencia a rede inteira em um único painel.",
  },
  {
    p: "Existe fidelidade ou multa de cancelamento?",
    r: "Não. Você pode cancelar quando quiser, sem multa. Seus dados ficam disponíveis para exportação.",
  },
  {
    p: "Quanto tempo leva para começar?",
    r: "Minutos. Nossa equipe cria sua conta, você instala o app nos celulares dos operadores e já pode registrar a primeira entrada.",
  },
  {
    p: "As atualizações são cobradas à parte?",
    r: "Nunca. Todos os novos recursos entram automaticamente no seu plano, sem custo adicional.",
  },
];

export default function PrecosPage() {
  return (
    <>
      <PageHero
        chip="Preços"
        titulo={
          <>
            Um preço. Tudo dentro.
            <br className="hidden sm:block" />{" "}
            <span className="texto-brand-gradiente">Zero letra miúda.</span>
          </>
        }
        descricao="R$ 129,90 por pátio, por mês. É menos do que um único cliente deixa no seu caixa por dia — e você nunca mais fecha o mês no escuro."
      />

      <Precos />

      {/* FAQ */}
      <section className="py-24 bg-fundo">
        <div className="mx-auto max-w-3xl px-5">
          <Reveal className="text-center">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">
              Dúvidas frequentes
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-texto">
              Perguntas e respostas
            </h2>
          </Reveal>

          <div className="mt-12 space-y-4">
            {FAQ.map((f, i) => (
              <Reveal key={f.p} delay={i * 0.06}>
                <details className="group rounded-2xl border border-borda bg-white shadow-[var(--shadow-card)] open:shadow-[var(--shadow-card-hover)] transition-shadow">
                  <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-bold text-texto">
                    {f.p}
                    <span className="shrink-0 w-7 h-7 rounded-full bg-brand-50 text-brand-700 grid place-items-center text-lg font-black group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="px-6 pb-5 text-sm text-texto-2 leading-relaxed">
                    {f.r}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaFinal />
    </>
  );
}
