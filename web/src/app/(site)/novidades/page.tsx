import {
  QrCode,
  Smartphone,
  FileSpreadsheet,
  Plug,
  Bell,
  CreditCard,
  Camera,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { CtaFinal } from "@/components/site/secoes";

export const metadata = {
  title: "Novidades — NuvemPark",
  description:
    "O NuvemPark evolui todo mês. Veja o que está em desenvolvimento e o que vem por aí — tudo incluso no seu plano, sem custo extra.",
};

type Item = {
  Icone: LucideIcon;
  titulo: string;
  resumo: string;
  status: "desenvolvimento" | "planejado";
  cor: string;
  fundo: string;
};

const ITENS: Item[] = [
  {
    Icone: CreditCard,
    titulo: "Pagamento por Pix integrado",
    resumo: "QR Code de pagamento direto no ticket, com confirmação automática.",
    status: "desenvolvimento",
    cor: "text-brand-600",
    fundo: "bg-brand-50",
  },
  {
    Icone: Smartphone,
    titulo: "App para o cliente final",
    resumo: "Seu cliente acompanha o ticket e paga pelo próprio celular.",
    status: "planejado",
    cor: "text-ceu",
    fundo: "bg-info-bg",
  },
  {
    Icone: FileSpreadsheet,
    titulo: "Exportação de relatórios",
    resumo: "Faturamento e movimentos em planilha, prontos para a contabilidade.",
    status: "desenvolvimento",
    cor: "text-violeta",
    fundo: "bg-violeta/10",
  },
  {
    Icone: Bell,
    titulo: "Alertas inteligentes",
    resumo: "Avisos de pátio lotado, caixa aberto há muito tempo e mais.",
    status: "planejado",
    cor: "text-ambar",
    fundo: "bg-aviso-bg",
  },
  {
    Icone: Camera,
    titulo: "Foto do veículo na entrada",
    resumo: "Registro visual de cada entrada para segurança e comprovação.",
    status: "desenvolvimento",
    cor: "text-brand-600",
    fundo: "bg-brand-50",
  },
  {
    Icone: QrCode,
    titulo: "Credenciais para eventos",
    resumo: "Venda e valide credenciais de estacionamento em eventos.",
    status: "planejado",
    cor: "text-ceu",
    fundo: "bg-info-bg",
  },
  {
    Icone: BarChart3,
    titulo: "Relatórios avançados",
    resumo: "Comparativos entre pátios, horários de pico e projeções.",
    status: "planejado",
    cor: "text-violeta",
    fundo: "bg-violeta/10",
  },
  {
    Icone: Plug,
    titulo: "Integrações via API",
    resumo: "Conecte o NuvemPark aos sistemas que você já usa.",
    status: "planejado",
    cor: "text-ambar",
    fundo: "bg-aviso-bg",
  },
];

const STATUS = {
  desenvolvimento: {
    rotulo: "Em desenvolvimento",
    cls: "bg-brand-50 text-brand-700 border-brand-200",
  },
  planejado: {
    rotulo: "Planejado",
    cls: "bg-violeta/10 text-violeta border-violeta/20",
  },
};

export default function NovidadesPage() {
  return (
    <>
      <PageHero
        chip="Novidades"
        chipCor="text-violeta"
        titulo={
          <>
            Seu plano fica melhor
            <br className="hidden sm:block" />{" "}
            <span className="texto-brand-gradiente">sem você pagar mais</span>
          </>
        }
        descricao="Todo recurso novo entra automaticamente na sua assinatura — sem upgrade, sem módulo extra, sem pegadinha. Um gostinho do que vem aí:"
      />

      <section className="pb-24 bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ITENS.map((item, i) => {
              const st = STATUS[item.status];
              return (
                <Reveal key={item.titulo} delay={(i % 4) * 0.08}>
                  <div className="h-full rounded-2xl border border-borda bg-white p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all flex flex-col">
                    <div className="flex items-start justify-between">
                      <span
                        className={`inline-grid place-items-center w-11 h-11 rounded-xl ${item.fundo} ${item.cor}`}
                      >
                        <item.Icone className="w-5 h-5" />
                      </span>
                    </div>
                    <h3 className="mt-4 font-extrabold text-texto leading-snug">
                      {item.titulo}
                    </h3>
                    <p className="mt-2 text-sm text-texto-2 leading-relaxed flex-1">
                      {item.resumo}
                    </p>
                    <span
                      className={`mt-4 inline-flex w-fit text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${st.cls}`}
                    >
                      {st.rotulo}
                    </span>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.2} className="mt-12 text-center">
            <p className="text-sm text-texto-3 max-w-lg mx-auto">
              Tem uma necessidade específica? Conta pra gente — o roadmap é
              guiado pelo que nossos clientes precisam.
            </p>
          </Reveal>
        </div>
      </section>

      <CtaFinal />
    </>
  );
}
