"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Gauge, Loader2, Plus, Save } from "lucide-react";
import {
  atualizarTarifa,
  criarTarifa,
  type Resultado,
} from "@/app/painel/tarifas/actions";
import { nomeAmigavel } from "@/lib/nome-amigavel";
import type { TarifaSim } from "@/lib/tarifa-engine";
import { useToast } from "@/components/ui/toast";
import { ModalSimulador } from "@/components/tarifas/simulador-modal";
import { ComoCobra, CamposHospede, type AvulsaAtraso } from "@/components/tarifas/campos-hospede";

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

/** Tarifa salva, como a página de edição lê do banco. */
export type TarifaEdicao = {
  id: string;
  nome: string;
  tipo_veiculo: string;
  fracao_inicial_minutos: number;
  fracao_inicial_valor: number;
  fracao_adicional_minutos: number;
  fracao_adicional_valor: number;
  teto_diaria: number;
  tolerancia_minutos: number;
  pernoite_valor: number;
  pernoite_hora_inicio: number;
  pernoite_hora_fim: number;
  // db/42 — ausentes num banco anterior à migração.
  modalidade?: string;
  diaria_valor?: number | null;
  diaria_horas?: number | null;
  tarifa_atraso_id?: string | null;
};

/**
 * Formulário de tarifa: cria (/painel/tarifas/nova) ou edita
 * (/painel/tarifas/[id], com `tarifa`). Volta para a lista ao salvar.
 */
