"use client";

import { useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2,
  CreditCard,
  Smartphone,
  ShieldCheck,
  ShieldX,
  Copy,
  Save,
  Loader2,
} from "lucide-react";
import {
  alternarDispositivo,
  atualizarRede,
} from "@/app/painel/configuracoes/actions";
import { soDigitos, formatarCnpj, cnpjValido } from "@/lib/cnpj";
import { labelAssinaturaEstado } from "@/lib/status-labels";
import { formatarData, formatarDataHora } from "@/lib/format-data";
import { useToast } from "@/components/ui/toast";
import { Confirmar } from "@/components/ui/confirmar";

type Tenant = {
  nome: string;
  codigo: string;
  cnpj: string | null;
  razao_social: string | null;
};
type Assinatura = {
  estado: string;
  valor_por_patio: number;
  vencimento: string | null;
} | null;
type Dispositivo = {
  id: string;
  nome: string | null;
  device_uuid: string;
  status: string;
  ultimo_acesso: string | null;
  patio_id: string;
};
type Patio = {
  id: string;
  nome: string;
  codigoAcesso?: string | null;
  ativo?: boolean;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/* ---------- Tokens (fiéis ao protótipo) ---------- */

const cardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E8EC",
  borderRadius: 16,
  boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
  overflow: "hidden",
};
const cardHeadStyle: CSSProperties = {
  padding: "14px 18px",
  borderBottom: "1px solid #E4E8EC",
  display: "flex",
  alignItems: "center",
  gap: 9,
};
const cardTitleStyle: CSSProperties = { margin: 0, fontSize: 13, fontWeight: 700 };
const iconGreen: CSSProperties = { width: 15, height: 15, color: "#16A34A" };

// Pílula de estado (mapeia estado real → cores do protótipo).
const PILL_CLS: Record<string, CSSProperties> = {
  ativa: { background: "#DCFCE7", color: "#16A34A", border: "1px solid #BBF7D0" },
  atrasada: { background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A" },
  suspensa: { background: "#FEF1F1", color: "#E11D48", border: "1px solid #FBD0D0" },
};
const pillBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 999,
  padding: "4px 11px",
};

function ReadRow({
  label,
  value,
  mono,
  last,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "11px 0",
        borderBottom: last ? "none" : "1px solid #EEF1F3",
      }}
    >
      <span style={{ fontSize: 13, color: "#6B7280" }}>{label}</span>
      <span
        className={mono ? "mono" : undefined}
        style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}
      >
        {value}
      </span>
    </div>
  );
}

