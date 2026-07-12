import { Reveal } from "@/components/site/reveal";

/** Cabeçalho padrão das páginas internas do site. */
export function PageHero({
  chip,
  titulo,
  descricao,
  chipCor = "text-brand-600",
}: {
  chip: string;
  titulo: React.ReactNode;
  descricao: string;
  chipCor?: string;
}) {
  return (
    <section className="relative overflow-hidden fundo-mesh pt-32 pb-14 sm:pt-36 sm:pb-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(16,27,20,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,27,20,0.03) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 text-center">
        <Reveal>
          <span
            className={`text-xs font-black uppercase tracking-[0.16em] ${chipCor}`}
          >
            {chip}
          </span>
          <h1 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight text-texto leading-[1.08]">
            {titulo}
          </h1>
          <p className="mt-5 text-lg text-texto-2 max-w-2xl mx-auto leading-relaxed">
            {descricao}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
