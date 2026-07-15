import "server-only";
import { moeda, formatarCompetencia } from "./financeiro";
import { formatarData } from "./format-data";

// ============================================================================
// Design system de e-mail (HTML compatível com Gmail/Outlook/Apple Mail).
// Regras: tudo em <table>, estilos inline, sem SVG, sem CSS externo, cores
// hex literais. O "logo" é um monograma em círculo com gradiente (renderiza
// em qualquer cliente, diferente de SVG).
// ============================================================================

const MARCA = {
  verde: "#059669",
  verdeEsc: "#047857",
  azul: "#0EA5E9",
  verdeClaro: "#A7F3D0",
  tinta: "#101B14",
  tinta2: "#56655B",
  tinta3: "#8FA096",
  fundo: "#EEF2F0",
  borda: "#E3EAE4",
  suave: "#F4F7F5",
};

/** Logo NuvemPark: círculo com gradiente + monograma "NP" branco. */
function logo(): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block;vertical-align:middle">
    <tr>
      <td width="44" height="44" align="center" valign="middle"
          style="width:44px;height:44px;background:${MARCA.verde};background:linear-gradient(135deg,${MARCA.verde},${MARCA.azul});border-radius:13px;color:#fff;font-size:18px;font-weight:800;font-family:Arial,sans-serif;text-align:center;line-height:44px">
        NP
      </td>
      <td style="padding-left:12px;vertical-align:middle">
        <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.4px;line-height:1;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
          Nuvem<span style="color:${MARCA.verdeClaro}">Park</span>
        </div>
        <div style="color:rgba(255,255,255,.7);font-size:11px;font-weight:600;letter-spacing:.3px;margin-top:3px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
          Gestão de estacionamentos
        </div>
      </td>
    </tr>
  </table>`;
}

/** Envelope comum: fundo, card, header com gradiente+logo, corpo, footer. */
function envelope(params: {
  preheader: string;
  subtitulo: string;
  corpo: string;
}): string {
  return `<!DOCTYPE html>
  <html lang="pt-BR"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  </head><body style="margin:0;padding:0">
  <div style="background:${MARCA.fundo};margin:0;padding:0;width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all">${params.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MARCA.fundo}">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 8px 32px -12px rgba(16,27,20,.18)">

          <!-- HEADER -->
          <tr><td style="background:${MARCA.verdeEsc};background:linear-gradient(130deg,${MARCA.verdeEsc} 0%,${MARCA.verde} 55%,${MARCA.azul} 130%);padding:26px 32px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="left">${logo()}</td>
            </tr></table>
            <div style="color:rgba(255,255,255,.9);font-size:14px;font-weight:600;margin-top:18px">${params.subtitulo}</div>
          </td></tr>

          <!-- CORPO -->
          <tr><td style="padding:30px 32px 28px">
            ${params.corpo}
          </td></tr>

          <!-- FOOTER -->
          <tr><td style="padding:22px 32px;background:${MARCA.suave};border-top:1px solid ${MARCA.borda}">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <div style="color:${MARCA.tinta2};font-size:12px;font-weight:700">NuvemPark</div>
                <div style="color:${MARCA.tinta3};font-size:11px;margin-top:2px">Gestão de estacionamentos na nuvem</div>
              </td>
              <td align="right">
                <a href="https://nuvempark.com" style="color:${MARCA.verde};font-size:12px;font-weight:700;text-decoration:none">nuvempark.com</a>
              </td>
            </tr></table>
          </td></tr>

        </table>
        <div style="color:${MARCA.tinta3};font-size:11px;margin-top:18px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
          © NuvemPark · Este é um e-mail automático.
        </div>
      </td></tr>
    </table>
  </div>
  </body></html>`;
}

/** Botão CTA em tabela (renderiza no Outlook). */
function botaoCta(texto: string, href: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0">
    <tr><td align="center" style="border-radius:12px;background:${MARCA.verde};background:linear-gradient(135deg,${MARCA.verde},${MARCA.verdeEsc})">
      <a href="${href}" style="display:inline-block;padding:15px 34px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">${texto}</a>
    </td></tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// 1) CONFIRMAÇÃO DE CADASTRO (self-signup)
// ---------------------------------------------------------------------------
export function emailConfirmacao(params: {
  nome: string;
  link: string;
}): { assunto: string; html: string } {
  const assunto = "Confirme seu e-mail e comece seu teste grátis · NuvemPark";
  const corpo = `
    <p style="margin:0 0 8px;color:${MARCA.tinta};font-size:18px;font-weight:800">Olá, ${params.nome}! 👋</p>
    <p style="margin:0 0 22px;color:${MARCA.tinta2};font-size:15px;line-height:1.65">
      Que bom ter você aqui. Falta só <b>um passo</b> para ativar sua conta e liberar o painel completo.
    </p>

    <!-- Destaque do trial -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="background:${MARCA.suave};border:1px solid ${MARCA.borda};border-radius:16px;padding:18px 20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="42" valign="top">
            <div style="width:38px;height:38px;background:#ECFDF5;border-radius:10px;text-align:center;line-height:38px;font-size:20px">🎁</div>
          </td>
          <td style="padding-left:12px">
            <div style="color:${MARCA.tinta};font-size:15px;font-weight:800">15 dias grátis</div>
            <div style="color:${MARCA.tinta2};font-size:13px;margin-top:2px">Todos os recursos liberados · sem cartão de crédito</div>
          </td>
        </tr></table>
      </td></tr>
    </table>

    ${botaoCta("Confirmar e-mail e entrar", params.link)}

    <p style="margin:22px 0 0;color:${MARCA.tinta3};font-size:12px;line-height:1.6">
      O botão não funciona? Copie e cole este link no navegador:<br>
      <a href="${params.link}" style="color:${MARCA.verde};word-break:break-all">${params.link}</a>
    </p>
    <p style="margin:16px 0 0;color:${MARCA.tinta3};font-size:12px;line-height:1.6">
      Se você não criou esta conta, é só ignorar este e-mail.
    </p>`;

  return {
    assunto,
    html: envelope({
      preheader: "Confirme seu e-mail para liberar seus 15 dias grátis no NuvemPark.",
      subtitulo: "Bem-vindo — seu teste grátis de 15 dias",
      corpo,
    }),
  };
}

// ---------------------------------------------------------------------------
// 2) COBRANÇA DE FATURA
// ---------------------------------------------------------------------------
export function emailCobranca(params: {
  nomeRede: string;
  competencia: string; // iso yyyy-mm-01
  valor: number;
  vencimento: string; // iso yyyy-mm-dd
  linkPagamento?: string | null;
  pixCopiaECola?: string | null;
}): { assunto: string; html: string } {
  const comp = formatarCompetencia(params.competencia);
  const venc = formatarData(params.vencimento);
  const assunto = `Fatura de ${comp} — ${moeda.format(params.valor)} · NuvemPark`;

  const botao = params.linkPagamento
    ? botaoCta("Pagar agora", params.linkPagamento)
    : "";

  const pix = params.pixCopiaECola
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">
         <tr><td>
           <div style="font-size:11px;color:${MARCA.tinta2};font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">PIX copia e cola</div>
           <div style="font-family:'Courier New',monospace;font-size:12px;background:${MARCA.suave};border:1px solid ${MARCA.borda};border-radius:10px;padding:12px;word-break:break-all;color:${MARCA.tinta}">${params.pixCopiaECola}</div>
         </td></tr>
       </table>`
    : "";

  const corpo = `
    <p style="margin:0 0 8px;color:${MARCA.tinta};font-size:18px;font-weight:800">Olá, ${params.nomeRede} 👋</p>
    <p style="margin:0 0 22px;color:${MARCA.tinta2};font-size:15px;line-height:1.65">
      Segue a fatura da sua assinatura referente a <b>${comp}</b>.
    </p>

    <!-- Card do valor -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px">
      <tr><td style="background:${MARCA.suave};border:1px solid ${MARCA.borda};border-radius:16px;padding:20px 22px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:${MARCA.tinta2};font-size:13px">Valor total</td>
            <td align="right" style="color:${MARCA.tinta};font-size:26px;font-weight:800">${moeda.format(params.valor)}</td>
          </tr>
          <tr><td colspan="2" style="height:10px"></td></tr>
          <tr>
            <td style="color:${MARCA.tinta2};font-size:13px">Vencimento</td>
            <td align="right" style="color:${MARCA.tinta};font-size:14px;font-weight:700">${venc}</td>
          </tr>
        </table>
      </td></tr>
    </table>

    ${botao}
    ${pix}

    <p style="margin:24px 0 0;color:${MARCA.tinta3};font-size:12px;line-height:1.6">
      Já pagou ou recebeu por engano? É só responder este e-mail que a gente resolve.
    </p>`;

  return {
    assunto,
    html: envelope({
      preheader: `Fatura de ${comp}: ${moeda.format(params.valor)}, vence ${venc}.`,
      subtitulo: "Fatura da sua assinatura",
      corpo,
    }),
  };
}
