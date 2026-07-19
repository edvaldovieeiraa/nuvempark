"use client";

import { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Bike,
  Car,
  Loader2,
  Plus,
  Save,
  Star,
  Trash2,
  Truck,
  type LucideIcon,
} from "lucide-react";
import {
  salvarTiposVeiculo,
  type Resultado,
} from "@/app/painel/tipos-veiculo/actions";
import { nomeAmigavel } from "@/lib/nome-amigavel";
import { useToast } from "@/components/ui/toast";
import { Confirmar } from "@/components/ui/confirmar";

const CARD: React.CSSProperties = {
  borderRadius: 16,
  background: "#fff",
  border: "1px solid #E4E8EC",
  boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
};

const BTN_GREEN: React.CSSProperties = {
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
  cursor: "pointer",
  boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)",
};

/** Cor e ícone de cada tipo, escolhidos pelo nome real. */
function estiloTipo(nome: string): { bg: string; cor: string; Icon: LucideIcon } {
  const n = nome.toLowerCase();
  if (n.includes("moto")) return { bg: "#FFF3E8", cor: "#F97316", Icon: Bike };
  if (
    n.includes("caminhon") ||
    n.includes("caminh") ||
    n.includes("picape") ||
    n.includes("pickup") ||
    n.includes("van") ||
    n.includes("utilit") ||
    n.includes("furg")
  )
    return { bg: "#EEF4FF", cor: "#0EA5E9", Icon: Truck };
  if (n.includes("carro") || n.includes("auto") || n.includes("veic"))
    return { bg: "#DCFCE7", cor: "#16A34A", Icon: Car };
  return { bg: "#F3EEFE", cor: "#8B5CF6", Icon: Car };
}

