import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/urls";

/**
 * robots.txt do site.
 *
 * Libera o conteúdo público e bloqueia as áreas de APLICAÇÃO: painel do gestor,
 * console master, login/cadastro, recibos e a página pública do ticket (/t/<id>
 * é o comprovante de um cliente específico — indexar isso não serve a ninguém e
 * expõe URLs de tickets em resultado de busca).
 *
 * `/blog/busca` também sai: resultado de busca interna é thin content e compete
 * com os próprios posts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/painel",
          "/master",
          "/login",
          "/cadastro",
          "/auth",
          "/recibo",
          "/t/",
          "/blog/busca",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
