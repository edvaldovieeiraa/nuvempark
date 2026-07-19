"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  Camera,
  Check,
  RotateCcw,
  Save,
  Printer,
  UserCheck,
  CircleSlash,
  Loader2,
  Building2,
  MonitorSmartphone,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { salvarParametrizacao } from "@/app/painel/parametrizacao/actions";

/* =========================================================
   PARAMETRIZAÇÃO
   Habilitações da operação, por pátio. A primeira: como a
   foto do veículo se comporta na impressão do recibo de
   entrada. Persiste no banco e é lida pelo app no bootstrap.
   ========================================================= */

type ModoFoto = "ativada" | "operador" | "desativada";

type OpcaoModo = {
  valor: ModoFoto;
  titulo: string;
  descricao: string;
  Icone: LucideIcon;
};

const OPCOES: OpcaoModo[] = [
  {
    valor: "ativada",
    titulo: "Impressão ativada para o pátio",
    descricao:
      "A foto do veículo sai sempre no recibo, em toda entrada — o operador não precisa decidir.",
    Icone: Printer,
  },
  {
    valor: "operador",
    titulo: "Operador decide na entrada",
    descricao:
      "Cada entrada mostra uma opção para o operador marcar se imprime a foto ou não.",
    Icone: UserCheck,
  },
  {
    valor: "desativada",
    titulo: "Impressão desativada",
    descricao: "A foto do veículo nunca é impressa no recibo.",
    Icone: CircleSlash,
  },
];

const cardStyle: CSSProperties = {
  borderRadius: 16,
  background: "#fff",
  border: "1px solid #E4E8EC",
  boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
  overflow: "hidden",
};

const cardHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "16px 18px",
  borderBottom: "1px solid #E4E8EC",
};

