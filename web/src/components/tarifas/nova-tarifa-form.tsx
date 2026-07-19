"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Gauge, Loader2, Plus } from "lucide-react";
import { criarTarifa, type Resultado } from "@/app/painel/tarifas/actions";
import { nomeAmigavel } from "@/lib/nome-amigavel";
import type { TarifaSim } from "@/lib/tarifa-engine";
import { useToast } from "@/components/ui/toast";
import { ModalSimulador } from "@/components/tarifas/simulador-modal";

// ── Tokens do painel (fiéis ao protótipo Claude Design) ──
const cssLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#6B7280",
  marginBottom: 6,
};
const cssInput: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 11,
  border: "1px solid #E4E8EC",
  background: "#FAFBFC",
  fontSize: 13,
  color: "#1F2937",
  padding: "0 13px",
  outline: "none",
};
const cssSection: React.CSSProperties = {
  marginTop: 8,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "#8695A0",
  paddingTop: 16,
  borderTop: "1px solid #EEF1F3",
};
const cssGrid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};
const cssBtnOutline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 42,
  padding: "0 16px",
  borderRadius: 11,
  border: "1px solid #E4E8EC",
  background: "#fff",
  fontSize: 13,
  fontWeight: 700,
  color: "#6B7280",
  cursor: "pointer",
};

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={cssLabel}>{label}</label>
      {children}
    </div>
  );
}

function Interruptor({
  ligado,
  aoAlternar,
}: {
  ligado: boolean;
  aoAlternar: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={aoAlternar}
      style={{
        width: 44,
        height: 25,
        borderRadius: 999,
        background: ligado ? "#22C55E" : "#D5DBE1",
        position: "relative",
        flexShrink: 0,
        border: "none",
        cursor: "pointer",
        transition: "background .2s",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: ligado ? 21 : 2,
          width: 21,
          height: 21,
          borderRadius: 999,
          background: "#fff",
          boxShadow: "0 1px 2px rgba(16,27,20,.2)",
          transition: "left .2s",
        }}
      />
    </button>
  );
}

