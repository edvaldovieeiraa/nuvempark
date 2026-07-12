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
    <div className="space-y-6 max-w-5xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight">Pátios</h1>
        <p className="text-sm text-texto-2">
          As unidades da sua rede. Cada pátio tem tarifas, operadores e caixa
          próprios.
        </p>
      </motion.header>

      {/* Cards de pátios */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence initial={false}>
          {patios.map((p, i) => {
            const ocupadas = abertosPorPatio[p.id] ?? 0;
            const pct =
              p.qtd_vagas > 0
                ? Math.min(100, (ocupadas / p.qtd_vagas) * 100)
                : 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                className={`relative rounded-2xl bg-superficie border border-borda shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] p-5 transition-shadow ${
                  p.ativo ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center">
                    <ParkingSquare className="w-5 h-5 text-brand-600" />
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      p.ativo
                        ? "bg-brand-50 text-brand-700 border-brand-200"
                        : "bg-perigo-bg text-perigo border-perigo/20"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${p.ativo ? "bg-brand-500" : "bg-perigo"}`}
                    />
                    {p.ativo ? "ativo" : "inativo"}
                  </span>
                </div>
                <h3 className="mt-3 font-extrabold text-lg leading-tight">
                  {p.nome}
                </h3>
                <div className="mt-1.5 flex items-center gap-2">
                  <CodigoAcesso codigo={p.codigo_acesso} />
                  {p.codigo && (
                    <span className="text-xs text-texto-3 font-mono">
                      {p.codigo}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold text-texto-2 mb-1">
                    <span>Ocupação agora</span>
                    <span className="tabular-nums">
                      {ocupadas}
                      {p.qtd_vagas > 0 && ` / ${p.qtd_vagas}`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-fundo overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
                      className={`h-full rounded-full ${
                        pct >= 90
                          ? "bg-gradient-to-r from-saida to-perigo"
                          : "bg-gradient-to-r from-brand-500 to-acento-teal"
                      }`}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-borda flex items-center gap-1">
                  <AcaoIcone
                    rotulo="Editar pátio"
                    onClick={() => setEditando(p)}
                  >
                    <Pencil className="w-4 h-4" />
                  </AcaoIcone>
                  <AcaoIcone
                    rotulo="Cupom impresso"
                    onClick={() => setCupomDe(p)}
                  >
                    <Receipt className="w-4 h-4" />
                  </AcaoIcone>
                  <span className="flex-1" />
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
      <span className="text-[11px] font-semibold text-texto-3">
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
      className="inline-flex items-center gap-1.5 font-mono font-black tracking-[0.25em] text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-2 py-1 hover:bg-brand-100 transition-colors"
    >
      {codigo}
      <Copy className="w-3 h-3" />
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
      className="w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-brand-700 hover:bg-brand-50 transition-colors"
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
            className="w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-perigo hover:bg-perigo-bg transition-colors"
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
      className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-100 transition-colors disabled:opacity-60"
    >
      reativar
    </button>
  );
}

/* ---------- Novo pátio (card + form embutido) ---------- */

function NovoPatioCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
    >
      <Link
        href="/painel/patios/novo"
        className="min-h-[220px] h-full rounded-2xl border-2 border-dashed border-borda hover:border-brand-300 hover:bg-brand-50/40 transition-colors grid place-items-center text-texto-3 hover:text-brand-700"
      >
        <span className="flex flex-col items-center gap-2 font-bold text-sm">
          <span className="w-10 h-10 rounded-xl bg-fundo grid place-items-center">
            <Plus className="w-5 h-5" />
          </span>
          Novo pátio
        </span>
      </Link>
    </motion.div>
  );
}

/* ---------- Modal editar ---------- */

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
      className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
      onClick={fechar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold">{titulo}</h3>
          <button
            onClick={fechar}
            aria-label="Fechar"
            className="text-texto-3 hover:text-texto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

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
    "w-full px-3.5 py-2.5 rounded-xl border border-borda bg-superficie text-sm " +
    "font-mono placeholder:text-texto-3 focus:outline-none focus:border-brand-400 " +
    "focus:ring-4 focus:ring-brand-500/15 resize-none";

  return (
    <ModalBase titulo={`Cupom · ${patio.nome}`} fechar={fechar}>
      <p className="text-xs text-texto-2 -mt-2 mb-4">
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
