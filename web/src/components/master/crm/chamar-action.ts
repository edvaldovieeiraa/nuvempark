/** Quando a action nem chega ao servidor: rede do celular caiu, deploy no meio. */
export const MSG_SEM_CONEXAO = "Não consegui falar com o servidor. Confira a conexão e tente de novo.";

/**
 * Chama uma server action do CRM sem deixar a falha de rede virar exceção.
 * Dentro de uma transition, a promessa rejeitada sobe para o error boundary e
 * derruba a tela inteira; fora dela, quem esperava o resultado (o spinner do
 * card, o botão "Marcar como perdido") fica preso para sempre.
 *
 * As actions do CRM nunca lançam por regra de negócio (devolvem
 * `{ ok: false, msg }`) nem redirecionam, então tudo o que cai no `catch` é
 * transporte, e vira o mesmo `{ ok: false, msg }` que a tela já sabe mostrar.
 */
export async function chamarAction<T extends { ok: boolean }>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    // Todo resultado de action do CRM tem um ramo `{ ok: false; msg: string }`.
    return { ok: false, msg: MSG_SEM_CONEXAO } as unknown as T;
  }
}
