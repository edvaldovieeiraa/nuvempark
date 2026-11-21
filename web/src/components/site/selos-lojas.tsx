import Image from "next/image";
import { APP_STORE, PLAY_STORE } from "@/lib/app-links";
import seloAppStore from "@/assets/badges/app-store-pt-br.svg";
import seloGooglePlay from "@/assets/badges/google-play-pt-br.png";

/**
 * Selos OFICIAIS das lojas, em pt-BR, sem nenhuma alteração na arte:
 *
 * - App Store: "Baixar na App Store", preto, SVG gerado pela ferramenta de
 *   marketing da Apple (tools.applemediaservices.com). A Apple não tem versão
 *   "Disponível na" em português; este é o texto oficial.
 * - Google Play: "Disponível no Google Play", PNG da página de selos do Google
 *   (play.google.com/intl/.../badges). Só a margem transparente de cima e de
 *   baixo foi cortada, para os dois terem a mesma altura visível: o Google
 *   exige que o selo dele seja do mesmo tamanho ou maior que o das outras
 *   lojas, e com a margem ele ficaria visivelmente menor.
 *
 * As duas lojas pedem área livre em volta de ~1/4 da altura do selo; o `gap`
 * cuida do espaço entre eles, e quem usa o componente cuida do espaço em volta.
 *
 * Os arquivos ficam em `src/assets` e entram por import, não em `public/`: o
 * deploy pelo script da skill só envia `src/`, e um selo em `public/` sumiria
 * em produção sem erro nenhum.
 *
 * Cada loja só aparece quando `publicado` está ligado em `lib/app-links.ts`.
 */
export function SelosLojas({
  altura = 40,
  alinhar = "center",
  className = "",
}: {
  /** Altura visível de cada selo, em px. A Apple pede no mínimo 40 na tela. */
  altura?: number;
  alinhar?: "start" | "center";
  className?: string;
}) {
  const lojas = [
    APP_STORE.publicado && {
      chave: "app-store",
      url: APP_STORE.url,
      src: seloAppStore,
      alt: "Baixar o NuvemPark na App Store",
    },
    PLAY_STORE.publicado && {
      chave: "google-play",
      url: PLAY_STORE.url,
      src: seloGooglePlay,
      alt: "Baixar o NuvemPark no Google Play",
    },
  ].filter(Boolean) as {
    chave: string;
    url: string;
    src: typeof seloAppStore;
    alt: string;
  }[];

  if (lojas.length === 0) return null;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: alinhar === "center" ? "center" : "flex-start",
        gap: Math.round(altura * 0.3),
      }}
    >
      {lojas.map((l) => {
        const largura = Math.round((l.src.width * altura) / l.src.height);
        return (
          <a
            key={l.chave}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[8px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#22C55E]"
            style={{ display: "inline-flex", lineHeight: 0 }}
          >
            <Image src={l.src} alt={l.alt} width={largura} height={altura} />
          </a>
        );
      })}
    </div>
  );
}
