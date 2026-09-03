"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Inbox,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Check,
  X,
  Trash2,
  ExternalLink,
  Copy,
  Pencil,
  Loader2,
  AlertTriangle,
  PhoneCall,
} from "lucide-react";
import {
  mudarStatusLead,
  salvarObservacaoLead,
  excluirLead,
  type Resultado,
  type StatusLead,
} from "@/app/master/(console)/leads/actions";
import { useToast } from "@/components/ui/toast";
import { formatarDataHora, tempoRelativo } from "@/lib/format-data";
import { formatarTelefone } from "@/lib/telefone";

export type LeadRow = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  assunto: string;
  origem: string;
  ip: string | null;
  status: string;
  observacao: string | null;
  atendidoEm: string | null;
  criadoEm: string;
  /** Praça deduzida do DDD (lib/ddd) — pista de onde o lead está. */
  praca: string | null;
};

type Filtro = "todos" | StatusLead;

const ESTAGIOS: Record<
  StatusLead,
  { rotulo: string; cls: string; ponto: string }
> = {
  novo: {
    rotulo: "Novo",
    cls: "bg-info-bg text-info border-info/25",
    ponto: "bg-info",
  },
  em_contato: {
    rotulo: "Em contato",
    cls: "bg-aviso-bg text-aviso border-aviso/25",
    ponto: "bg-aviso",
  },
  ganho: {
    rotulo: "Ganho",
    cls: "bg-brand-50 text-brand-700 border-brand-200",
    ponto: "bg-brand-500",
  },
  perdido: {
    rotulo: "Perdido",
    cls: "bg-fundo text-texto-3 border-borda",
    ponto: "bg-texto-3",
  },
};

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "novo", rotulo: "Novos" },
  { chave: "em_contato", rotulo: "Em contato" },
  { chave: "ganho", rotulo: "Ganhos" },
  { chave: "perdido", rotulo: "Perdidos" },
];

