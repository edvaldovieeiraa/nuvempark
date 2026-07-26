import Image from "next/image";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify } from "@/lib/slug";

/**
 * Renderização do Markdown dos posts — 100% no servidor (Server Component).
 * Nada de `dangerouslySetInnerHTML`: o react-markdown monta a árvore React e,
 * sem `rehype-raw`, HTML cru dentro do post é ignorado em vez de executado.
 *
 * Não usamos o plugin @tailwindcss/typography (não está no projeto): cada
 * elemento recebe classes explícitas com os tokens do design system, o que dá
 * controle total sobre a tipografia da leitura longa.
 */

/** Host do Storage do Supabase — as capas e imagens nossas moram aqui. */
const HOST_SUPABASE = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
  } catch {
    return "";
  }
})();

/**
 * `next/image` só aceita hosts declarados em `images.remotePatterns` — uma
 * imagem de host arbitrário dentro do Markdown quebraria a página inteira em
 * runtime. Então otimizamos o que é nosso e caímos em `<img>` no resto.
 */
function podeOtimizar(src: string): boolean {
  if (src.startsWith("/")) return true;
  if (!HOST_SUPABASE) return false;
  try {
    return new URL(src).host === HOST_SUPABASE;
  } catch {
    return false;
  }
}

/** Texto puro de uma subárvore React — base do id das âncoras dos títulos. */
function textoDe(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textoDe).join("");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props;
    return textoDe(props?.children);
  }
  return "";
}

/**
 * Corta o Markdown em duas metades no `##` mais próximo do meio, para o CTA
 * inline entrar entre elas sem cair no meio de um parágrafo.
 *
 * Respeita blocos de código: uma linha `## isto é comentário` dentro de ```…```
 * não conta como título. Devolve `null` quando o post é curto demais para
 * valer um corte.
 *
 * 450 palavras ≈ 2 min de leitura. Acima disso já existe "meio do post" para
 * o CTA ocupar; abaixo, ele interromperia um texto que o leitor termina numa
 * sentada. O limite era 600 e deixava de fora posts de 3 min inteiros.
 */
export function dividirMarkdown(
  markdown: string,
  minimoPalavras = 450,
): [string, string] | null {
  const palavras = markdown.trim().split(/\s+/).filter(Boolean).length;
  if (palavras < minimoPalavras) return null;

  const linhas = markdown.split("\n");
  const candidatos: number[] = [];
  let dentroDeCodigo = false;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (/^\s{0,3}(```|~~~)/.test(linha)) {
      dentroDeCodigo = !dentroDeCodigo;
      continue;
    }
    if (dentroDeCodigo) continue;
    if (/^\s{0,3}##\s+\S/.test(linha)) candidatos.push(i);
  }

  // Precisa sobrar conteúdo dos dois lados: ignora o primeiro e o último título.
  const uteis = candidatos.filter(
    (i) => i > 0 && i < linhas.length - 3,
  );
  if (uteis.length < 2) return null;

  const meio = linhas.length / 2;
  const corte = uteis.reduce((melhor, atual) =>
    Math.abs(atual - meio) < Math.abs(melhor - meio) ? atual : melhor,
  );

  return [
    linhas.slice(0, corte).join("\n").trim(),
    linhas.slice(corte).join("\n").trim(),
  ];
}

/**
 * H2s do post (fora de blocos de código) — alimentam o sumário "Neste artigo".
 * O id sai do MESMO slugify que o renderizador usa nas âncoras dos títulos,
 * então cada link do sumário aponta para um id que existe de fato na página.
 */
export function extrairTitulos(
  markdown: string,
): { id: string; texto: string }[] {
  const titulos: { id: string; texto: string }[] = [];
  let dentroDeCodigo = false;

  for (const linha of markdown.split("\n")) {
    if (/^\s{0,3}(```|~~~)/.test(linha)) {
      dentroDeCodigo = !dentroDeCodigo;
      continue;
    }
    if (dentroDeCodigo) continue;

    const m = linha.match(/^\s{0,3}##\s+(.+?)\s*$/);
    if (!m) continue;
    // Tira a marcação inline (negrito/itálico/código) para casar com o texto
    // renderizado, que é o que a âncora do título usa.
    const texto = m[1].replace(/[*_`]/g, "").trim();
    const id = slugify(texto);
    if (id) titulos.push({ id, texto });
  }

  return titulos;
}

// ── Estilos de prosa ────────────────────────────────────────────────────────

const CLS_TEXTO = "text-[17px] leading-[1.75] text-texto-2";

function Titulo({
  nivel,
  children,
}: {
  nivel: 2 | 3;
  children: React.ReactNode;
}) {
  const id = slugify(textoDe(children));
  const Tag = nivel === 2 ? "h2" : "h3";
  const classe =
    nivel === 2
      ? "group scroll-mt-28 mt-14 mb-4 text-2xl sm:text-[28px] font-black tracking-tight text-texto leading-tight"
      : "group scroll-mt-28 mt-10 mb-3 text-lg sm:text-xl font-extrabold tracking-tight text-texto";

  return (
    <Tag id={id || undefined} className={classe}>
      {children}
      {id ? (
        <a
          href={`#${id}`}
          aria-label={`Link para a seção ${textoDe(children)}`}
          className="ml-2 align-middle text-brand-400 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 no-underline"
        >
          #
        </a>
      ) : null}
    </Tag>
  );
}

