"use client";

import type { CSSProperties } from "react";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import {
  CreditCard,
  Copy,
  FileText,
  AlertTriangle,
  CalendarClock,
  Receipt,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  Wallet,
  QrCode,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { labelAssinaturaEstado } from "@/lib/status-labels";
import { formatarData, formatarDataHora } from "@/lib/format-data";
import { prepararPagamento } from "@/app/painel/assinatura/actions";
import type { FaturaRow, ProjecaoTrial } from "@/app/painel/assinatura/page";

type Assinatura = {
  estado: string;
  valor_por_patio: number;
  dia_vencimento: number;
  trial_expira_em: string | null;
} | null;

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Pill = { bg: string; border: string; color: string };

// Cores dos "pills" de estado — o texto vem de labelAssinaturaEstado (util central).
const PILLS: Record<string, Pill> = {
  ativa: { bg: "#DCFCE7", border: "#BBF7D0", color: "#16A34A" },
  trial: { bg: "#EEF4FF", border: "#CBD9FB", color: "#2563EB" },
  atrasada: { bg: "#FEF1F1", border: "#FBD0D0", color: "#E11D48" },
  suspensa: { bg: "#FEF1F1", border: "#FBD0D0", color: "#E11D48" },
  cancelada: { bg: "#F1F4F6", border: "#E4E8EC", color: "#6B7280" },
};
const AMBER: Pill = { bg: "#FEF7E6", border: "#FCE3A6", color: "#B45309" };
const INFO: Pill = { bg: "#EEF4FF", border: "#CBD9FB", color: "#2563EB" };

const FORMAS: Record<string, string> = {
  manual: "Manual",
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao: "Cartão",
  boleto: "Boleto",
};

const card: CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E8EC",
  borderRadius: 16,
  boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
};
const cardHeader: CSSProperties = {
  padding: "14px 18px",
  borderBottom: "1px solid #E4E8EC",
  display: "flex",
  alignItems: "center",
  gap: 8,
};
const pixBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 38,
  padding: "0 15px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(90deg,#16A34A,#22C55E)",
  fontSize: 12,
  fontWeight: 700,
  color: "#fff",
  cursor: "pointer",
};
const outlineBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 12px",
  borderRadius: 9,
  border: "1px solid #E4E8EC",
  background: "#fff",
  fontSize: 12,
  fontWeight: 700,
  color: "#6B7280",
};

function pillStyle(p: Pill, small = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    fontSize: small ? 10 : 11,
    fontWeight: 700,
    textTransform: small ? "uppercase" : "none",
    padding: small ? "2px 9px" : "4px 12px",
    borderRadius: 999,
    background: p.bg,
    color: p.color,
    border: `1px solid ${p.border}`,
  };
}

const avisoBox: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  fontSize: 12,
  fontWeight: 600,
  color: "#B45309",
  background: "#FEF7E6",
  border: "1px solid #FCE3A6",
  borderRadius: 10,
  padding: "8px 12px",
};

