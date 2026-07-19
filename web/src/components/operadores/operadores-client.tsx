"use client";

import { useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Users, Plus, Power } from "lucide-react";
import { alternarAtivo } from "@/app/painel/operadores/actions";
import { useToast } from "@/components/ui/toast";
import { Confirmar } from "@/components/ui/confirmar";
import { ResponsiveTable } from "@/components/ui/responsive-table";

type Operador = {
  id: string;
  nome: string;
  usuario: string;
  ativo: boolean;
};

const GRADIENTES = [
  "linear-gradient(135deg,#16A34A,#22C55E)",
  "linear-gradient(135deg,#F59E0B,#F97316)",
  "linear-gradient(135deg,#2563EB,#0EA5E9)",
  "linear-gradient(135deg,#8B5CF6,#A855F7)",
  "linear-gradient(135deg,#F97316,#E11D48)",
];

function gradiente(nome: string): string {
  const c = nome.trim().charCodeAt(0);
  const i = Number.isNaN(c) ? 0 : c % GRADIENTES.length;
  return GRADIENTES[i];
}

const TH: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "#8695A0",
};

export function OperadoresClient({
  operadores,
  patioId,
  patioNome,
}: {
  operadores: Operador[];
  patioId: string;
  patioNome: string;
}) {
  const ativos = operadores.filter((o) => o.ativo).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span style={{ fontSize: 12, color: "#6B7280" }}>‹ Cadastros</span>
          <h2
            style={{
              margin: "2px 0 0",
              fontSize: 23,
              fontWeight: 700,
              letterSpacing: "-.02em",
            }}
          >
            Operadores
          </h2>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
            Contas do <b style={{ color: "#1F2937" }}>{patioNome}</b> que acessam
            o app · {ativos} {ativos === 1 ? "ativo" : "ativos"}
          </div>
        </div>
        <Link
          href={`/painel/operadores/novo?patio=${patioId}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            height: 40,
            padding: "0 16px",
            borderRadius: 11,
            border: "none",
            background: "linear-gradient(90deg,#16A34A,#22C55E)",
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            textDecoration: "none",
            boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)",
          }}
        >
          <Plus className="w-[15px] h-[15px]" />
          Novo operador
        </Link>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        style={{
          borderRadius: 16,
          background: "#fff",
          border: "1px solid #E4E8EC",
          boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
          overflow: "hidden",
        }}
      >
        {operadores.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              textAlign: "center",
            }}
          >
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#DCFCE7",
                color: "#16A34A",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Users className="w-6 h-6" />
            </span>
            <p style={{ fontSize: 13, color: "#8695A0" }}>
              Nenhum operador neste pátio ainda.
            </p>
            <Link
              href={`/painel/operadores/novo?patio=${patioId}`}
              style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}
            >
              Criar o primeiro operador
            </Link>
          </div>
        ) : (
          <ResponsiveTable>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", background: "#FAFBFC" }}>
                  <th style={{ ...TH, padding: "11px 18px" }}>Nome</th>
                  <th style={{ ...TH, padding: "11px 12px" }}>Usuário</th>
                  <th style={{ ...TH, padding: "11px 12px" }}>Status</th>
                  <th style={{ padding: "11px 18px" }} />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {operadores.map((o, i) => (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: o.ativo ? 1 : 0.55, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      style={{
                        borderTop: "1px solid #EEF1F3",
                        background: i % 2 === 1 ? "#FAFBFC" : undefined,
                      }}
                    >
                      <td style={{ padding: "12px 18px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 11,
                          }}
                        >
                          <span
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 999,
                              background: o.ativo
                                ? gradiente(o.nome)
                                : "#94A3B8",
                              display: "grid",
                              placeItems: "center",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: 13,
                              flexShrink: 0,
                            }}
                          >
                            {o.nome.charAt(0).toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 700 }}>{o.nome}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 12px" }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            background: "#F1F4F6",
                            border: "1px solid #E4E8EC",
                            borderRadius: 6,
                            padding: "3px 8px",
                            letterSpacing: ".06em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {o.usuario}
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 999,
                            background: o.ativo ? "#DCFCE7" : "#FEF1F1",
                            color: o.ativo ? "#16A34A" : "#E11D48",
                            border: `1px solid ${o.ativo ? "#BBF7D0" : "#FBD0D0"}`,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 999,
                              background: o.ativo ? "#22C55E" : "#E11D48",
                            }}
                          />
                          {o.ativo ? "ativo" : "inativo"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", textAlign: "right" }}>
                        <BotaoStatus operador={o} />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </motion.section>
    </div>
  );
}

function BotaoStatus({ operador }: { operador: Operador }) {
  const toast = useToast();
  const [pendente, comecar] = useTransition();

  async function executar() {
    const r = await alternarAtivo(operador.id, operador.ativo);
    if (r?.ok) toast.sucesso(r.msg);
    else toast.erro(r?.msg ?? "Erro inesperado.");
  }

  if (operador.ativo) {
    return (
      <Confirmar
        titulo="Desativar operador?"
        descricao={`${operador.nome} perde o acesso ao app imediatamente. Você pode reativar quando quiser.`}
        rotuloConfirmar="Desativar"
        aoConfirmar={executar}
      >
        {(abrir) => (
          <button
            onClick={abrir}
            aria-label={`Desativar ${operador.nome}`}
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              display: "inline-grid",
              placeItems: "center",
              border: "none",
              background: "transparent",
              color: "#8695A0",
              cursor: "pointer",
            }}
          >
            <Power className="w-4 h-4" />
          </button>
        )}
      </Confirmar>
    );
  }

  return (
    <button
      onClick={() => comecar(executar)}
      disabled={pendente}
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#16A34A",
        background: "#DCFCE7",
        border: "1px solid #BBF7D0",
        borderRadius: 9,
        padding: "6px 11px",
        cursor: "pointer",
        opacity: pendente ? 0.6 : 1,
      }}
    >
      reativar
    </button>
  );
}
