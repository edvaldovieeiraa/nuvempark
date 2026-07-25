/**
 * URLs entre os dois domínios (site ↔ painel).
 * O site vive em nuvempark.com; o painel em dashboard.nuvempark.com.
 * Os links do site pra rotas de app (login/cadastro) devem apontar DIRETO
 * pro host do painel, evitando o hop de redirect do middleware.
 *
 * Se NEXT_PUBLIC_APP_HOST não existir (dev, ou separação desligada), cai no
 * path relativo — continua funcionando no mesmo domínio.
 */
const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST || "";

/** Monta um link do site para uma rota do painel (ex.: "/cadastro"). */
export function urlApp(path: string): string {
  if (!APP_HOST) return path; // mesmo domínio (dev / separação off)
  return `https://${APP_HOST}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Origem ABSOLUTA do SITE institucional (sem barra no fim).
 * Usada por canonical, Open Graph, sitemap, RSS e JSON-LD — esses campos não
 * aceitam caminho relativo, então precisam do host mesmo em dev.
 *
 * ⚠️ NÃO usar `NEXT_PUBLIC_SITE_URL` aqui. Apesar do nome, em produção ela vale
 * `https://dashboard.nuvempark.com`: quem a lê é o magic link do /cadastro e do
 * /auth/callback, que precisam apontar de volta para o APP. Ela já esteve nesta
 * cadeia e o resultado foi canonical, og:image e sitemap do blog apontando para
 * o host do painel — que redireciona de volta para o site (sinal ambíguo para o
 * Google, e preview quebrada nos crawlers que não seguem redirect em imagem).
 *
 * A fonte certa é `NEXT_PUBLIC_SITE_HOST`: o MESMO valor que o middleware usa
 * para decidir o que é site e o que é app.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_HOST
    ? `https://${process.env.NEXT_PUBLIC_SITE_HOST}`
    : "https://nuvempark.com"
).replace(/\/+$/, "");

/** Monta uma URL absoluta do site (ex.: "/blog/meu-post"). */
export function urlSite(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
