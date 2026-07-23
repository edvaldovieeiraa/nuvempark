"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Smartphone,
  MoreVertical,
  Gift,
  BadgeDollarSign,
  Star,
  Lock,
  Unlock,
  Ban,
  Building2,
  TrendingUp,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  concederCortesia,
  licenciar,
  promoverIncluso,
  bloquear,
  desbloquear,
  revogar,
  definirValorExtra,
  type Resultado,
} from "@/app/master/(console)/dispositivos/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Input, Select } from "@/components/ui/campos";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { tempoRelativo } from "@/lib/format-data";

// ─────────────────────────────────────────────────────────── Tipos (props) ──
export type Dispositivo = {
  id: string;
  patioId: string;
  codigoPareamento: string | null;
  apelido: string | null;
  fabricante: string | null;
  modelo: string | null;
  soVersao: string | null;
  appVersao: string | null;
  status: string;
  licenca: string;
  ultimoAcesso: string | null;
};

export type Patio = {
  id: string;
  nome: string;
  ativo: boolean;
  temIncluso: boolean;
  slotLivre: boolean;
  slotLivreComCandidato: boolean;
  dispositivos: Dispositivo[];
};

export type TenantGrupo = {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
  valorExtra: number;
  extrasCobraveis: number;
  mensalidadeExtra: number;
  patiosComDispositivo: number;
  dispositivosAtivos: number;
  patios: Patio[];
};

