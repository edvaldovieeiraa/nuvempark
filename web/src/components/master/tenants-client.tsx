"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Plus,
  X,
  Copy,
  Power,
  MoreVertical,
  CheckCircle2,
  Sparkles,
  Clock,
  Rocket,
} from "lucide-react";
import {
  criarTenant,
  mudarEstadoAssinatura,
  alternarTenantAtivo,
  ativarAssinatura,
  estenderTrial,
  type Resultado,
} from "@/app/master/(console)/tenants/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/campos";
import { ResponsiveTable } from "@/components/ui/responsive-table";

export type TenantRow = {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
  criadoEm: string;
  patiosAtivos: number;
  patiosTotal: number;
  valorPorPatio: number;
  estadoAssinatura: string;
  mensalidade: number;
  trialExpiraEm: string | null;
  origem: string;
};

function trialDiasRestantes(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const ESTADOS: Record<string, { cls: string; rotulo: string }> = {
  trial: { cls: "bg-info-bg text-info border-info/25", rotulo: "Trial" },
  ativa: { cls: "bg-brand-50 text-brand-700 border-brand-200", rotulo: "Ativa" },
  atrasada: { cls: "bg-aviso-bg text-aviso border-aviso/25", rotulo: "Atrasada" },
  suspensa: { cls: "bg-perigo-bg text-perigo border-perigo/20", rotulo: "Suspensa" },
  cancelada: { cls: "bg-fundo text-texto-3 border-borda", rotulo: "Cancelada" },
};

export function TenantsClient({ tenants }: { tenants: TenantRow[] }) {
  const [criando, setCriando] = useState(false);

  const mrr = tenants
    .filter((t) => t.estadoAssinatura === "ativa")
    .reduce((s, t) => s + t.mensalidade, 0);
  const emTrial = tenants.filter((t) => t.estadoAssinatura === "trial").length;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-[26px] font-black tracking-tight">
            Redes (tenants)
          </h1>
          <p className="text-sm text-texto-2">
            {tenants.length} {tenants.length === 1 ? "rede" : "redes"} ·{" "}
            <b className="text-brand-700">{moeda.format(mrr)}</b> de MRR ativo
            {emTrial > 0 && (
              <>
                {" · "}
                <b className="text-info">{emTrial}</b> em teste
              </>
            )}
          </p>
        </div>
        <Botao onClick={() => setCriando(true)} type="button">
          <Plus className="w-4 h-4" />
          Nova rede
        </Botao>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        {tenants.length === 0 ? (
          <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
            <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
              <Building2 className="w-6 h-6 text-brand-600" />
            </span>
            <p className="text-sm text-texto-3">
              Nenhuma rede ainda. Crie a primeira com o botão acima.
            </p>
          </div>
        ) : (
          <ResponsiveTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                  <th className="px-5 py-3 font-bold">Rede</th>
                  <th className="px-5 py-3 font-bold hidden md:table-cell">Código</th>
                  <th className="px-5 py-3 font-bold hidden md:table-cell">Pátios</th>
                  <th className="px-5 py-3 font-bold text-right">Mensalidade</th>
                  <th className="px-5 py-3 font-bold">Assinatura</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <LinhaTenant key={t.id} tenant={t} />
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </motion.section>

      <AnimatePresence>
        {criando && <ModalCriarTenant fechar={() => setCriando(false)} />}
      </AnimatePresence>
    </div>
  );
}

function LinhaTenant({ tenant }: { tenant: TenantRow }) {
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [paraCima, setParaCima] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const [, comecar] = useTransition();
  const estado = ESTADOS[tenant.estadoAssinatura] ?? ESTADOS.ativa;

  function abrirMenu() {
    // Abre pra cima se não houver espaço abaixo (menu ~230px de altura)
    const r = botaoRef.current?.getBoundingClientRect();
    if (r) setParaCima(window.innerHeight - r.bottom < 240);
    setMenu((m) => !m);
  }

  function copiar() {
    navigator.clipboard.writeText(tenant.codigo);
    toast.sucesso("Copiado!", `Código: ${tenant.codigo}`);
  }

  function agir(fn: () => Promise<Resultado>) {
    setMenu(false);
    comecar(async () => {
      const r = await fn();
      if (r?.ok) toast.sucesso(r.msg);
      else toast.erro(r?.msg ?? "Erro inesperado.");
    });
  }

  return (
    <tr
      className={`border-t border-borda hover:bg-brand-50/40 transition-colors ${tenant.ativo ? "" : "opacity-55"}`}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white shrink-0">
            <Building2 className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="font-bold flex items-center gap-2">
              <span className="truncate">{tenant.nome}</span>
              {tenant.origem === "signup" && (
                <span
                  title="Cadastro pelo site"
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-acento bg-info-bg border border-info/20 px-1.5 py-0.5 rounded shrink-0"
                >
                  <Sparkles className="w-3 h-3" />
                  Novo
                </span>
              )}
            </div>
            {tenant.estadoAssinatura === "trial" && (
              <div className="text-[11px] font-bold text-info flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {(() => {
                  const d = trialDiasRestantes(tenant.trialExpiraEm);
                  return d === null
                    ? "trial"
                    : d === 0
                      ? "expira hoje"
                      : `${d} ${d === 1 ? "dia restante" : "dias restantes"}`;
                })()}
              </div>
            )}
            {!tenant.ativo && (
              <div className="text-[11px] font-bold text-perigo">desativada</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 hidden md:table-cell">
        <button
          onClick={copiar}
          title="Copiar código"
          className="inline-flex items-center gap-1.5 font-mono font-black tracking-[0.25em] text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-2.5 py-1 hover:bg-brand-100 transition-colors"
        >
          {tenant.codigo}
          <Copy className="w-3 h-3" />
        </button>
      </td>
      <td className="px-5 py-3.5 text-texto-2 tabular-nums whitespace-nowrap hidden md:table-cell">
        {tenant.patiosAtivos}
        <span className="text-texto-3"> / {tenant.patiosTotal}</span>
      </td>
      <td className="px-5 py-3.5 text-right font-bold tabular-nums whitespace-nowrap">
        {moeda.format(tenant.mensalidade)}
        <div className="text-[11px] font-normal text-texto-3">
          {moeda.format(tenant.valorPorPatio)}/pátio
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span
          className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${estado.cls}`}
        >
          {estado.rotulo}
        </span>
      </td>
      <td className="px-5 py-3.5 text-right relative">
        <button
          ref={botaoRef}
          onClick={abrirMenu}
          aria-label="Ações"
          className="toque-44 w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-texto hover:bg-fundo transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
              <motion.div
                initial={{ opacity: 0, y: paraCima ? 6 : -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: paraCima ? 6 : -6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-5 z-50 w-52 rounded-xl bg-superficie border border-borda shadow-[var(--shadow-pop)] p-1.5 text-left ${
                  paraCima ? "bottom-12" : "top-12"
                }`}
              >
                {tenant.estadoAssinatura === "trial" && (
                  <>
                    <MenuTitulo>Teste grátis</MenuTitulo>
                    <MenuItem onClick={() => agir(() => ativarAssinatura(tenant.id))}>
                      <Rocket className="w-4 h-4 text-brand-600" />
                      Converter em assinatura
                    </MenuItem>
                    <MenuItem onClick={() => agir(() => estenderTrial(tenant.id, 15))}>
                      <Clock className="w-4 h-4 text-info" />
                      Estender trial (+15 dias)
                    </MenuItem>
                    <div className="h-px bg-borda my-1" />
                  </>
                )}
                <MenuTitulo>Assinatura</MenuTitulo>
                {tenant.estadoAssinatura !== "ativa" &&
                  tenant.estadoAssinatura !== "trial" && (
                    <MenuItem onClick={() => agir(() => mudarEstadoAssinatura(tenant.id, "ativa"))}>
                      <CheckCircle2 className="w-4 h-4 text-brand-600" />
                      Marcar como ativa
                    </MenuItem>
                  )}
                {tenant.estadoAssinatura !== "atrasada" && (
                  <MenuItem onClick={() => agir(() => mudarEstadoAssinatura(tenant.id, "atrasada"))}>
                    <span className="w-4 h-4 rounded-full bg-aviso/20 grid place-items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-aviso" />
                    </span>
                    Marcar atrasada
                  </MenuItem>
                )}
                {tenant.estadoAssinatura !== "suspensa" && (
                  <MenuItem onClick={() => agir(() => mudarEstadoAssinatura(tenant.id, "suspensa"))}>
                    <span className="w-4 h-4 rounded-full bg-perigo/20 grid place-items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-perigo" />
                    </span>
                    Suspender
                  </MenuItem>
                )}
                <div className="h-px bg-borda my-1" />
                <MenuItem
                  perigo
                  onClick={() => agir(() => alternarTenantAtivo(tenant.id, tenant.ativo))}
                >
                  <Power className="w-4 h-4" />
                  {tenant.ativo ? "Desativar rede" : "Reativar rede"}
                </MenuItem>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </td>
    </tr>
  );
}

function MenuTitulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-1.5 pb-1 text-[10px] font-black uppercase tracking-wider text-texto-3">
      {children}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  perigo = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  perigo?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm font-semibold transition-colors ${
        perigo
          ? "text-perigo hover:bg-perigo-bg"
          : "text-texto-2 hover:bg-fundo hover:text-texto"
      }`}
    >
      {children}
    </button>
  );
}

function ModalCriarTenant({ fechar }: { fechar: () => void }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [criada, setCriada] = useState<string | null>(null);
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    criarTenant,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso("Rede criada!", estado.msg);
      setCriada(estado.codigo ?? null);
    } else {
      toast.erro("Não deu certo", estado.msg);
    }
  }, [estado, toast]);

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
          <h3 className="text-lg font-extrabold">
            {criada ? "Rede criada!" : "Nova rede"}
          </h3>
          <button onClick={fechar} aria-label="Fechar" className="text-texto-3 hover:text-texto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {criada ? (
          <div className="text-center py-4">
            <span className="w-14 h-14 rounded-2xl bg-brand-50 grid place-items-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-brand-600" />
            </span>
            <p className="mt-4 text-sm text-texto-2">
              O gestor já pode acessar o painel. Código interno da rede:
            </p>
            <div className="mt-3 font-mono font-black text-3xl tracking-[0.3em] text-brand-700">
              {criada}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(criada);
                toast.sucesso("Código copiado!");
              }}
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline"
            >
              <Copy className="w-4 h-4" />
              Copiar código
            </button>
            <p className="mt-3 text-xs text-texto-3">
              O código que o operador usa no app é gerado <b>por pátio</b> —
              aparece no painel do gestor assim que ele cadastrar cada pátio.
            </p>
            <Botao onClick={fechar} type="button" className="w-full mt-5">
              Concluir
            </Botao>
          </div>
        ) : (
          <form ref={formRef} action={agir} className="space-y-4">
            <Campo label="Nome da rede">
              <Input name="nome" required placeholder="Estacionamentos Silva" />
            </Campo>
            <div className="pt-1 border-t border-borda" />
            <p className="text-xs font-bold text-texto-3 uppercase tracking-wider">
              Primeiro gestor
            </p>
            <Campo label="E-mail do gestor">
              <Input name="email" type="email" required placeholder="gestor@rede.com.br" />
            </Campo>
            <Campo label="Senha inicial (mín. 6)">
              <Input name="senha" type="password" required minLength={6} />
            </Campo>
            <div className="pt-1 border-t border-borda" />
            <Campo label="Valor por pátio (mensal, R$)">
              <Input name="valor_por_patio" defaultValue="199.00" />
            </Campo>
            <Botao carregando={pendente} className="w-full">
              Criar rede
            </Botao>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
