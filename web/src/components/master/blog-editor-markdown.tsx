"use client";

import { useRef, useState } from "react";
import {
  Bold,
  Code2,
  Eye,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  PanelsTopBottom,
  Pencil,
} from "lucide-react";
import { ConteudoMarkdown } from "@/components/blog/markdown";

/**
 * Editor de Markdown com preview lado a lado.
 *
 * O preview usa o MESMO <ConteudoMarkdown /> das páginas públicas — não é uma
 * reimplementação "parecida". O que aparece aqui é literalmente o componente
 * que vai renderizar o post no /blog, então tipografia, tabela, citação e
 * âncoras de título saem idênticas.
 *
 * Em telas estreitas o split vira abas (escrever / visualizar): duas colunas
 * de texto longo em 400px não servem para nada.
 */

type Modo = "split" | "escrever" | "visualizar";

/** Um botão da barra: envolve a seleção ou insere um prefixo de linha. */
type Ferramenta = {
  Icone: typeof Bold;
  titulo: string;
  /** Texto antes/depois da seleção (negrito, link, código inline). */
  volta?: [string, string];
  /** Prefixo aplicado no começo da linha (títulos, lista). */
  prefixo?: string;
  /** Texto usado quando não há nada selecionado. */
  exemplo: string;
};

const FERRAMENTAS: Ferramenta[] = [
  { Icone: Heading2, titulo: "Título de seção (H2)", prefixo: "## ", exemplo: "Título da seção" },
  { Icone: Heading3, titulo: "Subtítulo (H3)", prefixo: "### ", exemplo: "Subtítulo" },
  { Icone: Bold, titulo: "Negrito", volta: ["**", "**"], exemplo: "texto em negrito" },
  { Icone: Italic, titulo: "Itálico", volta: ["*", "*"], exemplo: "texto em itálico" },
  { Icone: Link2, titulo: "Link", volta: ["[", "](https://)"], exemplo: "texto do link" },
  { Icone: List, titulo: "Lista", prefixo: "- ", exemplo: "item da lista" },
  { Icone: Code2, titulo: "Código", volta: ["`", "`"], exemplo: "codigo" },
  { Icone: ImageIcon, titulo: "Imagem", volta: ["![", "](https://)"], exemplo: "descrição da imagem" },
];

export function EditorMarkdown({
  valor,
  aoMudar,
}: {
  valor: string;
  aoMudar: (novo: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [modo, setModo] = useState<Modo>("split");

  /** Aplica a ferramenta na seleção atual e devolve o cursor para o texto. */
  function aplicar(f: Ferramenta) {
    const el = ref.current;
    if (!el) return;

    const inicio = el.selectionStart;
    const fim = el.selectionEnd;
    const selecionado = valor.slice(inicio, fim) || f.exemplo;

    let novoTexto: string;
    let novoInicio: number;
    let novoFim: number;

    if (f.prefixo) {
      // Prefixo de linha: sobe até o começo da linha onde o cursor está.
      const comecoLinha = valor.lastIndexOf("\n", inicio - 1) + 1;
      const jaTem = valor.slice(comecoLinha).startsWith(f.prefixo);
      if (jaTem) {
        // Segundo clique remove o prefixo (alterna).
        novoTexto =
          valor.slice(0, comecoLinha) +
          valor.slice(comecoLinha + f.prefixo.length);
        novoInicio = Math.max(comecoLinha, inicio - f.prefixo.length);
        novoFim = Math.max(comecoLinha, fim - f.prefixo.length);
      } else {
        novoTexto =
          valor.slice(0, comecoLinha) + f.prefixo + valor.slice(comecoLinha);
        novoInicio = inicio + f.prefixo.length;
        novoFim = fim + f.prefixo.length;
      }
    } else if (f.volta) {
      const [antes, depois] = f.volta;
      novoTexto =
        valor.slice(0, inicio) + antes + selecionado + depois + valor.slice(fim);
      novoInicio = inicio + antes.length;
      novoFim = novoInicio + selecionado.length;
    } else {
      return;
    }

    aoMudar(novoTexto);
    // O textarea só tem o valor novo depois do re-render; por isso o rAF.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(novoInicio, novoFim);
    });
  }

  const palavras = valor.trim().split(/\s+/).filter(Boolean).length;

  const abaCls = (m: Modo) =>
    `inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold transition-colors ${
      modo === m
        ? "bg-brand-600 text-white"
        : "text-texto-2 hover:bg-fundo hover:text-texto"
    }`;

  return (
    <div className="overflow-hidden rounded-2xl border border-borda bg-superficie">
      {/* ── Barra de ferramentas ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 border-b border-borda bg-fundo px-2 py-2">
        {FERRAMENTAS.map((f) => (
          <button
            key={f.titulo}
            type="button"
            title={f.titulo}
            aria-label={f.titulo}
            onClick={() => aplicar(f)}
            className="grid h-8 w-8 place-items-center rounded-lg text-texto-2 transition-colors hover:bg-superficie hover:text-brand-700"
          >
            <f.Icone className="h-4 w-4" />
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <span className="mr-2 hidden text-[11px] font-semibold text-texto-3 sm:inline">
            {palavras} {palavras === 1 ? "palavra" : "palavras"}
          </span>
          <button type="button" onClick={() => setModo("escrever")} className={abaCls("escrever")}>
            <Pencil className="h-3.5 w-3.5" />
            Escrever
          </button>
          <button
            type="button"
            onClick={() => setModo("split")}
            className={`${abaCls("split")} hidden lg:inline-flex`}
          >
            <PanelsTopBottom className="h-3.5 w-3.5" />
            Lado a lado
          </button>
          <button type="button" onClick={() => setModo("visualizar")} className={abaCls("visualizar")}>
            <Eye className="h-3.5 w-3.5" />
            Visualizar
          </button>
        </div>
      </div>

      {/* ── Painéis ─────────────────────────────────────────────────── */}
      <div
        className={
          modo === "split"
            ? "grid lg:grid-cols-2 lg:divide-x lg:divide-borda"
            : "block"
        }
      >
        {modo !== "visualizar" && (
          <textarea
            ref={ref}
            value={valor}
            onChange={(e) => aoMudar(e.target.value)}
            spellCheck
            placeholder={"Escreva em Markdown.\n\n## Um título de seção\n\nUm parágrafo."}
            className="block min-h-[520px] w-full resize-y bg-superficie px-5 py-4 font-mono text-[13.5px] leading-[1.7] text-texto placeholder:text-texto-3 focus:outline-none"
          />
        )}

        {modo !== "escrever" && (
          <div className="min-h-[520px] overflow-x-auto bg-superficie px-5 py-2">
            {valor.trim() ? (
              <ConteudoMarkdown markdown={valor} />
            ) : (
              <p className="py-16 text-center text-sm text-texto-3">
                O preview aparece aqui conforme você escreve.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
