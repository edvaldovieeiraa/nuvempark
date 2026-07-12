import { MessageCircle, Mail, Clock, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { WHATSAPP } from "@/components/site/secoes";

export const metadata = {
  title: "Contato — NuvemPark",
  description:
    "Fale com a equipe do NuvemPark: tire dúvidas, peça uma demonstração ou comece hoje mesmo.",
};

export default function ContatoPage() {
  return (
    <>
      <PageHero
        chip="Contato"
        titulo={
          <>
            Fale com gente que já
            <br className="hidden sm:block" />{" "}
            <span className="texto-brand-gradiente">fechou caixa de pátio</span>
          </>
        }
        descricao="Sem robô, sem script de vendas. Você conta como opera hoje, a gente mostra funcionando — e você decide."
      />

      <section className="pb-24 bg-white">
        <div className="mx-auto max-w-4xl px-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <Reveal>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full rounded-2xl border border-borda bg-white p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-brand-300 hover:-translate-y-0.5 transition-all"
              >
                <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 group-hover:bg-gradient-to-br group-hover:from-brand-500 group-hover:to-acento-teal group-hover:text-white transition-all">
                  <MessageCircle className="w-6 h-6" />
                </span>
                <h2 className="mt-5 text-xl font-extrabold text-texto">
                  WhatsApp
                </h2>
                <p className="mt-2 text-sm text-texto-2 leading-relaxed">
                  O caminho mais rápido. Fale direto com quem entende do produto
                  — sem robô, sem fila.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700">
                  (81) 99614-2120
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </a>
            </Reveal>

            <Reveal delay={0.08}>
              <a
                href="mailto:contato@nuvempark.com"
                className="group block h-full rounded-2xl border border-borda bg-white p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-brand-300 hover:-translate-y-0.5 transition-all"
              >
                <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-info-bg text-ceu group-hover:bg-gradient-to-br group-hover:from-ceu group-hover:to-acento-teal group-hover:text-white transition-all">
                  <Mail className="w-6 h-6" />
                </span>
                <h2 className="mt-5 text-xl font-extrabold text-texto">
                  E-mail
                </h2>
                <p className="mt-2 text-sm text-texto-2 leading-relaxed">
                  Prefere escrever com calma? Envie sua dúvida ou pedido de
                  proposta por e-mail.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-ceu">
                  contato@nuvempark.com
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </a>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="mt-6">
            <div className="rounded-2xl border border-borda bg-fundo px-6 py-5 flex items-center gap-3">
              <Clock className="w-5 h-5 text-texto-3 shrink-0" />
              <p className="text-sm text-texto-2">
                Atendemos de <b className="text-texto">segunda a sexta, das 8h às 18h</b>.
                Mensagens fora do horário são respondidas no próximo dia útil.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