export function ConfiguracoesClient({
  tenant,
  assinatura,
  dispositivos,
  patios,
  qtdPatiosAtivos,
}: {
  tenant: Tenant | null;
  assinatura: Assinatura;
  dispositivos: Dispositivo[];
  patios: Patio[];
  qtdPatiosAtivos: number;
}) {
  const toast = useToast();
  const nomePatio = (id: string) =>
    patios.find((p) => p.id === id)?.nome ?? "—";

  const estadoKey = assinatura?.estado ?? "ativa";
  const estadoPill = PILL_CLS[estadoKey] ?? PILL_CLS.ativa;
  const estadoRotulo = labelAssinaturaEstado(estadoKey);
  const mensalidade =
    (Number(assinatura?.valor_por_patio) || 0) * qtdPatiosAtivos;
  const patiosAtivos = patios.filter((p) => p.ativo !== false);

  function copiarCodigoPatio(p: Patio) {
    if (!p.codigoAcesso) return;
    navigator.clipboard.writeText(p.codigoAcesso);
    toast.sucesso("Copiado!", `Código do ${p.nome}: ${p.codigoAcesso}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "-.02em",
          }}
        >
          Configurações
        </h1>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          Preferências da rede{" "}
          <b style={{ color: "#1F2937" }}>{tenant?.nome ?? "—"}</b>
        </div>
      </motion.header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* Dados da rede (editável — mantém atualizarRede) */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06 }}
          style={cardStyle}
        >
          <div style={cardHeadStyle}>
            <Building2 style={iconGreen} />
            <h3 style={cardTitleStyle}>Dados da rede</h3>
          </div>
          <div style={{ padding: "8px 18px 16px" }}>
            <FormRede tenant={tenant} />

            <div style={{ marginTop: 6 }}>
              <ReadRow
                label="Pátios ativos"
                value={qtdPatiosAtivos}
                mono
                last={patiosAtivos.length === 0}
              />
              {patiosAtivos.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "11px 0",
                    borderBottom:
                      i === patiosAtivos.length - 1
                        ? "none"
                        : "1px solid #EEF1F3",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "#6B7280",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.nome}
                  </span>
                  <button
                    onClick={() => copiarCodigoPatio(p)}
                    title="Copiar código de acesso"
                    className="mono"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: ".14em",
                      color: "#16A34A",
                      background: "#DCFCE7",
                      border: "1px solid #BBF7D0",
                      borderRadius: 8,
                      padding: "4px 10px",
                      cursor: "pointer",
                    }}
                  >
                    {p.codigoAcesso ?? "????"}
                    <Copy style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ))}
            </div>
            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                fontSize: 12,
                color: "#8695A0",
                lineHeight: 1.5,
              }}
            >
              O operador entra no app com o código do pátio dele + usuário +
              senha — e já cai direto na unidade.
            </p>
          </div>
        </motion.section>

        {/* Assinatura (leitura + pílula de estado) */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          style={cardStyle}
        >
          <div style={{ ...cardHeadStyle, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <CreditCard style={iconGreen} />
              <h3 style={cardTitleStyle}>Assinatura</h3>
            </div>
            <span style={{ ...pillBase, ...estadoPill }}>{estadoRotulo}</span>
          </div>
          <div style={{ padding: "8px 18px 16px" }}>
            <ReadRow
              label="Valor por pátio"
              value={moeda.format(Number(assinatura?.valor_por_patio) || 0)}
              mono
            />
            <ReadRow
              label={`Mensalidade (${qtdPatiosAtivos} pátios)`}
              value={
                <span className="mono" style={{ color: "#16A34A", fontWeight: 700 }}>
                  {moeda.format(mensalidade)}
                </span>
              }
            />
            <ReadRow
              label="Próximo vencimento"
              value={
                assinatura?.vencimento
                  ? formatarData(assinatura.vencimento)
                  : "—"
              }
              mono
              last
            />
            {estadoKey !== "ativa" && (
              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#B45309",
                  background: "#FEF3C7",
                  border: "1px solid #FDE68A",
                  borderRadius: 10,
                  padding: "9px 12px",
                }}
              >
                Regularize a assinatura para manter o painel e o app liberados.
              </p>
            )}
          </div>
        </motion.section>
      </div>

      {/* Dispositivos (faixa full-width no estilo do protótipo) */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        style={cardStyle}
      >
        <div style={cardHeadStyle}>
          <Smartphone style={iconGreen} />
          <h3 style={cardTitleStyle}>Dispositivos ({dispositivos.length})</h3>
        </div>
        {dispositivos.length === 0 ? (
          <p
            style={{
              padding: "40px 18px",
              textAlign: "center",
              fontSize: 13,
              color: "#8695A0",
            }}
          >
            Nenhum dispositivo registrado ainda. Cada celular/maquininha que
            fizer login aparece aqui.
          </p>
        ) : (
          <div>
            {dispositivos.map((d, i) => {
              const ativo = d.status === "ativo";
              return (
                <div
                  key={d.id}
                  style={{
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    borderTop: i === 0 ? "none" : "1px solid #EEF1F3",
                    opacity: d.status === "revogado" ? 0.55 : 1,
                  }}
                >
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      background: ativo ? "#DCFCE7" : "#FEF1F1",
                      color: ativo ? "#16A34A" : "#E11D48",
                    }}
                  >
                    {ativo ? (
                      <ShieldCheck style={{ width: 19, height: 19 }} />
                    ) : (
                      <ShieldX style={{ width: 19, height: 19 }} />
                    )}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.nome || "Dispositivo sem nome"}
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#8695A0",
                        }}
                      >
                        {nomePatio(d.patio_id)}
                      </span>
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 12,
                        color: "#8695A0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.device_uuid}
                      {d.ultimo_acesso &&
                        ` · visto ${formatarDataHora(d.ultimo_acesso)}`}
                    </div>
                  </div>
                  <span
                    style={{
                      ...pillBase,
                      ...(ativo ? PILL_CLS.ativa : PILL_CLS.suspensa),
                    }}
                  >
                    {ativo ? "online" : "revogado"}
                  </span>
                  <BotaoDispositivo dispositivo={d} />
                </div>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
}

/* ---------- Formulário editável: dados da rede ---------- */

function FormRede({ tenant }: { tenant: Tenant | null }) {
  const toast = useToast();
  const router = useRouter();
  const [nome, setNome] = useState(tenant?.nome ?? "");
  const [razao, setRazao] = useState(tenant?.razao_social ?? "");
  const [cnpj, setCnpj] = useState(
    tenant?.cnpj ? formatarCnpj(tenant.cnpj) : "",
  );
  const [salvando, setSalvando] = useState(false);

  const cnpjDigitos = soDigitos(cnpj);
  const cnpjIncompleto = cnpjDigitos.length > 0 && cnpjDigitos.length < 14;
  const cnpjInvalido = cnpjDigitos.length === 14 && !cnpjValido(cnpjDigitos);
  const podeSalvar =
    nome.trim().length >= 2 && !cnpjIncompleto && !cnpjInvalido && !salvando;

  async function salvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    const r = await atualizarRede({
      nome: nome.trim(),
      razaoSocial: razao.trim() || null,
      cnpj: cnpjDigitos || null,
    });
    setSalvando(false);
    if (r?.ok) {
      toast.sucesso("Salvo!", r.msg);
      router.refresh();
    } else toast.erro("Não deu certo", r?.msg ?? "Erro inesperado.");
  }

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#6B7280",
    marginBottom: 6,
  };
  const inputBase: CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid #E4E8EC",
    background: "#fff",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  };
  const inputErro: CSSProperties = { border: "1px solid rgba(225,29,72,.5)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={labelStyle}>Nome da rede</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Rede Estacionar"
          style={inputBase}
        />
      </div>
      <div>
        <label style={labelStyle}>Razão social (opcional)</label>
        <input
          value={razao}
          onChange={(e) => setRazao(e.target.value)}
          placeholder="Ex.: Estacionar Serviços Ltda"
          style={inputBase}
        />
      </div>
      <div>
        <label style={labelStyle}>CNPJ (opcional)</label>
        <input
          value={cnpj}
          onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          className="mono"
          style={
            cnpjInvalido || cnpjIncompleto
              ? { ...inputBase, ...inputErro }
              : inputBase
          }
        />
        {(cnpjInvalido || cnpjIncompleto) && (
          <p
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 12,
              fontWeight: 600,
              color: "#E11D48",
            }}
          >
            {cnpjIncompleto
              ? "CNPJ incompleto (14 dígitos)."
              : "CNPJ inválido — confira os dígitos."}
          </p>
        )}
      </div>
      <button
        onClick={salvar}
        disabled={!podeSalvar}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          alignSelf: "flex-start",
          height: 40,
          padding: "0 18px",
          borderRadius: 11,
          border: "none",
          background: "linear-gradient(90deg,#16A34A,#22C55E)",
          boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          cursor: podeSalvar ? "pointer" : "not-allowed",
          opacity: podeSalvar ? 1 : 0.6,
        }}
      >
        {salvando ? (
          <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
        ) : (
          <Save style={{ width: 15, height: 15 }} />
        )}
        Salvar dados da rede
      </button>
    </div>
  );
}

function BotaoDispositivo({ dispositivo }: { dispositivo: Dispositivo }) {
  const toast = useToast();
  const [pendente, comecar] = useTransition();

  async function executar() {
    const r = await alternarDispositivo(dispositivo.id, dispositivo.status);
    if (r?.ok) toast.sucesso(r.msg);
    else toast.erro(r?.msg ?? "Erro inesperado.");
  }

  const btnBase: CSSProperties = {
    height: 36,
    padding: "0 14px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  };

  if (dispositivo.status === "ativo") {
    return (
      <Confirmar
        titulo="Revogar dispositivo?"
        descricao={`"${dispositivo.nome || dispositivo.device_uuid.slice(0, 12)}" perde o acesso no próximo sync. Use se o aparelho foi perdido ou trocado.`}
        rotuloConfirmar="Revogar"
        aoConfirmar={executar}
      >
        {(abrir) => (
          <button
            onClick={abrir}
            style={{
              ...btnBase,
              border: "1px solid #FBD0D0",
              background: "#FEF1F1",
              color: "#E11D48",
            }}
          >
            revogar
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
        height: 36,
        padding: "0 14px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        border: "1px solid #BBF7D0",
        background: "#DCFCE7",
        color: "#16A34A",
        cursor: pendente ? "not-allowed" : "pointer",
        opacity: pendente ? 0.6 : 1,
      }}
    >
      reativar
    </button>
  );
}
