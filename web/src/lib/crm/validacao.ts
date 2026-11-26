import { normalizarContato } from "@/lib/crm/contato";
import { MOTIVOS_MANUAIS, podeMoverPara, type DestinoManual } from "@/lib/crm/regras";
import {
  TIPOS_INTERACAO_MANUAL,
  type Estagio,
  type EstadoAssinatura,
  type MotivoPerda,
  type TipoInteracaoManual,
} from "@/lib/crm/tipos";

/**
 * Validação de entrada das server actions do CRM, fora delas para ser testada.
 * Tudo o que chega aqui veio do navegador: nenhum tipo é confiável.
 */

type Falha = { ok: false; msg: string };

export const LIMITE_TEXTO = 4000;
export const LIMITE_ACAO = 200;

export function validarMovimento(
  lead: { status: Estagio; tenantId: string | null; assinaturaEstado: EstadoAssinatura | null },
  entrada: { de: Estagio; para: DestinoManual; motivoPerda?: MotivoPerda | null; texto?: string | null },
): { ok: true } | Falha {
  if (lead.status !== entrada.de)
    return { ok: false, msg: "O lead mudou de estágio enquanto a tela estava aberta. Recarregue." };
  if (!podeMoverPara(lead, entrada.para))
    return { ok: false, msg: "Esse estágio não é permitido para este lead." };

  if (entrada.para === "perdido") {
    const motivo = entrada.motivoPerda;
    if (!motivo || !(MOTIVOS_MANUAIS as readonly string[]).includes(motivo))
      return { ok: false, msg: "Escolha o motivo da perda." };
    const texto = (entrada.texto ?? "").trim();
    if (motivo === "outro" && !texto) return { ok: false, msg: "Conte o motivo em “Outro”." };
    if (texto.length > LIMITE_TEXTO) return { ok: false, msg: "O comentário ficou longo demais." };
  }
  return { ok: true };
}

export function validarInteracao(entrada: {
  tipo: TipoInteracaoManual;
  texto: string;
}): { ok: true; tipo: TipoInteracaoManual; texto: string } | Falha {
  if (!TIPOS_INTERACAO_MANUAL.includes(entrada.tipo)) return { ok: false, msg: "Tipo de interação inválido." };
  const texto = String(entrada.texto ?? "").trim();
  if (!texto) return { ok: false, msg: "Escreva o que aconteceu." };
  if (texto.length > LIMITE_TEXTO) return { ok: false, msg: `O texto passou de ${LIMITE_TEXTO} caracteres.` };
  return { ok: true, tipo: entrada.tipo, texto };
}

export function validarProximaAcao(
  entrada: { proximaAcao: string; proximaAcaoEm: string } | null,
): { ok: true; proximaAcao: string | null; proximaAcaoEm: string | null } | Falha {
  if (entrada === null) return { ok: true, proximaAcao: null, proximaAcaoEm: null };
  const texto = String(entrada.proximaAcao ?? "").trim();
  if (!texto) return { ok: false, msg: "Escreva qual é a próxima ação." };
  if (texto.length > LIMITE_ACAO) return { ok: false, msg: `A próxima ação passou de ${LIMITE_ACAO} caracteres.` };
  const d = new Date(String(entrada.proximaAcaoEm ?? ""));
  if (Number.isNaN(d.getTime())) return { ok: false, msg: "Escolha a data e a hora da próxima ação." };
  return { ok: true, proximaAcao: texto, proximaAcaoEm: d.toISOString() };
}

export type EntradaLeadManual = {
  nome: string;
  empresa?: string | null;
  telefone?: string | null;
  email?: string | null;
  nota?: string | null;
  proximaAcao?: string | null;
  proximaAcaoEm?: string | null;
  status: "novo" | "em_contato";
};

export type DadosLeadManual = {
  nome: string;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  nota: string | null;
  proximaAcao: string | null;
  proximaAcaoEm: string | null;
  status: "novo" | "em_contato";
};

export function validarLeadManual(
  entrada: EntradaLeadManual,
): { ok: true; dados: DadosLeadManual } | Falha {
  const nome = String(entrada.nome ?? "").trim();
  if (!nome) return { ok: false, msg: "Informe o nome." };
  if (nome.length > 120) return { ok: false, msg: "O nome passou de 120 caracteres." };
  if (entrada.status !== "novo" && entrada.status !== "em_contato")
    return { ok: false, msg: "O lead manual começa em Novo ou Em contato." };

  const contato = normalizarContato({ email: entrada.email, telefone: entrada.telefone });
  if (!contato.ok) return contato;

  const empresa = String(entrada.empresa ?? "").trim().slice(0, 120) || null;
  const nota = String(entrada.nota ?? "").trim();
  if (nota.length > LIMITE_TEXTO) return { ok: false, msg: "A observação ficou longa demais." };

  // "Quando" só vale se há ação.
  const textoAcao = String(entrada.proximaAcao ?? "").trim();
  let proximaAcao: string | null = null;
  let proximaAcaoEm: string | null = null;
  if (textoAcao) {
    const a = validarProximaAcao({ proximaAcao: textoAcao, proximaAcaoEm: entrada.proximaAcaoEm ?? "" });
    if (!a.ok) return a;
    proximaAcao = a.proximaAcao;
    proximaAcaoEm = a.proximaAcaoEm;
  }

  return {
    ok: true,
    dados: {
      nome,
      empresa,
      telefone: contato.telefone,
      email: contato.email,
      nota: nota || null,
      proximaAcao,
      proximaAcaoEm,
      status: entrada.status,
    },
  };
}
