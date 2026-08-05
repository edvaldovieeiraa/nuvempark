import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SolucaoRota, metadataDaSolucao } from "@/components/solucoes/rota";
import { CIDADES, obterCidade, slugDaCidade } from "@/lib/cidades";

/**
 * Páginas de cidade — `/sistema-para-estacionamento/<cidade>`.
 *
 * Rota dinâmica só na forma: os slugs são uma lista fechada em `lib/cidades.ts`
 * e todas as páginas são pré-renderizadas no build. Qualquer outro slug é 404
 * de verdade, e não uma página vazia — cidade sem conteúdo escrito não deve
 * existir nem por um instante.
 */
type Props = { params: Promise<{ cidade: string }> };

export function generateStaticParams(): { cidade: string }[] {
  return CIDADES.map((c) => ({ cidade: slugDaCidade(c) }));
}

/** Slug fora da lista não vira página. */
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cidade } = await params;
  const pagina = obterCidade(cidade);
  if (!pagina) return { title: "Página não encontrada | NuvemPark" };
  return metadataDaSolucao(pagina);
}

export default async function CidadePage({ params }: Props) {
  const { cidade } = await params;
  const pagina = obterCidade(cidade);
  if (!pagina) notFound();
  return <SolucaoRota pagina={pagina} />;
}
