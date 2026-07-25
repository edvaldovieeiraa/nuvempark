import { Reveal } from "@/components/site/reveal";
import { BuscaPosts } from "@/components/blog/busca";

/**
 * Cabeçalho das telas do blog (home, categoria, busca).
 *
 * Mesma linguagem visual do `PageHero` do site institucional — malha sutil e
 * fundo mesh —, mas com o campo de busca e sem o `pt-32`: as páginas do blog
 * já compensam o header fixo no wrapper, porque a barra de trial entra antes.
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
    <section className="fundo-mesh relative overflow-hidden border-b border-borda pt-14 pb-12 sm:pt-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(16,27,20,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,27,20,0.03) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 75%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-5 text-center">
        <Reveal>
          <span className="text-xs font-black tracking-[0.16em] text-brand-600 uppercase">
            {chip}
          </span>
          <h1 className="mt-3 text-3xl leading-[1.08] font-black tracking-tight text-texto sm:text-5xl">
            {titulo}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-texto-2">
            {descricao}
          </p>
          {mostrarBusca ? <BuscaPosts inicial={busca} /> : null}
        </Reveal>
      </div>
    </section>
  );
}
