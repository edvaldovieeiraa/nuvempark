import { ChevronDown } from "lucide-react";
import type { BlogFaqItem } from "@/lib/blog";

/**
 * FAQ do post. Usa `<details>/<summary>` nativos: acordeão acessível por
 * teclado, funcional sem JavaScript, e cujo conteúdo o Google indexa mesmo
 * fechado — que é justamente o ponto do schema FAQPage que acompanha a página.
 */
export function FaqPost({ itens }: { itens: BlogFaqItem[] }) {
  if (itens.length === 0) return null;

  return (
    <section className="mt-14" aria-labelledby="faq-titulo">
      <h2
        id="faq-titulo"
        className="text-2xl font-black tracking-tight text-texto"
      >
        Perguntas frequentes
      </h2>

      <div className="mt-5 space-y-3">
        {itens.map((item) => (
          <details
            key={item.pergunta}
            className="group overflow-hidden rounded-2xl border border-borda bg-superficie transition-colors open:border-brand-200 hover:border-brand-200"
          >
            <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4 text-[15px] font-bold text-texto marker:content-none [&::-webkit-details-marker]:hidden">
              <ChevronDown
                className="mt-0.5 h-4.5 w-4.5 flex-none text-brand-600 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
              {item.pergunta}
            </summary>
            <div className="px-5 pt-0 pb-5 pl-[3.25rem] text-[15px] leading-relaxed text-texto-2">
              {item.resposta}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