export function NovaTarifaForm({
  patioId,
  tipos,
  avulsas,
  tarifa,
}: {
  patioId: string;
  tipos: string[];
  avulsas: AvulsaAtraso[];
  tarifa?: TarifaEdicao;
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const edicao = tarifa !== undefined;
  const [modalidade, setModalidade] = useState<"avulso" | "hospede">(
    tarifa?.modalidade === "hospede" ? "hospede" : "avulso",
  );
  const [tipo, setTipo] = useState(tarifa?.tipo_veiculo ?? tipos[0] ?? "carro");
  const hospede = modalidade === "hospede";
  const [comTeto, setComTeto] = useState((tarifa?.teto_diaria ?? 0) > 0);
  const [comPernoite, setComPernoite] = useState((tarifa?.pernoite_valor ?? 0) > 0);
  // Mudanças não salvas (só na edição): avisa antes de sair da página.
  const [sujo, setSujo] = useState(false);
  const urlLista = `/painel/tarifas?patio=${patioId}`;
  /** Valor inicial de um campo: o salvo na edição, o padrão na criação. */
  const ini = (k: keyof TarifaEdicao, padrao: string) =>
    tarifa && tarifa[k] !== undefined && tarifa[k] !== null ? String(tarifa[k]) : padrao;
  const [simulacao, setSimulacao] = useState<{
    nome: string;
    tarifa: TarifaSim;
  } | null>(null);
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    edicao ? atualizarTarifa : criarTarifa,
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
      // router.push é navegação do cliente: o aviso de "sair sem salvar"
      // (beforeunload e clique em link) não dispara aqui.
      toast.sucesso(edicao ? "Tarifa atualizada!" : "Tarifa criada!", estado.msg);
      router.push(urlLista);
    } else {
      toast.erro("Não deu certo", estado.msg);
    }
  }, [estado, toast, router, urlLista, edicao]);

  // Sair sem salvar: fechar/recarregar a aba (beforeunload) e clicar num link
  // do painel (navegação do cliente, que o beforeunload não pega).
  useEffect(() => {
    if (!sujo) return;
    const antesDeSair = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const aoClicar = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || a.getAttribute("target") === "_blank") return;
      if (!window.confirm("Sair sem salvar? As mudanças desta tarifa serão perdidas.")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", antesDeSair);
    document.addEventListener("click", aoClicar, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeSair);
      document.removeEventListener("click", aoClicar, true);
    };
  }, [sujo]);

  function cancelar() {
    if (sujo && !window.confirm("Sair sem salvar? As mudanças desta tarifa serão perdidas.")) {
      return;
    }
    router.push(urlLista);
  }

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
      <form
        ref={formRef}
        action={agir}
        onChange={() => edicao && setSujo(true)}
      >
        <input type="hidden" name="patio_id" value={patioId} />
        <input type="hidden" name="modalidade" value={modalidade} />
        {tarifa && <input type="hidden" name="id" value={tarifa.id} />}

        {edicao && (
          <p
            style={{
              margin: "0 0 16px",
              padding: "10px 13px",
              borderRadius: 11,
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              fontSize: 13,
              color: "#14532D",
            }}
          >
            A alteração vale já na próxima cobrança do app, depois da
            sincronização do aparelho.
          </p>
        )}

        {/* ── Como cobra: muda o formulário, por isso vem primeiro ── */}
        <ComoCobra valor={modalidade} aoMudar={setModalidade} travado={edicao} />

        {/* ── Básico ── */}
        <div style={{ ...cssGrid3, marginTop: 18 }}>
          <Campo label="Nome">
            <input
              name="nome"
              placeholder="Padrão"
              defaultValue={tarifa?.nome ?? ""}
              style={cssInput}
            />
          </Campo>
          <Campo label="Tipo de veículo">
            <div style={{ position: "relative" }}>
              <select
                name="tipo_veiculo"
                value={hospede && tipo === "ambos" ? (tipos[0] ?? "carro") : tipo}
                onChange={(e) => setTipo(e.target.value)}
                style={{
                  ...cssInput,
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  fontWeight: 600,
                  paddingRight: 34,
                }}
              >
                {/* tipo salvo que saiu do cadastro continua selecionável */}
                {tarifa &&
                  !tipos.includes(tarifa.tipo_veiculo) &&
                  tarifa.tipo_veiculo !== "ambos" && (
                    <option value={tarifa.tipo_veiculo}>
                      {nomeAmigavel(tarifa.tipo_veiculo)}
                    </option>
                  )}
                {tipos.map((t) => (
                  <option key={t} value={t}>
                    {nomeAmigavel(t)}
                  </option>
                ))}
                {/* Hóspede é por tipo: a tabela do atraso sai das avulsas dele. */}
                {!hospede && <option value="ambos">Todos os tipos</option>}
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
          {/* Em hóspede vale a tolerância da tabela do atraso (regra 12). */}
          {!hospede && (
            <Campo label="Tolerância (min)">
              <input
                name="tolerancia_minutos"
                type="number"
                defaultValue={ini("tolerancia_minutos", "10")}
                className="mono"
                style={cssInput}
              />
            </Campo>
          )}
        </div>

        {hospede && (
          <CamposHospede
            tipo={hospede && tipo === "ambos" ? (tipos[0] ?? "carro") : tipo}
            avulsas={avulsas}
            inicial={
              tarifa
                ? {
                    diaria_valor: tarifa.diaria_valor ?? null,
                    diaria_horas: tarifa.diaria_horas ?? null,
                    tarifa_atraso_id: tarifa.tarifa_atraso_id ?? null,
                  }
                : undefined
            }
          />
        )}

        {!hospede && (<>
        {/* ── Preço base: a cobrança por tempo de sempre ── */}
        <div style={cssSection}>Preço base</div>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#56655B" }}>
          Quanto o cliente paga pelo tempo que fica no pátio.
        </p>
        <div style={{ ...cssGrid3, marginTop: 12 }}>
          <Campo label="Fração inicial (min)">
            <input
              name="fracao_inicial_minutos"
              type="number"
              defaultValue={ini("fracao_inicial_minutos", "15")}
              className="mono"
              style={cssInput}
            />
          </Campo>
          <Campo label="Valor inicial (R$)">
            <input
              name="fracao_inicial_valor"
              defaultValue={ini("fracao_inicial_valor", "5.00")}
              className="mono"
              style={cssInput}
            />
          </Campo>
          <div />
          <Campo label="Fração adicional (min)">
            <input
              name="fracao_adicional_minutos"
              type="number"
              defaultValue={ini("fracao_adicional_minutos", "15")}
              className="mono"
              style={cssInput}
            />
          </Campo>
          <Campo label="Valor adicional (R$)">
            <input
              name="fracao_adicional_valor"
              defaultValue={ini("fracao_adicional_valor", "3.00")}
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
            aoAlternar={() => {
              setComTeto((v) => !v);
              if (edicao) setSujo(true);
            }}
          >
            <Campo label="Teto (R$)">
              <input
                name="teto_diaria"
                defaultValue={(tarifa?.teto_diaria ?? 0) > 0 ? ini("teto_diaria", "60.00") : "60.00"}
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
            aoAlternar={() => {
              setComPernoite((v) => !v);
              if (edicao) setSujo(true);
            }}
          >
            <Campo label="Valor do pernoite (R$)">
              <input
                name="pernoite_valor"
                defaultValue={(tarifa?.pernoite_valor ?? 0) > 0 ? ini("pernoite_valor", "40.00") : "40.00"}
                className="mono"
                style={cssInput}
              />
            </Campo>
            <Campo label="Início da janela (h)">
              <input
                name="pernoite_hora_inicio"
                type="number"
                defaultValue={ini("pernoite_hora_inicio", "22")}
                className="mono"
                style={cssInput}
              />
            </Campo>
            <Campo label="Fim da janela (h)">
              <input
                name="pernoite_hora_fim"
                type="number"
                defaultValue={ini("pernoite_hora_fim", "8")}
                className="mono"
                style={cssInput}
              />
            </Campo>
          </LinhaToggle>
          {!comPernoite && (
            <>
              <input type="hidden" name="pernoite_valor" value="0" />
              <input
                type="hidden"
                name="pernoite_hora_inicio"
                value={ini("pernoite_hora_inicio", "22")}
              />
              <input
                type="hidden"
                name="pernoite_hora_fim"
                value={ini("pernoite_hora_fim", "8")}
              />
            </>
          )}
        </div>
        </>)}

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
            ) : edicao ? (
              <Save style={{ width: 15, height: 15 }} />
            ) : (
              <Plus style={{ width: 15, height: 15 }} />
            )}
            {edicao ? "Salvar alterações" : "Criar tarifa"}
          </button>
          {!hospede && (
            <button type="button" onClick={simular} style={cssBtnOutline}>
              <Gauge style={{ width: 15, height: 15 }} />
              Simular
            </button>
          )}
          <button
            type="button"
            onClick={cancelar}
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
