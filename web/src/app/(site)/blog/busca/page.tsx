import { CabecalhoBlog } from "@/components/blog/cabecalho";
import { ListaPosts } from "@/components/blog/listagem";
import { PilulasCategoria } from "@/components/blog/navegacao";
import { listarCategorias, listarPosts, POSTS_POR_PAGINA } from "@/lib/blog";

/**
 * Resultados da busca. É a ÚNICA rota do blog que lê `searchParams`, e por isso
 * a única renderizada a cada requisição — daí ela viver num caminho separado,
 * em vez de virar um parâmetro da home (que ficaria dinâmica junto).
 */
type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function BuscaPage({ searchParams }: Props) {
  const params = await searchParams;
  const bruto = Array.isArray(params.q) ? params.q[0] : params.q;
  const termo = (bruto ?? "").trim().slice(0, 80);

  const [categorias, listagem] = await Promise.all([
    listarCategorias(),
    termo
      ? listarPosts({ pagina: 1, porPagina: POSTS_POR_PAGINA * 2, busca: termo })
      : Promise.resolve({ posts: [], total: 0, pagina: 1, totalPaginas: 1 }),
  ]);

  const descricao = termo
    ? `${listagem.total} ${listagem.total === 1 ? "artigo encontrado" : "artigos encontrados"} para “${termo}”.`
    : "Digite o que você procura — tarifa, caixa, mensalista, leitura de placa.";

  return (
    <div className="pt-16">
      <CabecalhoBlog
        chip="Busca"
        titulo={termo ? `Resultados para “${termo}”` : "Buscar no blog"}
        descricao={descricao}
        busca={termo}
      />

      <div className="mx-auto max-w-6xl px-5 py-14">
        <PilulasCategoria categorias={categorias} />

        <div className="mt-10">
          <ListaPosts
            posts={listagem.posts}
            pagina={1}
            totalPaginas={1}
            base="/blog"
            vazio={{
              titulo: termo ? "Nenhum artigo com esse termo" : "O que você procura?",
              descricao: termo
                ? "Tente uma palavra mais simples — “caixa”, “tarifa”, “placa”, “mensalista”."
                : "Use o campo acima para buscar por assunto.",
            }}
          />
        </div>
      </div>
    </div>
  );
}
