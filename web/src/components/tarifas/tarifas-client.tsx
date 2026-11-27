"use client";

import {
  useState,
  useTransition,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleDollarSign,
  Plus,
  Trash2,
  Pencil,
  Calculator,
  Save,
  ArrowUp,
  ArrowDown,
  Star,
} from "lucide-react";
import { ModalSimulador } from "./simulador-modal";
import {
  desativarTarifa,
  reordenarTarifas,
} from "@/app/painel/tarifas/actions";
import { nomeAmigavel } from "@/lib/nome-amigavel";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Confirmar } from "@/components/ui/confirmar";

type Tarifa = {
  id: string;
  nome: string;
  patio_id: string;
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

const ehHospede = (t: Tarifa) => t.modalidade === "hospede";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function TarifasClient({
  tarifas,
  patioId,
  patioNome,
}: {
  tarifas: Tarifa[];
  patioId: string;
  patioNome: string;
}) {
  const [simulando, setSimulando] = useState<Tarifa | null>(null);
  const [ordem, setOrdem] = useState<Tarifa[]>(tarifas);
  const [sujo, setSujo] = useState(false);
  const [salvandoOrdem, comecarOrdem] = useTransition();

  // Re-sincroniza quando a lista do server muda (após criar/desativar).
  const idsServidor = tarifas.map((t) => t.id).join();
  const [idsAnterior, setIdsAnterior] = useState(idsServidor);
  if (idsServidor !== idsAnterior) {
    setIdsAnterior(idsServidor);
    setOrdem(tarifas);
    setSujo(false);
  }

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= ordem.length) return;
    const copia = [...ordem];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setOrdem(copia);
    setSujo(true);
  }

  function salvarOrdem() {
    comecarOrdem(async () => {
      const r = await reordenarTarifas(ordem.map((t) => t.id));
      if (r?.ok) {
        toastRef.sucesso(r.msg);
        setSujo(false);
      } else toastRef.erro(r?.msg ?? "Erro inesperado.");
    });
  }

  const toastRef = useToast();

  // KPIs derivados dos dados reais. A tarifa "primária" é a primeira da ordem
  // (a que o app deixa pré-selecionada), então a base/hora vem dela.
  // Tarifa de hóspede nunca é pré-selecionada no app: a primária é a
  // primeira AVULSA da ordem.
  const avulsasOrdem = ordem.filter((t) => !ehHospede(t));
  const primaria = avulsasOrdem[0] ?? null;
  const tetoMax = avulsasOrdem.reduce((m, t) => Math.max(m, t.teto_diaria), 0);
  const traco = "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          {/* /painel/cadastros não existe: mantém o estilo do back link sem alvo. */}
          <span
            style={{
              fontSize: 12,
              color: "#6B7280",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            ‹ Cadastros
          </span>
          <h2
            style={{
              margin: "2px 0 0",
              fontSize: 23,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Tarifas
          </h2>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
            <b style={{ color: "#1F2937" }}>{patioNome}</b> · {tarifas.length}{" "}
            {tarifas.length === 1 ? "tabela ativa" : "tabelas ativas"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {sujo && (
            <Botao carregando={salvandoOrdem} onClick={salvarOrdem} type="button">
              <Save className="w-4 h-4" />
              Salvar ordem
            </Botao>
          )}
          <Link
            href={`/painel/tarifas/nova?patio=${patioId}`}
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
              boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)",
            }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Nova tabela
          </Link>
        </div>
      </motion.header>

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
        }}
      >
        <KpiCard
          rotulo="Tarifa base / hora"
          valor={primaria ? moeda.format(primaria.fracao_inicial_valor) : traco}
          cor="#16A34A"
        />
        <KpiCard
          rotulo="Diária máxima"
          valor={tetoMax > 0 ? moeda.format(tetoMax) : traco}
        />
        <KpiCard
          rotulo="Tolerância"
          valor={primaria ? `${primaria.tolerancia_minutos} min` : traco}
        />
      </motion.div>

      {/* Tabela */}
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
        {tarifas.length === 0 ? (
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
            <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
              <CircleDollarSign className="w-6 h-6 text-brand-600" />
            </span>
            <p style={{ fontSize: 13, color: "#8695A0" }}>
              Nenhuma tarifa neste pátio ainda.
            </p>
            <Link
              href={`/painel/tarifas/nova?patio=${patioId}`}
              style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}
            >
              Criar a primeira tarifa
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead>
                <tr style={{ textAlign: "left", background: "#FAFBFC" }}>
                  <Th>Tabela</Th>
                  <Th>Tipo</Th>
                  <Th right>1ª hora</Th>
                  <Th right>Hora adic.</Th>
                  <Th right>Diária</Th>
                  <Th>Status</Th>
                  <Th right>Ações</Th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {ordem.map((t, i) => (
                    <motion.tr
                      key={t.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      style={{
                        borderTop: "1px solid #EEF1F3",
                        background: i % 2 === 1 ? "#FAFBFC" : undefined,
                      }}
                    >
                      <td style={{ padding: "12px 18px", fontWeight: 700 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {t.nome}
                          {ehHospede(t) && (
                            <span
                              title="Diária de hóspede: paga na chegada, entra e sai à vontade"
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: ".04em",
                                color: "#15803D",
                                background: "#DCFCE7",
                                border: "1px solid #BBF7D0",
                                borderRadius: 999,
                                padding: "2px 8px",
                              }}
                            >
                              hóspede
                            </span>
                          )}
                          {t.id === primaria?.id && (
                            <span
                              title="Já vem selecionada no app do operador"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: ".04em",
                                color: "#16A34A",
                                background: "#DCFCE7",
                                border: "1px solid #BBF7D0",
                                borderRadius: 999,
                                padding: "2px 8px",
                              }}
                            >
                              <Star style={{ width: 11, height: 11 }} />
                              padrão no app
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px", color: "#6B7280" }}>
                        {nomeAmigavel(t.tipo_veiculo)}
                      </td>
                      {ehHospede(t) ? (
                        <td
                          colSpan={3}
                          style={{ padding: "12px 12px", textAlign: "right", color: "#374151" }}
                        >
                          <b className="mono">{moeda.format(Number(t.diaria_valor ?? 0))}</b> por{" "}
                          {t.diaria_horas ?? 24} h · atraso pela{" "}
                          {avulsasOrdem.find((x) => x.id === t.tarifa_atraso_id)?.nome ??
                            "primeira avulsa"}
                        </td>
                      ) : (
                        <>
                      <td
                        className="mono"
                        style={{
                          padding: "12px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                        }}
                      >
                        {t.fracao_inicial_valor > 0
                          ? moeda.format(t.fracao_inicial_valor)
                          : traco}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: "12px 12px",
                          textAlign: "right",
                          color: "#6B7280",
                        }}
                      >
                        {t.fracao_adicional_valor > 0
                          ? moeda.format(t.fracao_adicional_valor)
                          : traco}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: "12px 12px",
                          textAlign: "right",
                          color: "#6B7280",
                        }}
                      >
                        {t.teto_diaria > 0 ? moeda.format(t.teto_diaria) : traco}
                      </td>
                        </>
                      )}
                      <td style={{ padding: "12px 18px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 999,
                            background: "#DCFCE7",
                            color: "#16A34A",
                            border: "1px solid #BBF7D0",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 999,
                              background: "#22C55E",
                            }}
                          />
                          ativa
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 2,
                          }}
                        >
                          {/* Simulador é do motor avulso: não se aplica a hóspede. */}
                          {!ehHospede(t) && (
                            <AcaoBtn
                              onClick={() => setSimulando(t)}
                              aria-label={`Simular cobrança da tarifa ${t.nome}`}
                              title="Simular cobrança"
                            >
                              <Calculator className="w-4 h-4" />
                            </AcaoBtn>
                          )}
                          <Link
                            href={`/painel/tarifas/${t.id}?patio=${patioId}`}
                            aria-label={`Editar tarifa ${t.nome}`}
                            title="Editar"
                            className="w-8 h-8 rounded-lg grid place-items-center text-[#8695A0] hover:text-[#16A34A] hover:bg-[#F1F4F6] transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <AcaoBtn
                            onClick={() => mover(i, -1)}
                            disabled={i === 0}
                            aria-label={`Subir ${t.nome}`}
                            title="Subir"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </AcaoBtn>
                          <AcaoBtn
                            onClick={() => mover(i, 1)}
                            disabled={i === ordem.length - 1}
                            aria-label={`Descer ${t.nome}`}
                            title="Descer"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </AcaoBtn>
                          <BotaoDesativar tarifa={t} />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      {ordem.length > 0 && (
        <p style={{ fontSize: 12, color: "#8695A0" }}>
          A ordem importa: o app deixa a primeira tabela avulsa já selecionada
          (a de hóspede nunca vem marcada sozinha). Lembre
          de <b style={{ color: "#6B7280" }}>salvar</b> depois de mexer na ordem
          — as mudanças chegam ao app na próxima sincronização.
        </p>
      )}

      <AnimatePresence>
        {simulando && (
          <ModalSimulador
            nome={simulando.nome}
            tarifa={simulando}
            fechar={() => setSimulando(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function KpiCard({
  rotulo,
  valor,
  cor,
}: {
  rotulo: string;
  valor: string;
  cor?: string;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: "15px 16px",
        background: "#fff",
        border: "1px solid #E4E8EC",
        boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          color: "#8695A0",
        }}
      >
        {rotulo}
      </div>
      <div
        style={{
          marginTop: 7,
          fontSize: 22,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: cor,
        }}
      >
        {valor}
      </div>
    </div>
  );
}

function Th({
  children,
  right,
}: {
  children: ReactNode;
  right?: boolean;
}) {
  return (
    <th
      style={{
        padding: right ? "11px 12px" : "11px 18px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        color: "#8695A0",
        textAlign: right ? "right" : "left",
      }}
    >
      {children}
    </th>
  );
}

function AcaoBtn({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-8 h-8 rounded-lg grid place-items-center text-[#8695A0] hover:text-[#16A34A] hover:bg-[#F1F4F6] transition-colors disabled:opacity-25 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

function BotaoDesativar({ tarifa }: { tarifa: Tarifa }) {
  const toast = useToast();

  return (
    <Confirmar
      titulo="Desativar tarifa?"
      descricao={`A tarifa "${tarifa.nome}" deixa de valer para novas cobranças no app. Tickets já abertos não são afetados.`}
      rotuloConfirmar="Desativar"
      aoConfirmar={async () => {
        const r = await desativarTarifa(tarifa.id);
        if (r?.ok) toast.sucesso(r.msg);
        else toast.erro(r?.msg ?? "Erro inesperado.");
      }}
    >
      {(abrir) => (
        <button
          onClick={abrir}
          aria-label={`Desativar tarifa ${tarifa.nome}`}
          title="Desativar"
          className="w-8 h-8 rounded-lg grid place-items-center text-[#8695A0] hover:text-perigo hover:bg-perigo-bg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </Confirmar>
  );
}