function competenciaLabel(comp: string): string {
  return new Date(`${comp.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export function AssinaturaClient({
  assinatura,
  qtdPatiosAtivos,
  trialDias,
  proximos,
  historico,
  projecaoTrial,
  gatewayAtivo,
}: {
  assinatura: Assinatura;
  qtdPatiosAtivos: number;
  trialDias: number | null;
  proximos: FaturaRow[];
  historico: FaturaRow[];
  projecaoTrial: ProjecaoTrial | null;
  gatewayAtivo: boolean;
}) {
  const estado = assinatura?.estado ?? "ativa";
  const estadoPill = PILLS[estado] ?? PILLS.ativa;
  const estadoRotulo = labelAssinaturaEstado(estado);
  const valorPatio = Number(assinatura?.valor_por_patio) || 0;
  const mensal = valorPatio * qtdPatiosAtivos;
  const emTrial = estado === "trial";

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
          Assinatura
        </h1>
        <p style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          Plano da sua rede, próximos pagamentos e histórico.
        </p>
      </motion.header>

      {/* Plano atual */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06 }}
        style={{ ...card, padding: 20 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "#DCFCE7",
                color: "#16A34A",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CreditCard size={16} />
            </span>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
              Plano atual
            </h3>
          </div>
          <span style={pillStyle(estadoPill)}>{estadoRotulo}</span>
        </div>

        {emTrial && trialDias !== null && (
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: INFO.color,
              background: INFO.bg,
              border: `1px solid ${INFO.border}`,
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <Clock size={16} style={{ flexShrink: 0 }} />
            {trialDias > 0
              ? `Teste grátis — faltam ${trialDias} ${trialDias === 1 ? "dia" : "dias"}.`
              : "Seu período de teste terminou."}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px 32px",
            fontSize: 13,
          }}
        >
          <Linha rotulo="Valor por pátio" valor={moeda.format(valorPatio)} />
          <Linha rotulo="Pátios ativos" valor={String(qtdPatiosAtivos)} />
          <Linha
            rotulo="Mensalidade total"
            valor={moeda.format(mensal)}
            destaque
          />
          <Linha
            rotulo="Dia de vencimento"
            valor={
              assinatura?.dia_vencimento
                ? `dia ${assinatura.dia_vencimento}`
                : "—"
            }
            mono={false}
          />
        </div>
      </motion.section>

      {/* Aviso trial: pode pagar já e ativar */}
      {emTrial && (proximos.length > 0 || projecaoTrial) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            borderRadius: 12,
            border: `1px solid ${INFO.border}`,
            background: INFO.bg,
            padding: "12px 15px",
            fontSize: 13,
            color: INFO.color,
          }}
        >
          <Sparkles size={16} style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ margin: 0 }}>
            Você está no <b>período de teste</b>. Pode pagar sua primeira fatura
            quando quiser — assim que o pagamento cair, sua assinatura já fica{" "}
            <b>ativa</b>.
          </p>
        </motion.div>
      )}

      {/* Próximos pagamentos */}
      <Secao
        titulo="Próximos pagamentos"
        Icone={CalendarClock}
        atraso={0.1}
        vazio={
          proximos.length === 0 && !projecaoTrial
            ? "Nenhuma fatura em aberto. Tudo em dia! 🎉"
            : null
        }
      >
        {projecaoTrial && proximos.length === 0 && (
          <ProjecaoCard projecao={projecaoTrial} gatewayAtivo={gatewayAtivo} />
        )}
        {proximos.map((f, i) => (
          <div
            key={f.id}
            style={{
              padding: "16px 18px",
              borderBottom:
                i < proximos.length - 1 ? "1px solid #EEF1F3" : undefined,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    textTransform: "capitalize",
                  }}
                >
                  {competenciaLabel(f.competencia)}
                </div>
                <div style={{ fontSize: 12, color: "#8695A0", marginTop: 1 }}>
                  Vencimento {formatarData(f.vencimento)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={pillStyle(
                    f.estado === "vencida" ? PILLS.atrasada : AMBER,
                    true,
                  )}
                >
                  {f.estado === "vencida" ? "vencida" : "em aberto"}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 18, fontWeight: 700 }}
                >
                  {moeda.format(Number(f.valor) || 0)}
                </span>
              </div>
            </div>
            <OpcoesPagamento fatura={f} gatewayAtivo={gatewayAtivo} />
          </div>
        ))}
      </Secao>

      {/* Histórico */}
      <Secao
        titulo="Histórico de pagamentos"
        Icone={Receipt}
        atraso={0.14}
        vazio={
          historico.length === 0 ? "Nenhum pagamento registrado ainda." : null
        }
      >
        {historico.map((f, i) => (
          <div
            key={f.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "13px 18px",
              borderBottom:
                i < historico.length - 1 ? "1px solid #EEF1F3" : undefined,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                minWidth: 0,
              }}
            >
              <CheckCircle2
                size={19}
                color="#16A34A"
                style={{ flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    textTransform: "capitalize",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {competenciaLabel(f.competencia)}
                </div>
                <div style={{ fontSize: 12, color: "#8695A0", marginTop: 1 }}>
                  {f.pago_em ? `Pago em ${formatarDataHora(f.pago_em)}` : "Pago"}
                  {f.forma_pagamento
                    ? ` · ${FORMAS[f.forma_pagamento] ?? f.forma_pagamento}`
                    : ""}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <span className="mono" style={{ fontSize: 14, fontWeight: 800 }}>
                {moeda.format(Number(f.valor) || 0)}
              </span>
              <Link
                href={`/recibo/${f.id}`}
                title="Abrir o recibo para imprimir ou salvar em PDF"
                style={{ ...outlineBtn, textDecoration: "none" }}
              >
                Recibo
              </Link>
            </div>
          </div>
        ))}
      </Secao>
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
  mono = true,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
      }}
    >
      <span style={{ color: "#6B7280" }}>{rotulo}</span>
      <span
        className={mono ? "mono" : undefined}
        style={{
          fontWeight: destaque ? 800 : 700,
          color: destaque ? "#16A34A" : "#1F2937",
        }}
      >
        {valor}
      </span>
    </div>
  );
}

function Secao({
  titulo,
  Icone,
  atraso,
  vazio,
  children,
}: {
  titulo: string;
  Icone: typeof Receipt;
  atraso: number;
  vazio: string | null;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: atraso }}
      style={{ ...card, overflow: "hidden" }}
    >
      <div style={cardHeader}>
        <Icone size={15} color="#16A34A" />
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{titulo}</h3>
      </div>
      {vazio ? (
        <p
          style={{
            padding: "40px 18px",
            textAlign: "center",
            fontSize: 13,
            color: "#8695A0",
          }}
        >
          {vazio}
        </p>
      ) : (
        <div>{children}</div>
      )}
    </motion.section>
  );
}

/** Botão que pede ao servidor para emitir a cobrança (PIX/boleto/cartão). */
function BotaoGerarPagamento({
  faturaId,
  rotulo = "Gerar formas de pagamento",
}: {
  faturaId: string | null;
  rotulo?: string;
}) {
  const toast = useToast();
  const [pendente, comecar] = useTransition();
  const [pedirCpf, setPedirCpf] = useState(false);
  const [cpf, setCpf] = useState("");

  function gerar(cpfArg?: string) {
    comecar(async () => {
      const r = await prepararPagamento(faturaId, cpfArg);
      if (r?.ok) {
        toast.sucesso(r.msg);
        setPedirCpf(false);
      } else if (r?.precisaCpf) {
        // Pede o CPF/CNPJ e, se já tinha tentado com um valor, mostra o motivo.
        setPedirCpf(true);
        if (cpfArg) toast.erro(r.msg);
      } else {
        toast.erro(r?.msg ?? "Não foi possível gerar o pagamento.");
      }
    });
  }

  const digitos = cpf.replace(/\D/g, "").length;

  if (pedirCpf) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            color: "#6B7280",
          }}
        >
          Informe o CPF ou CNPJ do responsável pela assinatura para gerar a
          cobrança:
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            inputMode="numeric"
            placeholder="CPF ou CNPJ"
            className="mono"
            style={{
              height: 38,
              padding: "0 13px",
              borderRadius: 10,
              border: "1px solid #E4E8EC",
              background: "#fff",
              fontSize: 13,
              maxWidth: 220,
              outline: "none",
            }}
          />
          <button
            onClick={() => gerar(cpf)}
            disabled={pendente || (digitos !== 11 && digitos !== 14)}
            style={{
              ...pixBtn,
              opacity: pendente || (digitos !== 11 && digitos !== 14) ? 0.6 : 1,
            }}
          >
            {pendente ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Wallet size={14} />
            )}
            {pendente ? "Gerando…" : "Confirmar e gerar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => gerar()}
      disabled={pendente}
      style={{ ...pixBtn, opacity: pendente ? 0.6 : 1 }}
    >
      {pendente ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <QrCode size={14} />
      )}
      {pendente ? "Gerando…" : rotulo}
    </button>
  );
}

/** Card da "próxima fatura" projetada (trial ainda sem linha real de fatura). */
function ProjecaoCard({
  projecao,
  gatewayAtivo,
}: {
  projecao: ProjecaoTrial;
  gatewayAtivo: boolean;
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        background: "#F7FAFF",
        borderBottom: "1px solid #EEF1F3",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              textTransform: "capitalize",
            }}
          >
            {competenciaLabel(projecao.competencia)}
          </div>
          <div style={{ fontSize: 12, color: "#8695A0", marginTop: 1 }}>
            Vencimento {formatarData(projecao.vencimento)} · primeira fatura
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={pillStyle(INFO, true)}>próxima fatura</span>
          <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>
            {moeda.format(projecao.valor)}
          </span>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        {gatewayAtivo ? (
          <BotaoGerarPagamento faturaId={null} rotulo="Pagar com Pix" />
        ) : (
          <div style={avisoBox}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            Pagamento online indisponível no momento — fale com o suporte.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * QR do PIX. Prefere a imagem do gateway; se ela não vier, DESENHA o QR a
 * partir do copia-e-cola.
 *
 * Isso não é um remendo: o copia-e-cola **é** o conteúdo do QR — o app do banco
 * lê exatamente essa string. Ter os dois vindos do Asaas era um acoplamento
 * desnecessário, e ele falha de dois jeitos reais: faturas emitidas antes da
 * coluna `gateway_pix_qrcode` existir (db/23) ficaram com o copia-e-cola
 * preenchido e o QR nulo PARA SEMPRE — e não há como reemitir, porque o botão
 * "Gerar pagamento" some assim que a fatura tem qualquer dado de gateway.
 * Desenhando localmente, toda fatura que tem copia-e-cola passa a ter QR.
 */
function QrPix({
  base64,
  copiaCola,
}: {
  base64: string | null;
  copiaCola: string | null;
}) {
  const [gerado, setGerado] = useState<string | null>(null);

  useEffect(() => {
    if (base64 || !copiaCola) return;
    let vivo = true;
    QRCode.toDataURL(copiaCola, { width: 480, margin: 1 })
      .then((url) => {
        if (vivo) setGerado(url);
      })
      .catch(() => {
        if (vivo) setGerado(null);
      });
    return () => {
      vivo = false;
    };
  }, [base64, copiaCola]);

  const src = base64 ? `data:image/png;base64,${base64}` : gerado;
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="QR Code para pagamento via PIX"
      style={{
        width: 176,
        height: 176,
        borderRadius: 10,
        background: "#fff",
        padding: 8,
        border: "1px solid #E4E8EC",
        flexShrink: 0,
      }}
    />
  );
}

function OpcoesPagamento({
  fatura,
  gatewayAtivo,
}: {
  fatura: FaturaRow;
  gatewayAtivo: boolean;
}) {
  const toast = useToast();
  const temAlgum =
    Boolean(fatura.gateway_link) ||
    Boolean(fatura.gateway_pix_copia) ||
    Boolean(fatura.gateway_pix_qrcode) ||
    Boolean(fatura.gateway_boleto_url);

  if (!temAlgum) {
    // Sem cobrança emitida: se o gateway está ativo, o cliente gera na hora.
    return (
      <div style={{ marginTop: 14 }}>
        {gatewayAtivo ? (
          <BotaoGerarPagamento faturaId={fatura.id} rotulo="Pagar com Pix" />
        ) : (
          <div style={avisoBox}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            Cobrança ainda não emitida — fale com o suporte.
          </div>
        )}
      </div>
    );
  }

  function copiarPix() {
    if (!fatura.gateway_pix_copia) return;
    navigator.clipboard.writeText(fatura.gateway_pix_copia);
    toast.sucesso("Copiado!", "Código PIX copiado para a área de transferência.");
  }

  const temPix = Boolean(fatura.gateway_pix_qrcode || fatura.gateway_pix_copia);

  return (
    <div
      style={{
        marginTop: 14,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* PIX — QR + copia-e-cola direto na tela */}
      {temPix && (
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #E4E8EC",
            background: "#FAFBFC",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                background: "#DCFCE7",
                color: "#16A34A",
                display: "grid",
                placeItems: "center",
              }}
            >
              <QrCode size={14} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Pague com PIX</span>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <QrPix
              base64={fatura.gateway_pix_qrcode}
              copiaCola={fatura.gateway_pix_copia}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#8695A0" }}>
                Escaneie o QR no app do seu banco ou copie o código abaixo.
              </p>
              {fatura.gateway_pix_copia && (
                <>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      wordBreak: "break-all",
                      background: "#fff",
                      border: "1px solid #E4E8EC",
                      borderRadius: 10,
                      padding: 10,
                      maxHeight: 96,
                      overflowY: "auto",
                      color: "#6B7280",
                      userSelect: "all",
                    }}
                  >
                    {fatura.gateway_pix_copia}
                  </div>
                  <button
                    onClick={copiarPix}
                    style={{
                      marginTop: 8,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 34,
                      padding: "0 13px",
                      borderRadius: 9,
                      background: "#DCFCE7",
                      border: "1px solid #BBF7D0",
                      color: "#16A34A",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Copy size={14} />
                    Copiar código PIX
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cartão / boleto — alternativas */}
      {(fatura.gateway_link || fatura.gateway_boleto_url) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {fatura.gateway_link && (
            <a
              href={fatura.gateway_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...pixBtn, textDecoration: "none" }}
            >
              <CreditCard size={14} />
              Pagar com cartão
            </a>
          )}
          {fatura.gateway_boleto_url && (
            <a
              href={fatura.gateway_boleto_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...outlineBtn, height: 38, textDecoration: "none" }}
            >
              <FileText size={14} />
              Ver boleto
            </a>
          )}
        </div>
      )}
    </div>
  );
}
