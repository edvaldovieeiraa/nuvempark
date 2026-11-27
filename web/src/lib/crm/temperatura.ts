import { TEMPERATURAS, type Temperatura } from "@/lib/crm/tipos";

/**
 * Temperatura do lead (spec crm-temperatura-arrastar-prints, req. 10–16).
 * Marcada à mão; o banco guarda null para "sem marca". O texto da linha do
 * tempo é gravado pelo banco (`fn_crm_definir_temperatura`); a versão daqui só
 * existe para a tela mostrar o mesmo texto antes da resposta.
 */

export const ROTULO_TEMPERATURA: Record<Temperatura, string> = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio",
};

/** Ordem do seletor do painel: do neutro ao mais quente. */
export const OPCOES_TEMPERATURA: readonly { valor: Temperatura | null; rotulo: string }[] = [
  { valor: null, rotulo: "Sem marca" },
  { valor: "frio", rotulo: ROTULO_TEMPERATURA.frio },
  { valor: "morno", rotulo: ROTULO_TEMPERATURA.morno },
  { valor: "quente", rotulo: ROTULO_TEMPERATURA.quente },
];

export function ehTemperatura(v: unknown): v is Temperatura {
  return typeof v === "string" && (TEMPERATURAS as readonly string[]).includes(v);
}

function rotulo(t: Temperatura | null): string {
  return t ? ROTULO_TEMPERATURA[t] : "—";
}

export function textoInteracaoTemperatura(de: Temperatura | null, para: Temperatura | null): string {
  return `Temperatura: ${rotulo(de)} → ${rotulo(para)}`;
}

type Falha = { ok: false; msg: string };

export function validarTemperatura(entrada: {
  de: Temperatura | null;
  para: Temperatura | null;
}): { ok: true; de: Temperatura | null; para: Temperatura | null } | Falha {
  const { de, para } = entrada;
  if (de !== null && !ehTemperatura(de)) return { ok: false, msg: "Temperatura inválida." };
  if (para !== null && !ehTemperatura(para)) return { ok: false, msg: "Temperatura inválida." };
  if (de === para) return { ok: false, msg: "A temperatura já é essa." };
  return { ok: true, de, para };
}
