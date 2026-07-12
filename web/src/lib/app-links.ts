/**
 * Links do app do operador (Android).
 *
 * ▶ QUANDO O APP FOR PUBLICADO NA PLAY STORE:
 *   1) troque `publicado` para `true`.
 *   2) confira/ajuste a `url` (o package já está correto).
 *   Pronto — o site inteiro passa a mostrar o badge "Baixar na Google Play"
 *   com o link real, em todos os pontos, sem mexer em mais nada.
 */
export const PLAY_STORE = {
  publicado: false,
  packageName: "com.nuvempark.nuvempark_app",
  url: "https://play.google.com/store/apps/details?id=com.nuvempark.nuvempark_app",
} as const;
