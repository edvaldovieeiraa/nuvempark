import { ImageResponse } from "next/og";
import { obterPostPorSlug } from "@/lib/blog";

/**
 * Imagem social (Open Graph / Twitter) gerada por post.
 *
 * Sem fonte customizada de propósito: carregar uma .ttf exigiria rede no
 * build/runtime, e o layout raiz já documenta que a máquina de build não
 * alcança o Google Fonts. Usamos a fonte embutida do Satori — o desenho
 * (fundo verde da marca, título grande) é que carrega a identidade.
 *
 * Em Next 16, `params` chega como Promise (Async Request APIs).
 */

export const alt = "Blog NuvemPark";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await obterPostPorSlug(slug);

  const titulo = post?.titulo ?? "Blog NuvemPark";
  const categoria = post?.categoria?.nome ?? "Gestão de estacionamento";
  // Título muito longo estoura a caixa: cortamos com reticências.
  const tituloExibido = titulo.length > 110 ? `${titulo.slice(0, 108)}…` : titulo;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #047857 0%, #065F46 55%, #0B1512 100%)",
          color: "#fff",
        }}
      >
        {/* Brilho decorativo — Satori só entende flex/absoluto e gradientes. */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(52,211,153,0.35), rgba(52,211,153,0))",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#10B981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
              color: "#053E2C",
            }}
          >
            P
          </div>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: -0.5 }}>
            <span style={{ fontWeight: 300 }}>Nuvem</span>
            <span style={{ fontWeight: 700, color: "#34D399" }}>Park</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#6EE7B7",
            }}
          >
            {categoria}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: tituloExibido.length > 70 ? 54 : 66,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: -1.5,
            }}
          >
            {tituloExibido}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.18)",
            paddingTop: 26,
            fontSize: 24,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          <span>nuvempark.com/blog</span>
          <span>{post ? `${post.minutosLeitura} min de leitura` : "Blog"}</span>
        </div>
      </div>
    ),
    size,
  );
}
