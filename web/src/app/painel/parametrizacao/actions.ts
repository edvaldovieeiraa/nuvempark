"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MODOS = ["ativada", "operador", "desativada"] as const;
type ModoFoto = (typeof MODOS)[number];

const MODOS_RECIBO = ["automatica", "perguntar", "desativada"] as const;
type ModoRecibo = (typeof MODOS_RECIBO)[number];
const ehModoRecibo = (v: unknown): v is ModoRecibo =>
  MODOS_RECIBO.includes(v as ModoRecibo);

/**
 * Salva a parametrização do pátio (foto no recibo + modo quiosque + modo
 * rápido de entrada).
 * A RLS do gestor garante que só pátios do próprio tenant são afetados.
 */
export async function salvarParametrizacao(
  patioId: string,
  valores: {
    fotoReciboModo: string;
    modoQuiosque: boolean;
    modoRapidoEntrada: boolean;
    reciboSaidaModo: string;
    reciboEstadiaModo: string;
    reciboCaixaModo: string;
  },
) {
  // Server action é endpoint público: o tipo do TS não chega ao runtime.
  if (typeof valores !== "object" || valores === null) {
    return { ok: false as const, erro: "Valor inválido." };
  }
  const { fotoReciboModo, modoQuiosque, modoRapidoEntrada } = valores;
  if (!MODOS.includes(fotoReciboModo as ModoFoto)) {
    return { ok: false as const, erro: "Modo inválido." };
  }
  if (
    typeof modoQuiosque !== "boolean" ||
    typeof modoRapidoEntrada !== "boolean"
  ) {
    return { ok: false as const, erro: "Valor inválido." };
  }
  const { reciboSaidaModo, reciboEstadiaModo, reciboCaixaModo } = valores;
  if (
    !ehModoRecibo(reciboSaidaModo) ||
    !ehModoRecibo(reciboEstadiaModo) ||
    !ehModoRecibo(reciboCaixaModo)
  ) {
    return { ok: false as const, erro: "Modo de impressão inválido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("patios")
    .update({
      foto_recibo_modo: fotoReciboModo,
      modo_quiosque: modoQuiosque,
      modo_rapido_entrada: modoRapidoEntrada,
      recibo_saida_modo: reciboSaidaModo,
      recibo_estadia_modo: reciboEstadiaModo,
      recibo_caixa_modo: reciboCaixaModo,
      // modo_rapido_imprime saiu daqui: imprimir no modo rápido é escolha de
      // cada celular (Menu → Configurações). A coluna fica com o valor atual
      // para os APKs até a 1.0.0+18, que ainda a leem.
    })
    .eq("id", patioId);

  if (error) {
    return { ok: false as const, erro: "Não foi possível salvar." };
  }
  revalidatePath("/painel/parametrizacao");
  return { ok: true as const };
}