function LinhaToggle({
  titulo,
  descricao,
  ligado,
  aoAlternar,
  children,
}: {
  titulo: string;
  descricao: string;
  ligado: boolean;
  aoAlternar: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid #E4E8EC",
        background: "#FAFBFC",
        padding: "14px 15px",
      }}
    >
      <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1F2937" }}>
            {titulo}
          </div>
          <div style={{ fontSize: 12, color: "#8695A0", marginTop: 2, lineHeight: 1.5 }}>
            {descricao}
          </div>
        </div>
        <Interruptor ligado={ligado} aoAlternar={aoAlternar} />
      </div>
      <AnimatePresence initial={false}>
        {ligado && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ ...cssGrid3, marginTop: 14 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Formulário da página /painel/tarifas/nova — redireciona pra consulta ao salvar. */
export function NovaTarifaForm({
  patioId,
  tipos,
}: {
  patioId: string;
  tipos: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [comTeto, setComTeto] = useState(false);
  const [comPernoite, setComPernoite] = useState(false);
  const [simulacao, setSimulacao] = useState<{
    nome: string;
    tarifa: TarifaSim;
  } | null>(null);
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    criarTarifa,
    null,
  );

  /** Lê os valores ATUAIS do formulário (antes de salvar) e abre o simulador. */
  function simular() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const num = (k: string) =>
      Number(String(fd.get(k) ?? "0").replace(",", ".")) || 0;
    setSimulacao({
      nome: String(fd.get("nome") || "Nova tarifa (não salva)"),
      tarifa: {
        tolerancia_minutos: num("tolerancia_minutos"),
        fracao_inicial_minutos: num("fracao_inicial_minutos"),
        fracao_inicial_valor: num("fracao_inicial_valor"),
        fracao_adicional_minutos: num("fracao_adicional_minutos"),
        fracao_adicional_valor: num("fracao_adicional_valor"),
        teto_diaria: num("teto_diaria"),
        pernoite_valor: num("pernoite_valor"),
        pernoite_hora_inicio: num("pernoite_hora_inicio"),
        pernoite_hora_fim: num("pernoite_hora_fim"),
      },
    });
  }

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso("Tarifa criada!", estado.msg);
      router.push(`/painel/tarifas?patio=${patioId}`);
    } else {
      toast.erro("Não deu certo", estado.msg);
    }
  }, [estado, toast, router, patioId]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      style={{
        background: "#fff",
        border: "1px solid #E4E8EC",
        borderRadius: 16,
        boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
        padding: 22,
      }}
    >
      <form ref={formRef} action={agir}>
        <input type="hidden" name="patio_id" value={patioId} />

        {/* ── Básico ── */}
        <div style={cssGrid3}>
          <Campo label="Nome">
            <input name="nome" placeholder="Padrão" style={cssInput} />
          </Campo>
          <Campo label="Tipo de veículo">
            <div style={{ position: "relative" }}>
              <select
                name="tipo_veiculo"
                style={{
                  ...cssInput,
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  fontWeight: 600,
                  paddingRight: 34,
                }}
              >
                {tipos.map((t) => (
                  <option key={t} value={t}>
                    {nomeAmigavel(t)}
                  </option>
                ))}
                <option value="ambos">Todos os tipos</option>
              </select>
              <ChevronDown
                style={{
                  position: "absolute",
                  right: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 14,
                  height: 14,
                  color: "#8695A0",
                  pointerEvents: "none",
                }}
              />
            </div>
          </Campo>
          <Campo label="Tolerância (min)">
            <input
              name="tolerancia_minutos"
              type="number"
              defaultValue="10"
              className="mono"
              style={cssInput}
            />
          </Campo>
        </div>

        {/* ── Cobrança por tempo ── */}
        <div style={cssSection}>Cobrança por tempo</div>
        <div style={{ ...cssGrid3, marginTop: 12 }}>
          <Campo label="Fração inicial (min)">
            <input
              name="fracao_inicial_minutos"
              type="number"
              defaultValue="15"
              className="mono"
              style={cssInput}
            />
          </Campo>
          <Campo label="Valor inicial (R$)">
            <input
              name="fracao_inicial_valor"
              defaultValue="5.00"
              className="mono"
              style={cssInput}
            />
          </Campo>
          <div />
          <Campo label="Fração adicional (min)">
            <input
              name="fracao_adicional_minutos"
              type="number"
              defaultValue="15"
              className="mono"
              style={cssInput}
            />
          </Campo>
          <Campo label="Valor adicional (R$)">
            <input
              name="fracao_adicional_valor"
              defaultValue="3.00"
              className="mono"
              style={cssInput}
            />
          </Campo>
          <div />
        </div>

        {/* ── Regras opcionais (teto / pernoite) ── */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <LinhaToggle
            titulo="Teto de diária"
            descricao="Limita quanto o cliente paga no total. Se a soma das frações passar do teto, o app cobra só o valor do teto — bom para quem deixa o carro o dia inteiro."
            ligado={comTeto}
            aoAlternar={() => setComTeto((v) => !v)}
          >
            <Campo label="Teto (R$)">
              <input
                name="teto_diaria"
                defaultValue="60.00"
                className="mono"
                style={cssInput}
              />
            </Campo>
          </LinhaToggle>
          {!comTeto && <input type="hidden" name="teto_diaria" value="0" />}

          <LinhaToggle
            titulo="Pernoite"
            descricao="Valor fixo para quem atravessa a madrugada no pátio. Se o veículo estiver dentro na janela definida (ex.: 22h às 8h do dia seguinte), o app cobra este valor no lugar da cobrança por tempo."
            ligado={comPernoite}
            aoAlternar={() => setComPernoite((v) => !v)}
          >
            <Campo label="Valor do pernoite (R$)">
              <input
                name="pernoite_valor"
                defaultValue="40.00"
                className="mono"
                style={cssInput}
              />
            </Campo>
            <Campo label="Início da janela (h)">
              <input
                name="pernoite_hora_inicio"
                type="number"
                defaultValue="22"
                className="mono"
                style={cssInput}
              />
            </Campo>
            <Campo label="Fim da janela (h)">
              <input
                name="pernoite_hora_fim"
                type="number"
                defaultValue="8"
                className="mono"
                style={cssInput}
              />
            </Campo>
          </LinhaToggle>
          {!comPernoite && (
            <>
              <input type="hidden" name="pernoite_valor" value="0" />
              <input type="hidden" name="pernoite_hora_inicio" value="22" />
              <input type="hidden" name="pernoite_hora_fim" value="8" />
            </>
          )}
        </div>

        {/* ── Ações ── */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="submit"
            disabled={pendente}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 42,
              padding: "0 18px",
              borderRadius: 11,
              border: "none",
              background: "linear-gradient(90deg,#16A34A,#22C55E)",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              cursor: pendente ? "default" : "pointer",
              boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)",
              opacity: pendente ? 0.7 : 1,
            }}
          >
            {pendente ? (
              <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
            ) : (
              <Plus style={{ width: 15, height: 15 }} />
            )}
            Criar tarifa
          </button>
          <button type="button" onClick={simular} style={cssBtnOutline}>
            <Gauge style={{ width: 15, height: 15 }} />
            Simular
          </button>
          <button
            type="button"
            onClick={() => router.push(`/painel/tarifas?patio=${patioId}`)}
            style={cssBtnOutline}
          >
            Cancelar
          </button>
        </div>
      </form>

      <AnimatePresence>
        {simulacao && (
          <ModalSimulador
            nome={simulacao.nome}
            tarifa={simulacao.tarifa}
            fechar={() => setSimulacao(null)}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
