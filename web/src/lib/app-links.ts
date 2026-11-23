import { urlSite } from "@/lib/urls";

/**
 * Links do app do operador nas lojas.
 *
 * `publicado` decide se o selo da loja aparece no site e no painel. Selo que
 * leva a uma página "Não encontrado" é pior do que selo nenhum, então cada
 * loja só liga quando a página dela abre de verdade:
 *
 *   curl -s -o /dev/null -w '%{http_code}' '<url>'   # tem de dar 200
 *
 * App Store no ar em 20/11/2026; Google Play em 22/11/2026. Desde então o app
 * só se instala pelas lojas: o APK solto (bucket `downloads` do Storage) saiu
 * do painel. Ver `URL_APP` para o link único que serve aos dois celulares.
 */
export const APP_STORE = {
  publicado: true,
  appId: "6837024980",
  url: "https://apps.apple.com/br/app/nuvempark/id6837024980",
} as const;

export const PLAY_STORE = {
  publicado: true,
  packageName: "com.nuvempark.nuvempark_app",
  url: "https://play.google.com/store/apps/details?id=com.nuvempark.nuvempark_app",
} as const;

/**
 * Link ÚNICO para baixar o app, qualquer que seja o celular: a página
 * `/app` do site manda o iPhone para a App Store e o resto para a Google Play.
 * É ele que vai no QR code e na mensagem que o gestor manda ao operador, que
 * não sabem de antemão qual celular vai abrir o link.
 */
export const URL_APP = urlSite("/app");

/**
 * Texto pronto para o gestor mandar ao operador (WhatsApp).
 *
 * A senha entra aqui porque este é o ÚNICO momento em que ela existe em texto:
 * no banco só fica o hash bcrypt. Se o gestor não anotar ou repassar agora, o
 * caminho é redefinir em Cadastros → Operadores.
 */
export function textoCredenciais(p: {
  patioNome: string;
  codigo: string;
  usuario: string;
  senha: string;
}): string {
  return [
    `NuvemPark — acesso ao app (${p.patioNome})`,
    "",
    `1) Baixe o app NuvemPark na loja do celular: ${URL_APP}`,
    `2) Código do estacionamento: ${p.codigo}`,
    `3) Usuário: ${p.usuario}`,
    `4) Senha: ${p.senha}`,
  ].join("\n");
}