export function TiposVeiculoClient({
  patioId,
  patioNome,
  tiposIniciais,
  tiposEmUso,
}: {
  patioId: string;
  patioNome: string;
  tiposIniciais: string[];
  /** Tipos referenciados por tarifas ativas (aviso ao remover). */
  tiposEmUso: string[];
}) {
  const toast = useToast();
  const [tipos, setTipos] = useState<string[]>(tiposIniciais);
  const [novo, setNovo] = useState("");
  const [sujo, setSujo] = useState(false);
  const [pendente, comecar] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= tipos.length) return;
    const copia = [...tipos];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setTipos(copia);
    setSujo(true);
  }

  function adicionar() {
    const t = novo.trim().toLowerCase();
    if (!t) return;
    if (tipos.includes(t)) {
      toast.erro("Já existe", `O tipo "${nomeAmigavel(t)}" já está na lista.`);
      return;
    }
    setTipos([...tipos, t]);
    setNovo("");
    setSujo(true);
  }

  function remover(t: string) {
    setTipos(tipos.filter((x) => x !== t));
    setSujo(true);
  }

  function salvar() {
    comecar(async () => {
      const r: Resultado = await salvarTiposVeiculo(patioId, tipos);
      if (r?.ok) {
        toast.sucesso("Salvo!", r.msg);
        setSujo(false);
      } else {
        toast.erro("Não deu certo", r?.msg ?? "Erro inesperado.");
      }
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: "'Poppins',sans-serif",
        color: "#1F2937",
      }}
    >
      {/* Cabeçalho */}
      <motion.div
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
              letterSpacing: "-.02em",
            }}
          >
            Tipos de veículo
          </h2>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
            <b style={{ color: "#1F2937" }}>{patioNome}</b> · categorias que o
            operador escolhe na entrada. A ordem importa: o primeiro já vem
            selecionado no app.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {sujo && (
            <motion.button
              type="button"
              onClick={salvar}
              disabled={pendente}
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -1 }}
              style={{ ...BTN_GREEN, opacity: pendente ? 0.7 : 1 }}
            >
              {pendente ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Salvar alterações
            </motion.button>
          )}
          <motion.button
            type="button"
            onClick={() => inputRef.current?.focus()}
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -1 }}
            style={BTN_GREEN}
          >
            <Plus size={15} />
            Novo tipo
          </motion.button>
        </div>
      </motion.div>

      {/* Grade de tipos */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
          gap: 12,
        }}
      >
        <AnimatePresence initial={false}>
          {tipos.map((t, i) => {
            const { bg, cor, Icon } = estiloTipo(t);
            const emUso = tiposEmUso.includes(t);
            return (
              <motion.div
                key={t}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.25 }}
                style={{
                  ...CARD,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: bg,
                      color: cor,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon size={20} />
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#16A34A",
                      background: "#DCFCE7",
                      border: "1px solid #BBF7D0",
                      borderRadius: 999,
                      padding: "3px 9px",
                    }}
                  >
                    ativo
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {nomeAmigavel(t)}
                    {i === 0 && (
                      <span
                        title="Já vem selecionado no app do operador"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "#16A34A",
                          background: "#DCFCE7",
                          border: "1px solid #BBF7D0",
                          borderRadius: 999,
                          padding: "2px 7px",
                        }}
                      >
                        <Star size={11} />
                        padrão
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#8695A0", marginTop: 2 }}>
                    {emUso ? "Usada em tarifas deste pátio" : "Sem tabela vinculada"}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 12,
                    borderTop: "1px solid #EEF1F3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => mover(i, -1)}
                      disabled={i === 0}
                      aria-label={`Subir ${nomeAmigavel(t)}`}
                      className="w-[30px] h-[30px] rounded-lg grid place-items-center text-[#8695A0] hover:bg-[#F1F4F6] hover:text-[#16A34A] transition-colors disabled:opacity-25 disabled:pointer-events-none"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      onClick={() => mover(i, 1)}
                      disabled={i === tipos.length - 1}
                      aria-label={`Descer ${nomeAmigavel(t)}`}
                      className="w-[30px] h-[30px] rounded-lg grid place-items-center text-[#8695A0] hover:bg-[#F1F4F6] hover:text-[#16A34A] transition-colors disabled:opacity-25 disabled:pointer-events-none"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  <BotaoRemover
                    tipo={t}
                    emUso={emUso}
                    ultimo={tipos.length === 1}
                    onRemover={() => remover(t)}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Adicionar */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        style={{ ...CARD, padding: 18 }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#6B7280",
            marginBottom: 8,
          }}
        >
          Novo tipo
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            placeholder="Ex.: Van, Bicicleta, Caminhão…"
            className="flex-1 h-10 px-3.5 rounded-[11px] border border-[#E4E8EC] text-[13px] text-[#1F2937] placeholder:text-[#8695A0] bg-white focus:outline-none focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/15"
          />
          <motion.button
            type="button"
            onClick={adicionar}
            whileTap={{ scale: 0.96 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 40,
              padding: "0 16px",
              borderRadius: 11,
              border: "1px solid #16A34A",
              background: "#fff",
              fontSize: 13,
              fontWeight: 700,
              color: "#16A34A",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Plus size={15} />
            Adicionar
          </motion.button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#8695A0" }}>
          Lembre de <b>salvar</b> depois de mexer na lista. As mudanças chegam ao
          app na próxima sincronização.
        </div>
      </motion.section>
    </div>
  );
}

function BotaoRemover({
  tipo,
  emUso,
  ultimo,
  onRemover,
}: {
  tipo: string;
  emUso: boolean;
  ultimo: boolean;
  onRemover: () => void;
}) {
  if (ultimo) {
    return (
      <span
        className="w-[30px] h-[30px] grid place-items-center text-[#8695A0] opacity-25"
        title="Mantenha pelo menos um tipo"
      >
        <Trash2 size={16} />
      </span>
    );
  }
  return (
    <Confirmar
      titulo={`Remover ${nomeAmigavel(tipo)}?`}
      descricao={
        emUso
          ? `Existem tarifas deste pátio usando "${nomeAmigavel(tipo)}". Elas continuam valendo, mas o operador não conseguirá registrar novas entradas desse tipo.`
          : `O tipo "${nomeAmigavel(tipo)}" some das opções do app na próxima sincronização.`
      }
      rotuloConfirmar="Remover"
      aoConfirmar={async () => onRemover()}
    >
      {(abrir) => (
        <button
          onClick={abrir}
          aria-label={`Remover ${nomeAmigavel(tipo)}`}
          className="w-[30px] h-[30px] rounded-lg grid place-items-center text-[#8695A0] hover:bg-[#FEE2E2] hover:text-[#DC2626] transition-colors"
        >
          <Trash2 size={16} />
        </button>
      )}
    </Confirmar>
  );
}