const componentes: Components = {
  h1: ({ children }) => <Titulo nivel={2}>{children}</Titulo>, // H1 é o título do post
  h2: ({ children }) => <Titulo nivel={2}>{children}</Titulo>,
  h3: ({ children }) => <Titulo nivel={3}>{children}</Titulo>,
  h4: ({ children }) => (
    <h4 className="mt-8 mb-2 text-base font-extrabold text-texto">{children}</h4>
  ),

  p: ({ children }) => <p className={`my-5 ${CLS_TEXTO}`}>{children}</p>,

  a: ({ children, href }) => {
    const externo = !!href && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        target={externo ? "_blank" : undefined}
        rel={externo ? "noopener noreferrer" : undefined}
        className="font-semibold text-brand-700 underline decoration-brand-200 decoration-2 underline-offset-4 transition-colors hover:decoration-brand-600"
      >
        {children}
      </a>
    );
  },

  strong: ({ children }) => (
    <strong className="font-bold text-texto">{children}</strong>
  ),

  ul: ({ children }) => (
    <ul className="my-5 list-disc space-y-2 pl-6 marker:text-brand-500">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-5 list-decimal space-y-2 pl-6 marker:font-bold marker:text-brand-600">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className={CLS_TEXTO}>{children}</li>,

  blockquote: ({ children }) => (
    <blockquote className="my-7 rounded-r-2xl border-l-4 border-brand-400 bg-brand-50 px-5 py-4 text-[17px] leading-relaxed font-medium text-brand-900 [&>p]:my-0 [&>p]:text-brand-900">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="my-12 border-0 border-t border-borda" />,

  pre: ({ children }) => (
    <pre className="my-7 overflow-x-auto rounded-2xl border border-noite-3 bg-noite p-5 text-[13.5px] leading-relaxed text-white/85">
      {children}
    </pre>
  ),

  code: ({ children, className }) => {
    // react-markdown v10 não passa mais a prop `inline`: bloco cercado vem com
    // `language-*`; bloco indentado vem sem classe mas com quebra de linha.
    const ehBloco =
      (className?.includes("language-") ?? false) ||
      String(children).includes("\n");

    if (ehBloco) {
      return <code className="font-mono">{children}</code>;
    }
    return (
      <code className="rounded-md border border-borda bg-fundo px-1.5 py-0.5 font-mono text-[0.88em] font-semibold text-brand-800">
        {children}
      </code>
    );
  },

  table: ({ children }) => (
    <div className="my-7 overflow-x-auto rounded-2xl border border-borda">
      <table className="w-full min-w-[480px] border-collapse text-left text-[15px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-fundo">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-borda px-4 py-3 text-xs font-black tracking-wide text-texto uppercase">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-borda px-4 py-3 align-top text-texto-2 last:border-0">
      {children}
    </td>
  ),

  img: ({ src, alt, title }) => {
    const url = typeof src === "string" ? src : "";
    if (!url) return null;
    const legenda = title || alt || "";

    return (
      <figure className="my-8">
        {podeOtimizar(url) ? (
          <Image
            src={url}
            alt={alt ?? ""}
            width={1280}
            height={720}
            sizes="(max-width: 768px) 100vw, 768px"
            className="h-auto w-full rounded-2xl border border-borda"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- host arbitrário: next/image exigiria whitelist e quebraria em runtime.
          <img
            src={url}
            alt={alt ?? ""}
            loading="lazy"
            decoding="async"
            className="h-auto w-full rounded-2xl border border-borda"
          />
        )}
        {legenda ? (
          <figcaption className="mt-3 text-center text-sm text-texto-3">
            {legenda}
          </figcaption>
        ) : null}
      </figure>
    );
  },
};

/** Renderiza um trecho de Markdown com a tipografia de leitura do blog. */
export function ConteudoMarkdown({ markdown }: { markdown: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={componentes}>
      {markdown}
    </Markdown>
  );
}
