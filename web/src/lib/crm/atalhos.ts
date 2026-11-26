import { normalizarEmail, normalizarTelefone, temWhatsApp } from "@/lib/crm/contato";

/**
 * Links dos atalhos do lead (os mesmos da antiga tela de leads do site): WhatsApp só
 * com celular (11 dígitos), ligar com qualquer telefone, e-mail com e-mail.
 */
export function linksContato(lead: { telefone: string | null; email: string | null }) {
  const telefone = normalizarTelefone(lead.telefone);
  const email = normalizarEmail(lead.email);
  return {
    telefone,
    email,
    whatsapp: telefone && temWhatsApp(telefone) ? `https://wa.me/55${telefone}` : null,
    tel: telefone ? `tel:+55${telefone}` : null,
    // Codificado (menos o @): o e-mail vem do formulário anônimo e um `?cc=`
    // ou `&body=` nele viraria um e-mail pré-preenchido para o master.
    mailto: email ? `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}` : null,
  };
}
