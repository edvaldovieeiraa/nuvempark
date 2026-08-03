/**
 * O APK do app do operador, no bucket público `downloads` do Storage.
 *
 * Fonte única: a URL nasceu inline em `/painel/download` e passou a ser
 * necessária também no fim do onboarding, que é onde o gestor de fato precisa
 * dela (acabou de criar o operador e tem de pôr o app no celular dele).
 *
 * Bucket PÚBLICO de propósito: quem instala é o operador, no aparelho dele,
 * quase sempre sem sessão do painel aberta — exigir autenticação aqui só
 * transformaria a instalação num problema de suporte.
 */
export const APK_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/downloads/nuvempark.apk`;

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
    `1) Baixe o app: ${APK_URL}`,
    `2) Código do estacionamento: ${p.codigo}`,
    `3) Usuário: ${p.usuario}`,
    `4) Senha: ${p.senha}`,
  ].join("\n");
}
