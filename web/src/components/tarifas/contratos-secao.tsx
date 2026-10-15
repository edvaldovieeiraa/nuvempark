"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator, Clock, FileWarning, Pencil, Trash2 } from "lucide-react";
import { lerContrato, validar, type Contrato } from "@/lib/contrato";
import { resumoContrato } from "@/lib/contrato-painel";
import { nomeAmigavel } from "@/lib/nome-amigavel";
import { desativarContrato } from "@/app/painel/tarifas/contrato-actions";
import { useToast } from "@/components/ui/toast";
import { Confirmar } from "@/components/ui/confirmar";
import { ModalSimuladorContrato } from "./simulador-contrato-modal";
import { COR } from "./estilo-contrato";

export type ContratoLinha = {
  id: string;
  nome: string;
  tipo_veiculo: string;
  /** JSON da coluna `tarifas.contrato`; pode estar malformado. */
  contrato: unknown;
};

const botao =
  "w-11 h-11 rounded-xl grid place-items-center text-[#8695A0] hover:text-[#16A34A] hover:bg-[#F1F4F6] transition-colors disabled:opacity-30 disabled:pointer-events-none";

/** `ilegivel`: o JSON não tem forma de contrato; `invalido`: lido, mas o motor o recusa. */
function ler(json: unknown): { lido: Contrato | null; problema: "ilegivel" | "invalido" | null } {
  try {
    const c = lerContrato(json);
    return validar(c).length === 0 ? { lido: c, problema: null } : { lido: null, problema: "invalido" };
  } catch {
    return { lido: null, problema: "ilegivel" };
  }
}

/**
 * Seção "Contratos" da página de Tarifas (Feature 2a). Contratos só simulam:
 * ficam fora da ordem, da tarifa padrão do app, dos KPIs e de `mover()`. No
 * celular, cada contrato é um cartão (a linha quebra).
 */
export function ContratosSecao({
  contratos,
  patioId,
}: {
  contratos: ContratoLinha[];
  patioId: string;
}) {
  const [simulando, setSimulando] = useState<{ nome: string; contrato: Contrato } | null>(null);
  const lidos = useMemo(
    () => contratos.map((c) => ({ ...c, ...ler(c.contrato) })),
    [contratos],
  );

  return (
    <motion.section
      aria-labelledby="secao-contratos"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
      style={{
        borderRadius: 16,
        background: "#fff",
        border: "1px solid #E4E8EC",
        boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
        padding: "18px 18px 8px",
      }}
    >
      <h3 id="secao-contratos" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1F2937" }}>
        Contratos
      </h3>
      <p style={{ margin: "2px 0 10px", fontSize: 12, color: "#6B7280" }}>
        Ainda não aparecem no app nem no QR: servem para montar e simular antes de cobrar.
      </p>

      {lidos.length === 0 ? (
        <p style={{ margin: "8px 0 14px", fontSize: 13, color: "#8695A0" }}>
          Nenhum contrato ainda: crie em{" "}
          <Link
            href={`/painel/tarifas/nova?patio=${patioId}`}
            style={{ color: "#16A34A", fontWeight: 700 }}
          >
            Nova tabela → Contrato
          </Link>{" "}
          ou a partir de uma tarifa avulsa.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {lidos.map((c) => (
            <li
              key={c.id}
              style={{
                borderTop: "1px solid #EEF1F3",
                padding: "12px 0",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px 16px",
              }}
            >
              <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <b style={{ fontSize: 13, color: "#1F2937" }}>{c.nome}</b>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: COR.ambar.texto,
                      background: COR.ambar.fundo,
                      border: `1px solid ${COR.ambar.borda}`,
                      borderRadius: 999,
                      padding: "2px 8px",
                    }}
                  >
                    <Clock aria-hidden style={{ width: 11, height: 11 }} />
                    Só simulação — ainda não cobra no app
                  </span>
                  {c.problema && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: COR.erro.texto,
                        background: COR.erro.fundo,
                        border: `1px solid ${COR.erro.borda}`,
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}
                    >
                      <FileWarning aria-hidden style={{ width: 11, height: 11 }} />
                      {c.problema === "ilegivel" ? "Não lido" : "Com erros"}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 12, color: "#6B7280" }}>
                  {nomeAmigavel(c.tipo_veiculo)} ·{" "}
                  {c.lido
                    ? resumoContrato(c.lido)
                    : c.problema === "ilegivel"
                      ? "O conteúdo salvo não pôde ser lido: abra para recomeçar."
                      : "O contrato salvo tem erros: abra para corrigir."}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className={botao}
                  disabled={!c.lido}
                  onClick={() => c.lido && setSimulando({ nome: c.nome, contrato: c.lido })}
                  aria-label={`Simular o contrato ${c.nome}`}
                  title="Simular"
                >
                  <Calculator className="w-4 h-4" />
                </button>
                <Link
                  href={`/painel/tarifas/contrato/${c.id}`}
                  className={botao}
                  aria-label={`Editar o contrato ${c.nome}`}
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                <BotaoDesativarContrato id={c.id} nome={c.nome} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {simulando && (
          <ModalSimuladorContrato
            nome={simulando.nome}
            contrato={simulando.contrato}
            fechar={() => setSimulando(null)}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/** Diálogo próprio (design, observação 6): o do desativar de tarifa fala de cobrança. */
function BotaoDesativarContrato({ id, nome }: { id: string; nome: string }) {
  const toast = useToast();
  return (
    <Confirmar
      titulo="Desativar contrato?"
      descricao={`O contrato "${nome}" sai da lista de contratos. Nenhuma cobrança é afetada: contratos ainda só simulam.`}
      rotuloConfirmar="Desativar"
      aoConfirmar={async () => {
        const r = await desativarContrato(id);
        if (r?.ok) toast.sucesso(r.msg);
        else toast.erro(r?.msg ?? "Erro inesperado.");
      }}
    >
      {(abrir) => (
        <button
          type="button"
          onClick={abrir}
          aria-label={`Desativar o contrato ${nome}`}
          title="Desativar"
          className="w-11 h-11 rounded-xl grid place-items-center text-[#8695A0] hover:text-perigo hover:bg-perigo-bg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </Confirmar>
  );
}
