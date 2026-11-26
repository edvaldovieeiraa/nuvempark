"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { Cog, Loader2, Mail, MessageCircle, Phone, StickyNote, Users, type LucideIcon } from "lucide-react";
import { carregarLinhaDoTempo } from "@/app/master/(console)/crm/actions";
import { ROTULO_TIPO } from "@/lib/crm/rotulos";
import type { InteracaoCrm, TipoInteracao } from "@/lib/crm/tipos";
import { formatarDataHora } from "@/lib/format-data";
import { BTN_PEQUENO, ERRO, SECAO_TITULO } from "@/components/master/crm/estilos";

const ICONE: Record<TipoInteracao, LucideIcon> = {
  nota: StickyNote,
  ligacao: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  reuniao: Users,
  sistema: Cog,
};

type Estado =
  | { fase: "carregando" }
  | { fase: "erro"; msg: string }
  | { fase: "pronto"; itens: InteracaoCrm[]; temMais: boolean };

/**
 * Linha do tempo do lead, 20 por vez, da mais nova para a mais antiga
 * (req. 14). Carrega ao montar: quem muda o histórico remonta este
 * componente com outra `key` (o `revalidatePath` não chega aqui, que é
 * buscado pelo navegador). Itens `sistema` ficam discretos.
 */
export function LinhaDoTempo({ leadId }: { leadId: string }) {
  const id = useId();
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [maisErro, setMaisErro] = useState<string | null>(null);
  const [carregandoMais, comecar] = useTransition();

  useEffect(() => {
    let vivo = true;
    carregarLinhaDoTempo(leadId)
      .then((r) => {
        if (!vivo) return;
        setEstado(r.ok ? { fase: "pronto", itens: r.itens, temMais: r.temMais } : { fase: "erro", msg: r.msg });
      })
      .catch(() => {
        if (vivo) setEstado({ fase: "erro", msg: "Não foi possível carregar a linha do tempo." });
      });
    return () => {
      vivo = false;
    };
  }, [leadId]);

  function verAnteriores() {
    if (estado.fase !== "pronto" || estado.itens.length === 0) return;
    const ultimo = estado.itens[estado.itens.length - 1];
    const depoisDe = { criadoEm: ultimo.criadoEm, id: ultimo.id };
    setMaisErro(null);
    comecar(async () => {
      const r = await carregarLinhaDoTempo(leadId, depoisDe);
      if (!r.ok) {
        setMaisErro(r.msg);
        return;
      }
      setEstado((atual) => {
        if (atual.fase !== "pronto") return atual;
        const vistos = new Set(atual.itens.map((i) => i.id));
        return {
          fase: "pronto",
          itens: [...atual.itens, ...r.itens.filter((i) => !vistos.has(i.id))],
          temMais: r.temMais,
        };
      });
    });
  }

  return (
    <section aria-labelledby={`${id}-titulo`} aria-busy={estado.fase === "carregando" || undefined} className="flex flex-col gap-2">
      <h3 id={`${id}-titulo`} className={SECAO_TITULO}>
        Linha do tempo
      </h3>

      {estado.fase === "carregando" && (
        <ul aria-hidden className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-14 rounded-xl bg-fundo animate-pulse" />
          ))}
        </ul>
      )}

      {estado.fase === "erro" && (
        <p role="alert" className={ERRO}>
          {estado.msg}
        </p>
      )}

      {estado.fase === "pronto" &&
        (estado.itens.length === 0 ? (
          <p className="text-sm text-texto-2">Nenhuma interação ainda.</p>
        ) : (
          <>
            <ol className="flex flex-col">
              {estado.itens.map((it, i) => {
                const Icone = ICONE[it.tipo];
                const sistema = it.tipo === "sistema";
                return (
                  <li key={it.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < estado.itens.length - 1 && (
                      <span aria-hidden className="absolute left-[15px] top-8 bottom-0 w-px bg-borda" />
                    )}
                    <span
                      aria-hidden
                      className={`relative shrink-0 w-8 h-8 rounded-full grid place-items-center ${
                        sistema ? "bg-fundo text-texto-2" : "bg-brand-50 text-brand-700"
                      }`}
                    >
                      <Icone className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-xs text-texto-2">
                        <b className={sistema ? "font-semibold" : "font-bold text-texto"}>{ROTULO_TIPO[it.tipo]}</b>
                        {" · "}
                        <time dateTime={it.criadoEm}>{formatarDataHora(it.criadoEm)}</time>
                      </p>
                      <p
                        className={`mt-0.5 whitespace-pre-wrap break-words ${
                          sistema ? "text-xs text-texto-2 italic" : "text-sm text-texto leading-relaxed"
                        }`}
                      >
                        {it.texto}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            {maisErro && (
              <p role="alert" className={ERRO}>
                {maisErro}
              </p>
            )}
            {estado.temMais && (
              <div>
                <button type="button" onClick={verAnteriores} disabled={carregandoMais} className={BTN_PEQUENO}>
                  {carregandoMais && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                  Ver anteriores
                </button>
              </div>
            )}
          </>
        ))}
    </section>
  );
}