export function LeadsClient({
  leads,
  indisponivel,
}: {
  leads: LeadRow[];
  indisponivel: boolean;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const contagem = useMemo(() => {
    const c: Record<string, number> = { todos: leads.length };
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  const visiveis = useMemo(
    () => (filtro === "todos" ? leads : leads.filter((l) => l.status === filtro)),
    [leads, filtro],
  );

  const novos = contagem.novo ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight">Leads do site</h1>
        <p className="text-sm text-texto-2">
          {leads.length} {leads.length === 1 ? "contato recebido" : "contatos recebidos"}
          {novos > 0 && (
            <>
              {" · "}
              <b className="text-info">{novos}</b>{" "}
              {novos === 1 ? "aguardando resposta" : "aguardando resposta"}
            </>
          )}
        </p>
      </motion.header>

      {indisponivel && (
        <div className="flex items-start gap-3 rounded-2xl border border-perigo/20 bg-perigo-bg px-4 py-3 text-sm text-perigo">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Não consegui ler a tabela de leads. Se a migration{" "}
            <b>db/39-leads-site.sql</b> ainda não foi aplicada, o formulário do
            site também não está gravando — a lista vazia abaixo não significa
            que ninguém escreveu.
          </p>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06 }}
        className="flex flex-wrap gap-2"
      >
        {FILTROS.map((f) => {
          const n = contagem[f.chave] ?? 0;
          const ativo = filtro === f.chave;
          return (
            <button
              key={f.chave}
              onClick={() => setFiltro(f.chave)}
              className={`h-9 px-3.5 rounded-lg text-sm font-bold border transition-colors ${
                ativo
                  ? "bg-brand-50 border-brand-200 text-brand-700"
                  : "bg-superficie border-borda text-texto-2 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              {f.rotulo}
              <span className={`ml-1.5 tabular-nums ${ativo ? "text-brand-600" : "text-texto-3"}`}>
                {n}
              </span>
            </button>
          );
        })}
      </motion.div>

      {visiveis.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] px-5 py-14 flex flex-col items-center gap-3 text-center"
        >
          <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
            <Inbox className="w-6 h-6 text-brand-600" />
          </span>
          <p className="text-sm text-texto-3 max-w-sm">
            {filtro === "todos"
              ? "Nenhum lead ainda. Assim que alguém preencher o formulário de contato do site, ele aparece aqui."
              : "Nenhum lead neste estágio."}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {visiveis.map((lead, i) => (
            <CartaoLead key={lead.id} lead={lead} atraso={Math.min(i, 8) * 0.03} />
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoLead({ lead, atraso }: { lead: LeadRow; atraso: number }) {
  const toast = useToast();
  const [pendente, comecar] = useTransition();
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(lead.observacao ?? "");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const estagio = ESTAGIOS[lead.status as StatusLead] ?? ESTAGIOS.novo;

  function agir(fn: () => Promise<Resultado>) {
    comecar(async () => {
      const r = await fn();
      if (r?.ok) toast.sucesso(r.msg);
      else toast.erro(r?.msg ?? "Erro inesperado.");
    });
  }

  function copiar(valor: string, rotulo: string) {
    navigator.clipboard.writeText(valor);
    toast.sucesso("Copiado!", `${rotulo}: ${valor}`);
  }

  const whatsapp = `https://wa.me/55${lead.telefone}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: atraso }}
      className={`bg-superficie border rounded-2xl shadow-[var(--shadow-card)] p-5 ${
        lead.status === "novo" ? "border-info/30" : "border-borda"
      } ${lead.status === "perdido" ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <span className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${estagio.ponto}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-[15px]">{lead.nome}</h2>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${estagio.cls}`}>
              {estagio.rotulo}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-x-3 gap-y-1 flex-wrap text-[12px] text-texto-2">
            <a href={`tel:+55${lead.telefone}`} className="inline-flex items-center gap-1 hover:text-brand-700">
              <Phone className="w-3 h-3" />
              {formatarTelefone(lead.telefone)}
            </a>
            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:text-brand-700 break-all">
              <Mail className="w-3 h-3" />
              {lead.email}
            </a>
            {lead.praca && (
              <span className="inline-flex items-center gap-1 text-texto-3">
                <MapPin className="w-3 h-3" />
                {lead.praca}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[12px] font-semibold text-texto-2">
            {tempoRelativo(lead.criadoEm)}
          </div>
          <div className="text-[11px] text-texto-3">{formatarDataHora(lead.criadoEm)}</div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-texto whitespace-pre-wrap break-words rounded-xl bg-fundo/60 border border-borda px-3.5 py-3">
        {lead.assunto}
      </p>

      <div className="mt-2 flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-texto-3">
        <span>
          veio de <b className="font-mono text-texto-2">{lead.origem}</b>
        </span>
        {lead.ip && (
          <button
            onClick={() => copiar(lead.ip!, "IP")}
            className="inline-flex items-center gap-1 font-mono hover:text-texto-2"
            title="Copiar IP"
          >
            {lead.ip}
            <Copy className="w-3 h-3" />
          </button>
        )}
        {lead.atendidoEm && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            respondido {tempoRelativo(lead.atendidoEm)}
          </span>
        )}
      </div>

      {/* Observação interna */}
      {editando ? (
        <div className="mt-3">
          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={3}
            maxLength={2000}
            autoFocus
            placeholder="Anotação interna: o que foi combinado, próximo passo…"
            className="w-full rounded-xl border border-borda bg-superficie px-3.5 py-2.5 text-sm outline-none focus:border-brand-300"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() =>
                agir(async () => {
                  const r = await salvarObservacaoLead(lead.id, rascunho);
                  if (r?.ok) setEditando(false);
                  return r;
                })
              }
              disabled={pendente}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-sm font-bold hover:bg-brand-100 transition-colors disabled:opacity-50"
            >
              {pendente ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Salvar
            </button>
            <button
              onClick={() => {
                setRascunho(lead.observacao ?? "");
                setEditando(false);
              }}
              className="h-9 px-3.5 rounded-lg border border-borda text-texto-2 text-sm font-bold hover:text-texto transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : lead.observacao ? (
        <button
          onClick={() => setEditando(true)}
          className="mt-3 w-full text-left rounded-xl border border-borda bg-aviso-bg/40 px-3.5 py-2.5 text-sm text-texto-2 hover:border-brand-300 transition-colors group"
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-texto-3 flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" />
            Anotação interna
            <Pencil className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
          <span className="block mt-1 whitespace-pre-wrap break-words">{lead.observacao}</span>
        </button>
      ) : null}

      {/* Ações */}
      <div className="mt-4 pt-3.5 border-t border-borda flex items-center gap-2 flex-wrap">
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-sm font-bold hover:bg-brand-100 transition-colors"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          WhatsApp
          <ExternalLink className="w-3 h-3" />
        </a>

        {(["novo", "em_contato", "ganho", "perdido"] as StatusLead[])
          .filter((s) => s !== lead.status)
          .map((s) => (
            <button
              key={s}
              onClick={() => agir(() => mudarStatusLead(lead.id, s))}
              disabled={pendente}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-borda text-texto-2 text-sm font-semibold hover:border-brand-300 hover:text-brand-700 transition-colors disabled:opacity-50"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${ESTAGIOS[s].ponto}`} />
              {ESTAGIOS[s].rotulo}
            </button>
          ))}

        {!editando && !lead.observacao && (
          <button
            onClick={() => setEditando(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-borda text-texto-2 text-sm font-semibold hover:border-brand-300 hover:text-brand-700 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Anotar
          </button>
        )}

        <div className="ml-auto">
          <AnimatePresence mode="wait" initial={false}>
            {confirmandoExclusao ? (
              <motion.div
                key="confirmar"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <span className="text-[12px] font-semibold text-texto-2">Excluir de vez?</span>
                <button
                  onClick={() => agir(() => excluirLead(lead.id))}
                  disabled={pendente}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-perigo text-white text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {pendente ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Sim
                </button>
                <button
                  onClick={() => setConfirmandoExclusao(false)}
                  aria-label="Cancelar exclusão"
                  className="toque-44 w-9 h-9 rounded-lg grid place-items-center border border-borda text-texto-3 hover:text-texto transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="excluir"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setConfirmandoExclusao(true)}
                title="Excluir (use só para spam — 'Perdido' preserva o histórico)"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-texto-3 text-sm font-semibold hover:text-perigo hover:bg-perigo-bg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Spam
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}
