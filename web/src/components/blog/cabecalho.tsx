import { Reveal } from "@/components/site/reveal";
import { BuscaPosts } from "@/components/blog/busca";

/**
 * Cabeçalho das listagens do blog (home, categoria, busca).
 *
 * Faixa ESCURA editorial — a mesma linguagem do hero da landing e do CTA
 * final (#0B1220 → verde-noite), que é onde o site tem mais personalidade.
 * O header fixo flutua transparente por cima com texto claro (site-header
 * trata /blog como rota escura), então a seção sobe até o topo da página e
 * compensa a altura dele com pt-28/pt-32 — não usar wrapper com pt-16.
 */
export function CabecalhoBlog({
  chip,
  titulo,
  descricao,
  busca,
  mostrarBusca = true,
}: {
  chip: string;
  titulo: React.ReactNode;
  descricao: string;
  /** Termo já pesquisado, para o campo aparecer preenchido. */
  busca?: string;
  mostrarBusca?: boolean;
}) {
  return (
    <section
      className="relative overflow-hidden pt-28 pb-14 sm:pt-32 sm:pb-16"
      style={{
        background:
          "linear-gradient(165deg, #0B1220 0%, #10201A 55%, #0B1512 100%)",
      }}
    >
      {/* Malha sutil, como nas seções escuras da landing. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 75% 70% at 50% 10%, black 30%, transparent 75%)",
        }}
        aria-hidden
      />
      {/* Brilhos da marca. */}
      <div
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-brand-500/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -bottom-40 h-96 w-96 rounded-full bg-acento/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-3.5 py-1.5 text-[11px] font-black tracking-[0.16em] text-brand-400 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden />
            {chip}
          </span>
          <h1 className="mt-5 text-3xl leading-[1.08] font-black tracking-tight text-white sm:text-5xl">
            {titulo}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/65">
            {descricao}
          </p>
          {mostrarBusca ? <BuscaPosts inicial={busca} /> : null}
        </Reveal>
      </div>
    </section>
  );
}
