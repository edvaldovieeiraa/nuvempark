/**
 * Links do app do operador nas lojas.
 *
 * `publicado` decide se o selo da loja aparece no site e no painel. Selo que
 * leva a uma página "Não encontrado" é pior do que selo nenhum, então cada
 * loja só liga quando a página dela abre de verdade:
 *
 *   curl -s -o /dev/null -w '%{http_code}' '<url>'   # tem de dar 200
 *
 * ▶ QUANDO A GOOGLE PLAY APROVAR: troque `PLAY_STORE.publicado` para `true`.
 *   O selo "Disponível no Google Play" passa a aparecer em todos os pontos,
 *   ao lado do da App Store, sem mexer em mais nada.
 */
export const APP_STORE = {
  publicado: true,
  appId: "6837024980",
  url: "https://apps.apple.com/br/app/nuvempark/id6837024980",
} as const;

export const PLAY_STORE = {
  publicado: false,
  packageName: "com.nuvempark.nuvempark_app",
  url: "https://play.google.com/store/apps/details?id=com.nuvempark.nuvempark_app",
} as const;
