"use client";

import { useMemo } from "react";
import { Check, CircleAlert, X } from "lucide-react";
import { slugify } from "@/lib/slug";

/**
 * Checklist de SEO ao vivo. Sem biblioteca externa: são sete verificações
 * objetivas sobre o que já está na tela.
 *
 * Cada item vale um ponto; a nota é a fração aprovada. O objetivo NÃO é chegar
 * a 100% sempre — é o autor ver o que ficou de fora e decidir. Por isso todo
 * item traz o que fazer, não só o veredito.
 */

export type EntradaSeo = {
  titulo: string;
  resumo: string;
  conteudoMd: string;
  capaUrl: string | null;
  faqQtd: number;
  palavrasChave: string[];
};

type Item = {
  rotulo: string;
  ok: boolean;
  detalhe: string;
};

/** Primeiro parágrafo de verdade: pula títulos, listas, citações e código. */
function primeiroParagrafo(md: string): string {
  const linhas = md.split("\n");
  let dentroDeCodigo = false;
  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (/^(```|~~~)/.test(linha)) {
      dentroDeCodigo = !dentroDeCodigo;
      continue;
    }
    if (dentroDeCodigo || !linha) continue;
    if (/^(#{1,6}\s|[-*+]\s|>\s|\||\d+\.\s)/.test(linha)) continue;
    return linha;
  }
  return "";
}

/** Comparação sem acento e sem caixa — "gestão" casa com "Gestao". */
function contem(texto: string, termo: string): boolean {
  if (!termo.trim()) return false;
  return slugify(texto).includes(slugify(termo));
}

export function avaliarSeo(e: EntradaSeo): { itens: Item[]; nota: number } {
  const tituloLen = e.titulo.trim().length;
  const resumoLen = e.resumo.trim().length;
  const palavras = e.conteudoMd.trim().split(/\s+/).filter(Boolean).length;
  const h2 = (e.conteudoMd.match(/^\s{0,3}##\s+\S/gm) ?? []).length;
  const foco = e.palavrasChave[0] ?? "";
  const paragrafo = primeiroParagrafo(e.conteudoMd);

  const itens: Item[] = [
    {
      rotulo: "Título entre 30 e 60 caracteres",
      ok: tituloLen >= 30 && tituloLen <= 60,
      detalhe:
        tituloLen === 0
          ? "Sem título."
          : tituloLen < 30
            ? `${tituloLen} — curto demais para o Google entender o assunto.`
            : tituloLen > 60
              ? `${tituloLen} — vai ser cortado no resultado de busca.`
              : `${tituloLen} caracteres.`,
    },
    {
      rotulo: "Resumo entre 140 e 160 caracteres",
      ok: resumoLen >= 140 && resumoLen <= 160,
      detalhe:
        resumoLen === 0
          ? "Sem resumo — é ele que vira a meta description."
          : `${resumoLen} caracteres.`,
    },
    {
      rotulo: "Tem imagem de capa",
      ok: !!e.capaUrl,
      detalhe: e.capaUrl
        ? "A capa também vira a imagem de compartilhamento."
        : "Sem capa, o compartilhamento usa a imagem gerada automaticamente.",
    },
    {
      rotulo: "Tem ao menos um título de seção (H2)",
      ok: h2 >= 1,
      detalhe:
        h2 === 0
          ? "Quebre o texto em seções com ##."
          : `${h2} ${h2 === 1 ? "seção" : "seções"}.`,
    },
    {
      rotulo: "Tem perguntas frequentes",
      ok: e.faqQtd >= 1,
      detalhe:
        e.faqQtd === 0
          ? "O FAQ vira schema FAQPage e disputa espaço nas respostas do Google."
          : `${e.faqQtd} ${e.faqQtd === 1 ? "pergunta" : "perguntas"}.`,
    },
    {
      rotulo: "Palavra-chave no título e no 1º parágrafo",
      ok: !!foco && contem(e.titulo, foco) && contem(paragrafo, foco),
      detalhe: !foco
        ? "Cadastre ao menos uma palavra-chave."
        : !contem(e.titulo, foco)
          ? `"${foco}" não aparece no título.`
          : !contem(paragrafo, foco)
            ? `"${foco}" não aparece no primeiro parágrafo.`
            : `"${foco}" está nos dois.`,
    },
    {
      rotulo: "Pelo menos 600 palavras",
      ok: palavras >= 600,
      detalhe:
        palavras >= 600
          ? `${palavras} palavras.`
          : `${palavras} — faltam ${600 - palavras} para o texto competir bem.`,
    },
  ];

  const aprovados = itens.filter((i) => i.ok).length;
  return { itens, nota: aprovados / itens.length };
}

export function PainelSeo({ entrada }: { entrada: EntradaSeo }) {
  const { itens, nota } = useMemo(() => avaliarSeo(entrada), [entrada]);

  const pct = Math.round(nota * 100);
  const cor =
    nota >= 0.8
      ? { txt: "text-brand-700", bg: "bg-brand-500", chip: "bg-brand-50 text-brand-700 border-brand-200", rotulo: "Bom" }
      : nota >= 0.5
        ? { txt: "text-aviso", bg: "bg-aviso", chip: "bg-aviso-bg text-aviso border-aviso/25", rotulo: "Dá para melhorar" }
        : { txt: "text-perigo", bg: "bg-perigo", chip: "bg-perigo-bg text-perigo border-perigo/20", rotulo: "Fraco" };

  return (
    <section className="rounded-2xl border border-borda bg-superficie p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-extrabold">Checklist de SEO</h2>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${cor.chip}`}
        >
          {cor.rotulo} · {pct}%
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fundo">
        <div
          className={`h-full rounded-full transition-all duration-300 ${cor.bg}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2.5">
        {itens.map((i) => (
          <li key={i.rotulo} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                i.ok ? "bg-brand-50 text-brand-600" : "bg-fundo text-texto-3"
              }`}
            >
              {i.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </span>
            <div className="min-w-0">
              <p
                className={`text-[13px] font-bold ${i.ok ? "text-texto" : "text-texto-2"}`}
              >
                {i.rotulo}
              </p>
              <p className="text-[12px] leading-snug text-texto-3">{i.detalhe}</p>
            </div>
          </li>
        ))}
      </ul>

      {nota < 1 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-info-bg p-3 text-[12px] leading-snug text-texto-2">
          <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-info" />
          Nada aqui bloqueia a publicação. É um lembrete do que costuma pesar no
          ranqueamento — você decide o que vale para este post.
        </p>
      )}
    </section>
  );
}
