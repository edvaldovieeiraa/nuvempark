import "server-only";

/**
 * Envio de e-mail via Resend (API REST, sem SDK — zero dependência nova).
 *
 * Config no .env:
 *   RESEND_API_KEY   — chave da Resend
 *   EMAIL_REMETENTE  — ex.: "NuvemPark <cobranca@nuvempark.com>"
 *
 * Se RESEND_API_KEY não estiver setada, enviarEmail() retorna
 * { ok:false, motivo:'desligado' } sem lançar — assim o painel funciona em
 * modo "preparar sem enviar" até você configurar o provedor.
 */

const REMETENTE_PADRAO = "NuvemPark <cobranca@nuvempark.com>";

export type ResultadoEmail =
  | { ok: true; id: string }
  | { ok: false; motivo: "desligado" | "erro"; detalhe?: string };

export function emailConfigurado(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function enviarEmail(params: {
  para: string;
  assunto: string;
  html: string;
}): Promise<ResultadoEmail> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) return { ok: false, motivo: "desligado" };

  const remetente = process.env.EMAIL_REMETENTE || REMETENTE_PADRAO;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente,
        to: [params.para],
        subject: params.assunto,
        html: params.html,
      }),
    });

    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      return { ok: false, motivo: "erro", detalhe: detalhe.slice(0, 300) };
    }
    const data = (await resp.json()) as { id?: string };
    return { ok: true, id: data.id ?? "" };
  } catch (e) {
    return { ok: false, motivo: "erro", detalhe: String(e).slice(0, 300) };
  }
}
