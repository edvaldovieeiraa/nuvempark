"use client";

import { useState } from "react";

import { Marca } from "@/components/marca";

/**
 * Miniatura da foto de entrada. Sem foto — ou com a URL assinada quebrada
 * (arquivo ainda não subiu do app) — cai na MARCA em tom esmeralda suave, do
 * mesmo tamanho, para a tabela não "pular".
 *
 * O selo cheio (gradiente brand→teal, nuvem branca) pesaria demais repetido em
 * dezenas de linhas e roubaria a atenção das fotos reais: aqui a marca entra
 * invertida — nuvem esmeralda sobre fundo brand-50 — como marca d'água.
 *
 * A URL vem assinada em lote pela página (ver `assinarFotosEntrada`): o thumb
 * não fala com o Storage.
 */
export function FotoVeiculoThumb({
  url,
  placa,
  aoClicar,
}: {
  url?: string;
  placa: string;
  aoClicar?: () => void;
}) {
  const [quebrou, setQuebrou] = useState(false);
  const temFoto = Boolean(url) && !quebrou;

  const conteudo = temFoto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`Foto de entrada do veículo ${placa}`}
      onError={() => setQuebrou(true)}
      className="w-10 h-10 rounded-lg object-cover border border-borda bg-fundo"
    />
  ) : (
    <span
      role="img"
      aria-label={`Sem foto de entrada do veículo ${placa}`}
      className="w-10 h-10 rounded-lg border border-brand-200 bg-gradient-to-br from-brand-50 to-superficie grid place-items-center"
    >
      <Marca className="w-5 h-5 opacity-70" corNuvem="#059669" corP="#ECFDF5" />
    </span>
  );

  if (!aoClicar) return conteudo;

  return (
    <button
      type="button"
      // A linha inteira já abre o modal: sem isto o clique no thumb dispara os
      // dois handlers.
      onClick={(e) => {
        e.stopPropagation();
        aoClicar();
      }}
      aria-label={`Ver foto de entrada do veículo ${placa}`}
      className="block rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 hover:brightness-95 transition"
    >
      {conteudo}
    </button>
  );
}
