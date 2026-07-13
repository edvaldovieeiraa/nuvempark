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