export type FilaItem = {
  tenantId: string;
  tenantNome: string;
  patioId: string;
  patioNome: string;
  tentativas: number;
  ultimoMotivo: string;
  ultimaTentativa: string;
  codigoPareamento: string | null;
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const STATUS: Record<string, { cls: string; rotulo: string }> = {
  pendente: { cls: "bg-aviso-bg text-aviso border-aviso/25", rotulo: "Pendente" },
  ativo: { cls: "bg-brand-50 text-brand-700 border-brand-200", rotulo: "Ativo" },
  bloqueado: { cls: "bg-perigo-bg text-perigo border-perigo/20", rotulo: "Bloqueado" },
  revogado: { cls: "bg-fundo text-texto-3 border-borda", rotulo: "Revogado" },
};

const LICENCA: Record<string, { cls: string; rotulo: string }> = {
  incluso: { cls: "bg-brand-50 text-brand-700 border-brand-200", rotulo: "Incluso" },
  licenciado: { cls: "bg-aviso-bg text-aviso border-aviso/25", rotulo: "Licenciado" },
  cortesia: { cls: "bg-info-bg text-info border-info/25", rotulo: "Cortesia" },
  nenhuma: { cls: "bg-fundo text-texto-3 border-borda", rotulo: "—" },
};

const MOTIVOS: Record<string, string> = {
  limite_atingido: "Limite de dispositivos atingido",
  limite_pendentes: "Fila de pendentes cheia",
  bloqueado: "Dispositivo bloqueado",
  revogado: "Dispositivo revogado",
  assinatura_bloqueada: "Assinatura bloqueada",
  pendente_aprovacao: "Aguardando aprovação",
};

function Badge({ mapa, chave }: { mapa: Record<string, { cls: string; rotulo: string }>; chave: string }) {
  const it = mapa[chave] ?? { cls: "bg-fundo text-texto-3 border-borda", rotulo: chave };
  return (
    <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${it.cls}`}>
      {it.rotulo}
    </span>
  );
}

export function DispositivosClient({ grupos, fila }: { grupos: TenantGrupo[]; fila: FilaItem[] }) {
  const [tenantFiltro, setTenantFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [soExtras, setSoExtras] = useState(false);

  const totalDisp = useMemo(
    () => grupos.reduce((s, g) => s + g.patios.reduce((p, pt) => p + pt.dispositivos.length, 0), 0),
    [grupos],
  );
  const mrrExtras = useMemo(() => grupos.reduce((s, g) => s + g.mensalidadeExtra, 0), [grupos]);

  const gruposVis = useMemo(() => {
    return grupos
      .filter((g) => !tenantFiltro || g.id === tenantFiltro)
      .filter((g) => !soExtras || g.extrasCobraveis > 0)
      .map((g) => ({
        ...g,
        patios: g.patios
          .map((p) => ({
            ...p,
            dispositivos: p.dispositivos.filter((d) => !statusFiltro || d.status === statusFiltro),
          }))
          .filter((p) => p.dispositivos.length > 0)
          .filter((p) => !soExtras || p.dispositivos.some((d) => d.licenca === "licenciado")),
      }))
      .filter((g) => g.patios.length > 0);
  }, [grupos, tenantFiltro, statusFiltro, soExtras]);

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight">Dispositivos</h1>
        <p className="text-sm text-texto-2">
          {totalDisp} {totalDisp === 1 ? "dispositivo" : "dispositivos"} ·{" "}
          <b className="text-brand-700">{moeda.format(mrrExtras)}</b> de extras/mês
        </p>
      </motion.header>

      {/* Fila comercial */}
      {fila.length > 0 && <FilaComercial fila={fila} />}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={tenantFiltro} onChange={(e) => setTenantFiltro(e.target.value)} className="max-w-56">
          <option value="">Todas as redes</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </Select>
        <Select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="max-w-44">
          <option value="">Todos os estados</option>
          <option value="pendente">Pendentes</option>
          <option value="ativo">Ativos</option>
          <option value="bloqueado">Bloqueados</option>
          <option value="revogado">Revogados</option>
        </Select>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-texto-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soExtras}
            onChange={(e) => setSoExtras(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-brand-600,#16a34a)]"
          />
          Só pátios com extras pagos
        </label>
      </div>

      {gruposVis.length === 0 ? (
        <div className="bg-superficie border border-borda rounded-2xl px-5 py-14 flex flex-col items-center gap-3 text-center">
          <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
            <Smartphone className="w-6 h-6 text-brand-600" />
          </span>
          <p className="text-sm text-texto-3">Nenhum dispositivo com os filtros atuais.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {gruposVis.map((g) => (
            <TenantCard key={g.id} grupo={g} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────── Fila comercial ──
function FilaComercial({ fila }: { fila: FilaItem[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="bg-superficie border border-aviso/25 rounded-2xl overflow-hidden shadow-[var(--shadow-card)]"
    >
      <div className="px-5 py-3.5 border-b border-borda flex items-center gap-2 bg-aviso-bg/40">
        <TrendingUp className="w-4 h-4 text-aviso" />
        <h2 className="font-extrabold text-sm">Fila comercial — tentativas bloqueadas (30 dias)</h2>
      </div>
      <ResponsiveTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
              <th className="px-5 py-2.5 font-bold">Rede · Pátio</th>
              <th className="px-5 py-2.5 font-bold text-right">Tentativas</th>
              <th className="px-5 py-2.5 font-bold hidden md:table-cell">Último motivo</th>
              <th className="px-5 py-2.5 font-bold hidden md:table-cell">Última</th>
              <th className="px-5 py-2.5 font-bold">Código</th>
            </tr>
          </thead>
          <tbody>
            {fila.map((f) => (
              <tr key={`${f.tenantId}|${f.patioId}`} className="border-t border-borda hover:bg-aviso-bg/20">
                <td className="px-5 py-2.5">
                  <a href={`#patio-${f.patioId}`} className="font-bold hover:text-brand-700 transition-colors">
                    {f.tenantNome}
                  </a>
                  <div className="text-[11px] text-texto-3">{f.patioNome}</div>
                </td>
                <td className="px-5 py-2.5 text-right font-black tabular-nums text-aviso">{f.tentativas}</td>
                <td className="px-5 py-2.5 text-texto-2 hidden md:table-cell">
                  {MOTIVOS[f.ultimoMotivo] ?? f.ultimoMotivo}
                </td>
                <td className="px-5 py-2.5 text-texto-3 hidden md:table-cell whitespace-nowrap">
                  {tempoRelativo(f.ultimaTentativa)}
                </td>
                <td className="px-5 py-2.5">
                  {f.codigoPareamento ? (
                    <span className="font-mono font-black tracking-wider text-brand-700">
                      {f.codigoPareamento}
                    </span>
                  ) : (
                    <span className="text-texto-3">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>
    </motion.section>
  );
}

// ──────────────────────────────────────────────────────────────── Tenant card ──
function TenantCard({ grupo }: { grupo: TenantGrupo }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-superficie border border-borda rounded-2xl overflow-hidden shadow-[var(--shadow-card)]"
    >
      <div className="px-5 py-4 border-b border-borda flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white shrink-0">
            <Building2 className="w-4.5 h-4.5" />
          </span>
          <div className="min-w-0">
            <div className="font-extrabold truncate">{grupo.nome}</div>
            <div className="text-[12px] text-texto-2">
              {grupo.patiosComDispositivo} {grupo.patiosComDispositivo === 1 ? "pátio" : "pátios"} ·{" "}
              {grupo.dispositivosAtivos} ativos ·{" "}
              <b>{grupo.extrasCobraveis}</b> {grupo.extrasCobraveis === 1 ? "extra" : "extras"} ×{" "}
              {moeda.format(grupo.valorExtra)} ={" "}
              <b className="text-brand-700">{moeda.format(grupo.mensalidadeExtra)}/mês</b>
            </div>
          </div>
        </div>
        <ValorExtraEditor tenantId={grupo.id} valorAtual={grupo.valorExtra} />
      </div>

      <div className="divide-y divide-borda">
        {grupo.patios.map((p) => (
          <PatioBloco key={p.id} patio={p} />
        ))}
      </div>
    </motion.section>
  );
}

function ValorExtraEditor({ tenantId, valorAtual }: { tenantId: string; valorAtual: number }) {
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(valorAtual.toFixed(2)).replace(".", ","));
  const [, comecar] = useTransition();

  function salvar() {
    const n = Number(valor.replace(",", "."));
    comecar(async () => {
      const r = await definirValorExtra(tenantId, n);
      if (r?.ok) {
        toast.sucesso(r.msg);
        setEditando(false);
      } else {
        toast.erro(r?.msg ?? "Erro inesperado.");
      }
    });
  }

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-texto-2 hover:text-brand-700 border border-borda hover:border-brand-300 rounded-lg px-2.5 py-1.5 transition-colors"
        title="Editar valor do dispositivo extra"
      >
        <Pencil className="w-3.5 h-3.5" />
        {moeda.format(valorAtual)}/extra
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-28">
        <Input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          inputMode="decimal"
          aria-label="Valor do dispositivo extra"
          className="!h-9"
        />
      </div>
      <button
        onClick={salvar}
        aria-label="Salvar"
        className="w-9 h-9 rounded-lg bg-brand-600 text-white grid place-items-center hover:brightness-110"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={() => setEditando(false)}
        aria-label="Cancelar"
        className="w-9 h-9 rounded-lg border border-borda grid place-items-center text-texto-3 hover:text-texto"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function PatioBloco({ patio }: { patio: Patio }) {
  return (
    <div id={`patio-${patio.id}`} className="px-5 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold text-texto">{patio.nome}</span>
        {!patio.ativo && <span className="text-[11px] font-bold text-perigo">pátio inativo</span>}
        {patio.slotLivreComCandidato && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
            <Star className="w-3 h-3" />
            Slot gratuito disponível neste pátio
          </span>
        )}
      </div>
      <ResponsiveTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
              <th className="px-2 py-1.5 font-bold">Código</th>
              <th className="px-2 py-1.5 font-bold hidden md:table-cell">Aparelho</th>
              <th className="px-2 py-1.5 font-bold hidden lg:table-cell">App / SO</th>
              <th className="px-2 py-1.5 font-bold">Estado</th>
              <th className="px-2 py-1.5 font-bold">Licença</th>
              <th className="px-2 py-1.5 font-bold hidden md:table-cell">Últ. acesso</th>
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {patio.dispositivos.map((d) => (
              <LinhaDispositivo key={d.id} d={d} slotLivre={patio.slotLivre} />
            ))}
          </tbody>
        </table>
      </ResponsiveTable>
    </div>
  );
}

function LinhaDispositivo({ d, slotLivre }: { d: Dispositivo; slotLivre: boolean }) {
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [paraCima, setParaCima] = useState(false);
  const [confirmarRevogar, setConfirmarRevogar] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const [, comecar] = useTransition();

  function abrirMenu() {
    const r = botaoRef.current?.getBoundingClientRect();
    if (r) setParaCima(window.innerHeight - r.bottom < 280);
    setMenu((m) => !m);
  }

  function agir(fn: () => Promise<Resultado>) {
    setMenu(false);
    comecar(async () => {
      const r = await fn();
      if (r?.ok) toast.sucesso(r.msg);
      else toast.erro(r?.msg ?? "Erro inesperado.");
    });
  }

  const podePromover = slotLivre && d.status !== "revogado" && d.licenca !== "incluso";

  return (
    <tr id={`disp-${d.id}`} className="border-t border-borda hover:bg-brand-50/30 transition-colors">
      <td className="px-2 py-2.5">
        <span className="font-mono font-black tracking-wider text-brand-700">
          {d.codigoPareamento ?? "—"}
        </span>
        {d.apelido && <div className="text-[11px] text-texto-2">{d.apelido}</div>}
      </td>
      <td className="px-2 py-2.5 text-texto-2 hidden md:table-cell">
        {d.fabricante || d.modelo ? (
          <span>
            {[d.fabricante, d.modelo].filter(Boolean).join(" ")}
          </span>
        ) : (
          <span className="text-texto-3">—</span>
        )}
      </td>
      <td className="px-2 py-2.5 text-texto-3 hidden lg:table-cell whitespace-nowrap">
        {d.appVersao ? `v${d.appVersao}` : "—"}
        {d.soVersao ? ` · ${d.soVersao}` : ""}
      </td>
      <td className="px-2 py-2.5">
        <Badge mapa={STATUS} chave={d.status} />
      </td>
      <td className="px-2 py-2.5">
        <Badge mapa={LICENCA} chave={d.licenca} />
      </td>
      <td className="px-2 py-2.5 text-texto-3 hidden md:table-cell whitespace-nowrap">
        {tempoRelativo(d.ultimoAcesso)}
      </td>
      <td className="px-2 py-2.5 text-right relative">
        <button
          ref={botaoRef}
          onClick={abrirMenu}
          aria-label="Ações do dispositivo"
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
                className={`absolute right-2 z-50 w-56 rounded-xl bg-superficie border border-borda shadow-[var(--shadow-pop)] p-1.5 text-left ${
                  paraCima ? "bottom-11" : "top-11"
                }`}
              >
                {podePromover && (
                  <MenuItem destaque onClick={() => agir(() => promoverIncluso(d.id))}>
                    <Star className="w-4 h-4 text-brand-600" />
                    Promover para incluso (gratuito)
                  </MenuItem>
                )}
                {d.licenca !== "cortesia" && d.status !== "revogado" && (
                  <MenuItem onClick={() => agir(() => concederCortesia(d.id))}>
                    <Gift className="w-4 h-4 text-info" />
                    Conceder cortesia
                  </MenuItem>
                )}
                {d.licenca !== "licenciado" && d.status !== "revogado" && (
                  <MenuItem onClick={() => agir(() => licenciar(d.id))}>
                    <BadgeDollarSign className="w-4 h-4 text-aviso" />
                    Licenciar (cobrar)
                  </MenuItem>
                )}
                <div className="h-px bg-borda my-1" />
                {d.status === "bloqueado" ? (
                  <MenuItem onClick={() => agir(() => desbloquear(d.id))}>
                    <Unlock className="w-4 h-4 text-brand-600" />
                    Desbloquear
                  </MenuItem>
                ) : (
                  d.status !== "revogado" && (
                    <MenuItem onClick={() => agir(() => bloquear(d.id))}>
                      <Lock className="w-4 h-4 text-texto-2" />
                      Bloquear
                    </MenuItem>
                  )
                )}
                {d.status !== "revogado" && (
                  <MenuItem
                    perigo
                    onClick={() => {
                      setMenu(false);
                      setConfirmarRevogar(true);
                    }}
                  >
                    <Ban className="w-4 h-4" />
                    Revogar
                  </MenuItem>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmarRevogar && (
            <ConfirmarRevogar
              codigo={d.codigoPareamento}
              fechar={() => setConfirmarRevogar(false)}
              confirmar={() => {
                setConfirmarRevogar(false);
                agir(() => revogar(d.id));
              }}
            />
          )}
        </AnimatePresence>
      </td>
    </tr>
  );
}

function ConfirmarRevogar({
  codigo,
  fechar,
  confirmar,
}: {
  codigo: string | null;
  fechar: () => void;
  confirmar: () => void;
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
        className="w-full max-w-sm rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6 text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-perigo-bg grid place-items-center mb-3">
          <Ban className="w-5 h-5 text-perigo" />
        </div>
        <h3 className="text-lg font-extrabold">Revogar dispositivo?</h3>
        <p className="mt-1.5 text-sm text-texto-2">
          Esta ação é <b>irreversível</b>. O dispositivo{" "}
          {codigo ? (
            <>
              (código <b className="font-mono">{codigo}</b>){" "}
            </>
          ) : null}
          perde o acesso, para de cobrar e libera o slot do pátio.
        </p>
        <div className="mt-5 flex gap-2 justify-end">
          <Botao variante="fantasma" type="button" onClick={fechar}>
            Cancelar
          </Botao>
          <Botao variante="perigo" type="button" onClick={confirmar}>
            Revogar
          </Botao>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MenuItem({
  children,
  onClick,
  perigo = false,
  destaque = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  perigo?: boolean;
  destaque?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm font-semibold transition-colors ${
        perigo
          ? "text-perigo hover:bg-perigo-bg"
          : destaque
            ? "text-brand-700 bg-brand-50/60 hover:bg-brand-50"
            : "text-texto-2 hover:bg-fundo hover:text-texto"
      }`}
    >
      {children}
    </button>
  );
}
