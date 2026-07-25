import { ArrowRight, Sparkles } from "lucide-react";
import { urlApp } from "@/lib/urls";

/**
 * Os três pontos de conversão do blog. Todos apontam para /cadastro (trial de
 * 15 dias) e todos são Server Components — não custam JavaScript no cliente.
 */

/** Barra discreta no topo da home do blog. */
export function BarraTrial() {
  return (
    <div className="border-b border-brand-100 bg-brand-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-2.5 text-center">
        <span className="text-[13px] font-semibold text-brand-900">
          Gestão de pátio em tempo real, do celular que a sua equipe já tem.
        </span>
        <a
          href={urlApp("/cadastro")}
          className="inline-flex items-center gap-1 text-[13px] font-black text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-4 transition-colors hover:text-brand-800"
        >
          Testar grátis por 15 dias
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}

/**
 * CTA inline, no meio dos posts longos. Visualmente mais leve que o banner do
 * fim para não cortar a leitura — é um aparte, não uma parada.
 */
export function CtaInline() {
  return (
    <aside className="my-10 rounded-2xl border border-brand-200 bg-brand-50/70 p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl bg-brand-600 shadow-brand">
          <Sparkles className="h-4.5 w-4.5 text-white" aria-hidden />
        </span>
        <div>
          <p className="text-base font-extrabold text-texto">
            Quer ver isso funcionando no seu pátio?
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-texto-2">
            O NuvemPark registra entrada e saída, calcula a tarifa e mostra o
            faturamento ao vivo — sem cancela, sem obra e sem cartão de crédito
            para começar.
          </p>
          <a
            href={urlApp("/cadastro")}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white shadow-brand transition-all hover:brightness-110"
          >
            Criar conta grátis
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </aside>
  );
}

/** Banner do fim do post — o ponto de conversão principal. */
export function CtaFimDePost() {
  return (
    <aside className="relative mt-14 overflow-hidden rounded-3xl bg-noite p-8 sm:p-10">
      <div
        className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -bottom-24 h-64 w-64 rounded-full bg-acento/10 blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <p className="text-[11px] font-black tracking-[0.16em] text-brand-400 uppercase">
          Teste grátis
        </p>
        <p className="mt-3 text-2xl leading-tight font-black tracking-tight text-white sm:text-3xl">
          Teste o NuvemPark grátis por 15 dias
        </p>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-base">
          Cadastre seu pátio, chame a equipe e comece a operar hoje. Sem cartão
          de crédito, sem instalação e sem vendedor no meio do caminho.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href={urlApp("/cadastro")}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-800 px-7 text-[15px] font-bold text-white shadow-brand transition-all hover:brightness-110"
          >
            Começar agora
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <a
            href="/precos"
            className="inline-flex h-12 items-center rounded-xl border border-white/20 bg-white/5 px-7 text-[15px] font-bold text-white/85 transition-colors hover:border-white/40 hover:text-white"
          >
            Ver preços
          </a>
        </div>
      </div>
    </aside>
  );
}
