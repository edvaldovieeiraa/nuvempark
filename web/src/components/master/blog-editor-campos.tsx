"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  HelpCircle,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { enviarCapa, type FaqItem } from "@/app/master/(console)/blog/actions";
import { useToast } from "@/components/ui/toast";
import { Campo, Input } from "@/components/ui/campos";

/** Campos compostos do editor: FAQ, palavras-chave e capa. */

const TEXTAREA =
  "w-full rounded-xl border border-borda bg-superficie px-3.5 py-2.5 text-sm " +
  "placeholder:text-texto-3 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 focus:outline-none";

// ═════════════════════════════════════════════════════════════════════ FAQ ══

/**
 * Lista dinâmica de pares pergunta/resposta.
 *
 * Alimenta o `faq` (jsonb) do post, que vira o schema FAQPage na página
 * pública — é o bloco que o Google usa para responder direto no resultado.
 * A ordem importa: é a ordem em que as perguntas aparecem no post.
 */
export function EditorFaq({
  itens,
  aoMudar,
}: {
  itens: FaqItem[];
  aoMudar: (novos: FaqItem[]) => void;
}) {
  function atualizar(i: number, campo: keyof FaqItem, valor: string) {
    aoMudar(itens.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)));
  }

  function mover(i: number, delta: number) {
    const destino = i + delta;
    if (destino < 0 || destino >= itens.length) return;
    const copia = [...itens];
    [copia[i], copia[destino]] = [copia[destino], copia[i]];
    aoMudar(copia);
  }

  return (
    <section className="rounded-2xl border border-borda bg-superficie p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-extrabold">Perguntas frequentes</h2>
          <p className="text-[12px] text-texto-2">
            Viram o acordeão no fim do post e o schema FAQPage.
          </p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50">
          <HelpCircle className="h-4 w-4 text-brand-600" />
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {itens.map((item, i) => (
          <div
            key={i}
            className="rounded-xl border border-borda bg-fundo/50 p-3.5"
          >
            <div className="mb-2 flex items-center gap-1">
              <span className="text-[11px] font-black text-texto-3">
                #{i + 1}
              </span>
              <div className="ml-auto flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  aria-label="Subir pergunta"
                  className="grid h-7 w-7 place-items-center rounded-lg text-texto-3 hover:bg-superficie hover:text-texto disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, 1)}
                  disabled={i === itens.length - 1}
                  aria-label="Descer pergunta"
                  className="grid h-7 w-7 place-items-center rounded-lg text-texto-3 hover:bg-superficie hover:text-texto disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => aoMudar(itens.filter((_, idx) => idx !== i))}
                  aria-label="Remover pergunta"
                  className="grid h-7 w-7 place-items-center rounded-lg text-texto-3 hover:bg-perigo-bg hover:text-perigo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <Input
              value={item.pergunta}
              onChange={(e) => atualizar(i, "pergunta", e.target.value)}
              placeholder="Como saber quanto o estacionamento faturou hoje?"
              maxLength={200}
              aria-label={`Pergunta ${i + 1}`}
            />
            <textarea
              value={item.resposta}
              onChange={(e) => atualizar(i, "resposta", e.target.value)}
              placeholder="Resposta curta e completa, em 2 a 4 frases."
              maxLength={700}
              rows={3}
              aria-label={`Resposta ${i + 1}`}
              className={`${TEXTAREA} mt-2`}
            />
          </div>
        ))}

        {itens.length === 0 && (
          <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-[13px] text-texto-2">
            Nenhuma pergunta. Duas a quatro boas perguntas costumam render mais
            que uma lista longa.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => aoMudar([...itens, { pergunta: "", resposta: "" }])}
        className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl border border-borda bg-superficie px-4 text-sm font-bold text-texto-2 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
      >
        <Plus className="h-4 w-4" />
        Adicionar pergunta
      </button>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════ Palavras-chave ══

/**
 * Chips de palavras-chave. A PRIMEIRA é a de foco: é ela que o checklist de
 * SEO procura no título e no primeiro parágrafo.
 */
export function ChipsPalavrasChave({
  valores,
  aoMudar,
}: {
  valores: string[];
  aoMudar: (novos: string[]) => void;
}) {
  const [rascunho, setRascunho] = useState("");

  function adicionar() {
    const nova = rascunho.trim();
    if (!nova) return;
    if (valores.some((v) => v.toLowerCase() === nova.toLowerCase())) {
      setRascunho("");
      return;
    }
    aoMudar([...valores, nova]);
    setRascunho("");
  }

  return (
    <div>
      <label
        htmlFor="palavra-chave"
        className="mb-1.5 block text-xs font-bold text-texto-2"
      >
        Palavras-chave{" "}
        <span className="font-semibold text-texto-3">
          (a 1ª é a de foco do checklist)
        </span>
      </label>

      {valores.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {valores.map((v, i) => (
            <span
              key={v}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-bold ${
                i === 0
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-borda bg-fundo text-texto-2"
              }`}
            >
              {v}
              <button
                type="button"
                onClick={() => aoMudar(valores.filter((_, idx) => idx !== i))}
                aria-label={`Remover ${v}`}
                className="text-texto-3 transition-colors hover:text-perigo"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          id="palavra-chave"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            // Enter adiciona sem submeter o formulário inteiro.
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder="controle de faturamento estacionamento"
          maxLength={80}
        />
        <button
          type="button"
          onClick={adicionar}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-borda bg-superficie px-3.5 text-sm font-bold text-texto-2 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════ Capa ══

/**
 * Capa do post: upload para o bucket `blog-assets` ou URL colada à mão.
 *
 * O upload passa por uma Server Action (admin client) — o bucket não tem
 * policy de escrita, então não existe caminho pelo navegador.
 */
export function CampoCapa({
  url,
  aoMudar,
}: {
  url: string | null;
  aoMudar: (nova: string | null) => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, comecar] = useTransition();

  function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    comecar(async () => {
      const fd = new FormData();
      fd.set("arquivo", arquivo);
      const r = await enviarCapa(fd);
      if (r.ok) {
        aoMudar(r.url);
        toast.sucesso("Capa enviada.");
      } else {
        toast.erro("Falha no upload", r.msg);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="space-y-2">
      <Campo label="Capa (1200×630 ou 16:9)">
        <Input
          type="url"
          value={url ?? ""}
          onChange={(e) => aoMudar(e.target.value || null)}
          placeholder="https://... (ou envie um arquivo abaixo)"
        />
      </Campo>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          onChange={(e) => escolher(e.target.files?.[0])}
          className="hidden"
          id="capa-arquivo"
        />
        <button
          type="button"
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-borda bg-superficie px-4 text-sm font-bold text-texto-2 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60"
        >
          {enviando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {enviando ? "Enviando..." : "Enviar imagem"}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => aoMudar(null)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-texto-2 transition-colors hover:bg-perigo-bg hover:text-perigo"
          >
            <Trash2 className="h-4 w-4" />
            Remover
          </button>
        )}
        <span className="text-[11px] text-texto-3">JPG, PNG, WebP · até 5 MB</span>
      </div>

      {url && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-borda bg-fundo">
          {/* `unoptimized`: a capa pode ser uma URL colada de qualquer host, e
              o next/image só otimiza os hosts liberados em remotePatterns.
              Aqui é só a miniatura do editor — a página pública usa <Image>
              otimizado porque lá a capa vem do nosso Storage. */}
          <Image
            src={url}
            alt="Pré-visualização da capa"
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}
