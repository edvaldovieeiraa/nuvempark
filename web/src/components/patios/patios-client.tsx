"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ParkingSquare,
  Plus,
  Pencil,
  Power,
  Receipt,
  X,
  Copy,
} from "lucide-react";
import {
  atualizarPatio,
  alternarAtivoPatio,
  salvarCupom,
  type Resultado,
} from "@/app/painel/patios/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/campos";
import { Confirmar } from "@/components/ui/confirmar";

export type Patio = {
  id: string;
  nome: string;
  codigo: string | null;
  codigo_acesso: string | null;
  qtd_vagas: number;
  ativo: boolean;
};
export type Config = {
  patio_id: string;
  ticket_cabecalho: string[];
  ticket_rodape: string[];
};

export function PatiosClient({
  patios,
  configs,
  abertosPorPatio,
}: {
  patios: Patio[];
  configs: Config[];
  abertosPorPatio: Record<string, number>;
}) {
  const [editando, setEditando] = useState<Patio | null>(null);
  const [cupomDe, setCupomDe] = useState<Patio | null>(null);

  const configDe = (id: string) => configs.find((c) => c.patio_id === id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 style={{ margin: 0, fontSize: 23 }}>Pátios</h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          As unidades da sua rede. Cada pátio tem tarifas, operadores e caixa
          próprios.
        </div>
      </motion.div>

      {/* Cards de pátios */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        <AnimatePresence initial={false}>
          {patios.map((p, i) => {
            const ocupadas = abertosPorPatio[p.id] ?? 0;
            const pct =
              p.qtd_vagas > 0
                ? Math.min(100, (ocupadas / p.qtd_vagas) * 100)
                : 0;
            const cheio = pct >= 90;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                style={{
                  background: "#fff",
                  border: "1px solid #E4E8EC",
                  borderRadius: 16,
                  boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
                  padding: 18,
                  opacity: p.ativo ? 1 : 0.6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      background: "#DCFCE7",
                      color: "#16A34A",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <ParkingSquare style={{ width: 20, height: 20 }} />
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      ...(p.ativo
                        ? {
                            background: "#DCFCE7",
                            color: "#16A34A",
                            border: "1px solid #BBF7D0",
                          }
                        : {
                            background: "#F1F4F6",
                            color: "#8695A0",
                            border: "1px solid #E4E8EC",
                          }),
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: p.ativo ? "#22C55E" : "#8695A0",
                      }}
                    />
                    {p.ativo ? "ativo" : "inativo"}
                  </span>
                </div>

                <h3
                  style={{ margin: "12px 0 0", fontSize: 17, fontWeight: 800 }}
                >
                  {p.nome}
                </h3>

                <div style={{ marginTop: 8 }}>
                  <CodigoAcesso codigo={p.codigo_acesso} />
                </div>

                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6B7280",
                      marginBottom: 6,
                    }}
                  >
                    <span>Ocupação agora</span>
                    <span className="mono">
                      {ocupadas}
                      {p.qtd_vagas > 0 && ` / ${p.qtd_vagas}`}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: "#F1F4F6",
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        background: cheio
                          ? "linear-gradient(90deg,#F97316,#E11D48)"
                          : "linear-gradient(90deg,#16A34A,#22C55E)",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: "1px solid #EEF1F3",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <AcaoIcone
                    rotulo="Editar pátio"
                    onClick={() => setEditando(p)}
                  >
                    <Pencil style={{ width: 15, height: 15 }} />
                  </AcaoIcone>
                  <AcaoIcone
                    rotulo="Cupom impresso"
                    onClick={() => setCupomDe(p)}
                  >
                    <Receipt style={{ width: 15, height: 15 }} />
                  </AcaoIcone>
                  <span style={{ flex: 1 }} />
                  <BotaoAtivo patio={p} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <NovoPatioCard />
      </div>

      {/* Modais */}
      <AnimatePresence>
        {editando && (
          <ModalEditar patio={editando} fechar={() => setEditando(null)} />
        )}
        {cupomDe && (
          <ModalCupom
            patio={cupomDe}
            config={configDe(cupomDe.id)}
            fechar={() => setCupomDe(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Código de 4 dígitos que o operador digita no app — copiável. */
function CodigoAcesso({ codigo }: { codigo: string | null }) {
  const toast = useToast();
  if (!codigo) {
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: "#8695A0" }}>
        código pendente
      </span>
    );
  }
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(codigo);
        toast.sucesso("Copiado!", `Código de acesso do app: ${codigo}`);
      }}
      title="Código que o operador digita no app — clique para copiar"
      className="mono hover:brightness-95 transition"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".22em",
        color: "#16A34A",
        background: "#DCFCE7",
        border: "1px solid #BBF7D0",
        borderRadius: 9,
        padding: "4px 9px",
      }}
    >
      {codigo}
      <Copy style={{ width: 12, height: 12 }} />
    </button>
  );
}

function AcaoIcone({
  rotulo,
  onClick,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      className="grid place-items-center rounded-[9px] text-[#8695A0] hover:text-[#16A34A] hover:bg-[#F1F4F6] transition-colors"
      style={{ width: 30, height: 30 }}
    >
      {children}
    </button>
  );
}

