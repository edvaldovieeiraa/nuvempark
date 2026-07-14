"use client";

import { Marca } from "@/components/marca";

/**
 * Miniatura da foto de entrada, 40x40.
 *
 * A MARCA é o fundo permanente e a foto entra por cima. Não é enfeite: o ticket
 * pode ter `foto_entrada_path` sem o arquivo existir no storage (foto que ainda
 * não subiu do app), e aí a URL assinada falha. Com a foto por cima e `alt=""`,
 * a falha simplesmente revela a marca — sem texto quebrado dentro do
 * quadradinho, e sem depender de um `onError` em JS, que NÃO dispara quando a
 * imagem falha antes da hidratação (o evento acontece no HTML do servidor,
 * quando o handler ainda não está preso).
 *
 * A imagem é decorativa (`alt=""`) porque quem carrega o rótulo é o wrapper —
 * assim o leitor de tela ouve uma coisa só, e não a placa duas vezes.
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
  const rotulo = url
    ? `Foto de entrada do veículo ${placa}`
    : `Sem foto de entrada do veículo ${placa}`;

  const conteudo = (
    <span className="relative block w-10 h-10 rounded-lg overflow-hidden border border-brand-200 bg-gradient-to-br from-brand-50 to-superficie">
      <span className="absolute inset-0 grid place-items-center">
        <Marca className="w-5 h-5 opacity-70" corNuvem="#059669" corP="#ECFDF5" />
      </span>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </span>
  );

  if (!aoClicar) {
    return (
      <span role="img" aria-label={rotulo} className="block">
        {conteudo}
      </span>
    );
  }

  return (
    <button
      type="button"
      // A linha inteira já abre o modal: sem isto o clique no thumb dispara os
      // dois handlers.
      onClick={(e) => {
        e.stopPropagation();
        aoClicar();
      }}
      aria-label={
        url
          ? `Ver foto de entrada do veículo ${placa}`
          : `Ver detalhes do veículo ${placa} (sem foto de entrada)`
      }
      className="block rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 hover:brightness-95 transition"
    >
      {conteudo}
    </button>
  );
}