export function ParametrizacaoClient({
  patioId,
  patioNome,
  modoInicial,
  quiosqueInicial,
}: {
  patioId: string | null;
  patioNome: string | null;
  modoInicial: ModoFoto;
  quiosqueInicial: boolean;
}) {
  const toast = useToast();
  const [salvando, iniciarSalvar] = useTransition();
  const [inicial, setInicial] = useState<ModoFoto>(modoInicial);
  const [modoFoto, setModoFoto] = useState<ModoFoto>(modoInicial);
  const [quiosqueInic, setQuiosqueInic] = useState(quiosqueInicial);
  const [quiosque, setQuiosque] = useState(quiosqueInicial);

  const sujo = modoFoto !== inicial || quiosque !== quiosqueInic;

  const salvar = () => {
    if (!patioId) {
      toast.erro("Selecione um pátio para configurar.");
      return;
    }
    iniciarSalvar(async () => {
      const r = await salvarParametrizacao(patioId, modoFoto, quiosque);
      if (r.ok) {
        setInicial(modoFoto);
        setQuiosqueInic(quiosque);
        toast.sucesso("Parametrização salva.");
      } else {
        toast.erro(r.erro ?? "Não foi possível salvar.");
      }
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        paddingBottom: 112,
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "linear-gradient(135deg,#16A34A,#22C55E)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <SlidersHorizontal style={{ width: 23, height: 23 }} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 23,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              letterSpacing: "-.02em",
              color: "#1F2937",
            }}
          >
            Parametrização
          </h1>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
            Habilitações da operação, por pátio.
          </div>
          {patioNome ? (
            <span
              style={{
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                color: "#6B7280",
                background: "#F1F4F6",
                border: "1px solid #E4E8EC",
                borderRadius: 999,
                padding: "4px 11px",
              }}
            >
              <Building2 style={{ width: 13, height: 13, color: "#16A34A" }} />
              {patioNome}
            </span>
          ) : (
            <span
              style={{
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                color: "#B45309",
                background: "#FEF3C7",
                border: "1px solid #FDE68A",
                borderRadius: 999,
                padding: "4px 11px",
              }}
            >
              Nenhum pátio selecionado
            </span>
          )}
        </div>
      </div>

      {/* Feature 1 — Impressão da foto do veículo no recibo */}
      <section style={cardStyle}>
        <div style={cardHeaderStyle}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: "#DCFCE7",
              color: "#16A34A",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Camera style={{ width: 20, height: 20 }} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              Impressão da foto do veículo no recibo
            </div>
            <div style={{ fontSize: 12, color: "#8695A0" }}>
              Define se a foto tirada na entrada sai impressa no recibo do
              cliente.
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {OPCOES.map((o) => {
            const sel = modoFoto === o.valor;
            return (
              <button
                key={o.valor}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => setModoFoto(o.valor)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 13,
                  borderRadius: 12,
                  padding: 15,
                  cursor: "pointer",
                  transition: "background .15s, border-color .15s",
                  border: sel ? "1px solid #BBF7D0" : "1px solid #E4E8EC",
                  background: sel ? "#DCFCE7" : "#fff",
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    background: sel ? "#16A34A" : "#F1F4F6",
                    color: sel ? "#fff" : "#8695A0",
                  }}
                >
                  <o.Icone style={{ width: 18, height: 18 }} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{ display: "block", fontSize: 14, fontWeight: 700 }}
                  >
                    {o.titulo}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      color: "#6B7280",
                      marginTop: 2,
                    }}
                  >
                    {o.descricao}
                  </span>
                </span>
                {/* indicador de seleção (marca única — só um modo por vez) */}
                {sel ? (
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      background: "#16A34A",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: "grid", placeItems: "center" }}
                    >
                      <Check
                        style={{ width: 15, height: 15, color: "#fff" }}
                        strokeWidth={3.2}
                      />
                    </motion.span>
                  </span>
                ) : (
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      border: "2px solid #E4E8EC",
                      background: "#fff",
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Feature 2 — Modo quiosque do Android */}
      <section style={cardStyle}>
        <div style={cardHeaderStyle}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: "#EEF4FF",
              color: "#0EA5E9",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <MonitorSmartphone style={{ width: 20, height: 20 }} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Modo quiosque</div>
            <div style={{ fontSize: 12, color: "#8695A0" }}>
              Fixa o app na tela do aparelho: bloqueia barra de status,
              notificações e botões do Android.
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Manter o app fixo na tela
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              Recomendado nos aparelhos do pátio: o operador não sai do app sem
              querer. Só sai pelo botão &quot;Sair&quot; do menu.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={quiosque}
            aria-label="Modo quiosque"
            onClick={() => setQuiosque((v) => !v)}
            style={{
              position: "relative",
              flexShrink: 0,
              width: 48,
              height: 28,
              borderRadius: 999,
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: quiosque
                ? "linear-gradient(90deg,#16A34A,#22C55E)"
                : "#D5DBE1",
            }}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 520, damping: 34 }}
              style={{
                position: "absolute",
                top: 3,
                width: 22,
                height: 22,
                borderRadius: 999,
                background: "#fff",
                boxShadow: "0 1px 3px rgba(16,27,20,0.35)",
                left: quiosque ? "calc(100% - 25px)" : 3,
              }}
            />
          </button>
        </div>
      </section>

      {/* Barra de salvar (aparece só quando há mudança) */}
      <AnimatePresence>
        {sujo && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-4 inset-x-4 lg:left-[calc(16rem+2rem)] lg:right-8 z-30"
          >
            <div
              style={{
                margin: "0 auto",
                maxWidth: 640,
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderRadius: 16,
                border: "1px solid #E4E8EC",
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(8px)",
                padding: "12px 16px",
                boxShadow: "0 12px 30px -12px rgba(16,27,20,.24)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#F59E0B",
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#6B7280",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                Você tem alterações não salvas.
              </p>
              <button
                type="button"
                onClick={() => {
                  setModoFoto(inicial);
                  setQuiosque(quiosqueInic);
                }}
                disabled={salvando}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 11,
                  border: "1px solid #E4E8EC",
                  background: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#6B7280",
                  cursor: salvando ? "default" : "pointer",
                  opacity: salvando ? 0.5 : 1,
                }}
              >
                <RotateCcw style={{ width: 16, height: 16 }} />
                <span className="hidden sm:inline">Descartar</span>
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 40,
                  padding: "0 18px",
                  borderRadius: 11,
                  border: "none",
                  background: "linear-gradient(90deg,#16A34A,#22C55E)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: salvando ? "default" : "pointer",
                  boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)",
                  opacity: salvando ? 0.6 : 1,
                }}
              >
                {salvando ? (
                  <Loader2
                    style={{ width: 16, height: 16 }}
                    className="animate-spin"
                  />
                ) : (
                  <Save style={{ width: 16, height: 16 }} />
                )}
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