function BotaoAtivo({ patio }: { patio: Patio }) {
  const toast = useToast();
  const [pendente, comecar] = useTransition();

  async function executar() {
    const r = await alternarAtivoPatio(patio.id, patio.ativo);
    if (r?.ok) toast.sucesso(r.msg);
    else toast.erro(r?.msg ?? "Erro inesperado.");
  }

  if (patio.ativo) {
    return (
      <Confirmar
        titulo="Desativar pátio?"
        descricao={`"${patio.nome}" some do app dos operadores e para de receber sync. Tarifas e histórico são preservados.`}
        rotuloConfirmar="Desativar"
        aoConfirmar={executar}
      >
        {(abrir) => (
          <button
            onClick={abrir}
            aria-label={`Desativar ${patio.nome}`}
            title="Desativar pátio"
            className="grid place-items-center rounded-[9px] text-[#8695A0] hover:text-[#E11D48] hover:bg-[#FEF2F2] transition-colors"
            style={{ width: 30, height: 30 }}
          >
            <Power style={{ width: 15, height: 15 }} />
          </button>
        )}
      </Confirmar>
    );
  }
  return (
    <button
      onClick={() => comecar(executar)}
      disabled={pendente}
      className="hover:brightness-95 transition disabled:opacity-60"
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#16A34A",
        background: "#DCFCE7",
        border: "1px solid #BBF7D0",
        borderRadius: 9,
        padding: "6px 12px",
      }}
    >
      reativar
    </button>
  );
}

/* ---------- Novo pátio (card + link) ---------- */

function NovoPatioCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
    >
      <Link
        href="/painel/patios/novo"
        className="border-2 border-dashed border-[#D5DBE1] text-[#8695A0] hover:border-[#16A34A] hover:text-[#16A34A] transition-colors"
        style={{
          minHeight: 220,
          height: "100%",
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          textDecoration: "none",
        }}
      >
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 9,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: "#F1F4F6",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Plus style={{ width: 20, height: 20 }} />
          </span>
          Novo pátio
        </span>
      </Link>
    </motion.div>
  );
}

/* ---------- Modal base ---------- */

function ModalBase({
  titulo,
  fechar,
  children,
}: {
  titulo: string;
  fechar: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center p-4"
      style={{ background: "rgba(16,27,20,.5)", backdropFilter: "blur(4px)" }}
      onClick={fechar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 max-h-[85dvh] overflow-y-auto"
        style={{
          background: "#fff",
          border: "1px solid #E4E8EC",
          borderRadius: 16,
          boxShadow: "0 24px 60px -12px rgba(16,27,20,.28)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold">{titulo}</h3>
          <button
            onClick={fechar}
            aria-label="Fechar"
            className="toque-44 text-[#8695A0] hover:text-[#1F2937]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ---------- Modal editar ---------- */

function ModalEditar({ patio, fechar }: { patio: Patio; fechar: () => void }) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    atualizarPatio,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso(estado.msg);
      fechar();
    } else toast.erro("Não deu certo", estado.msg);
  }, [estado, toast, fechar]);

  return (
    <ModalBase titulo={`Editar ${patio.nome}`} fechar={fechar}>
      <form action={agir} className="space-y-4">
        <input type="hidden" name="id" value={patio.id} />
        <Campo label="Nome">
          <Input name="nome" required defaultValue={patio.nome} />
        </Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Código">
            <Input name="codigo" defaultValue={patio.codigo ?? ""} />
          </Campo>
          <Campo label="Vagas">
            <Input
              name="qtd_vagas"
              type="number"
              defaultValue={String(patio.qtd_vagas)}
            />
          </Campo>
        </div>
        <Botao carregando={pendente} className="w-full">
          Salvar alterações
        </Botao>
      </form>
    </ModalBase>
  );
}

/* ---------- Modal cupom (cabeçalho/rodapé impressos) ---------- */

function ModalCupom({
  patio,
  config,
  fechar,
}: {
  patio: Patio;
  config?: Config;
  fechar: () => void;
}) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    salvarCupom,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso(estado.msg);
      fechar();
    } else toast.erro("Não deu certo", estado.msg);
  }, [estado, toast, fechar]);

  const areaCls =
    "mono w-full px-3.5 py-2.5 rounded-xl border border-[#E4E8EC] bg-[#FAFBFC] text-sm " +
    "placeholder:text-[#8695A0] focus:outline-none focus:border-[#16A34A] " +
    "focus:ring-4 focus:ring-[#16A34A]/15 resize-none";

  return (
    <ModalBase titulo={`Cupom · ${patio.nome}`} fechar={fechar}>
      <p className="text-xs -mt-2 mb-4" style={{ color: "#6B7280" }}>
        Texto impresso no ticket da impressora térmica. Até 4 linhas de 48
        caracteres cada.
      </p>
      <form action={agir} className="space-y-4">
        <input type="hidden" name="patio_id" value={patio.id} />
        <Campo label="Cabeçalho (uma linha por linha)">
          <textarea
            name="cabecalho"
            rows={3}
            className={areaCls}
            defaultValue={(config?.ticket_cabecalho ?? []).join("\n")}
            placeholder={`${patio.nome}\nRua Exemplo, 123`}
          />
        </Campo>
        <Campo label="Rodapé">
          <textarea
            name="rodape"
            rows={2}
            className={areaCls}
            defaultValue={(config?.ticket_rodape ?? []).join("\n")}
            placeholder="Obrigado pela preferência!"
          />
        </Campo>
        <Botao carregando={pendente} className="w-full">
          Salvar cupom
        </Botao>
      </form>
    </ModalBase>
  );
}
