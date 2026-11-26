"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Copy,
  Lock,
  Mail,
  MessageCircle,
  MessageSquarePlus,
  Pencil,
  Phone,
  Shuffle,
  UserPlus,
} from "lucide-react";
import { linksContato } from "@/lib/crm/atalhos";
import { itensMenuEstagio, type DestinoMenu } from "@/lib/crm/menu-estagio";
import { alertaTrial, classificarTrial } from "@/lib/crm/prazos";
import { ROTULO_ASSINATURA, ROTULO_ESTAGIO, rotuloFonte } from "@/lib/crm/rotulos";
import { seloCard, subtituloCard, textoTrial, type TomSelo } from "@/lib/crm/textos-card";
import type { LeadCrm } from "@/lib/crm/tipos";
import { formatarDataHora } from "@/lib/format-data";
import { formatarTelefone } from "@/lib/telefone";
import { Folha } from "@/components/ui/folha";
import { useToast } from "@/components/ui/toast";
import { BlocoProximaAcao } from "@/components/master/crm/bloco-proxima-acao";
import { COR_ESTAGIO, FOCO } from "@/components/master/crm/cores-estagio";
import { BTN_FANTASMA, BTN_PEQUENO, BTN_PRIMARIO, SECAO_TITULO } from "@/components/master/crm/estilos";
import { FormContato } from "@/components/master/crm/form-contato";
import { FormInteracao } from "@/components/master/crm/form-interacao";
import { LinhaDoTempo } from "@/components/master/crm/linha-do-tempo";
import { MenuEstagio } from "@/components/master/crm/menu-estagio";

type Props = {
  lead: LeadCrm | null;
  /** ISO da página; o painel nunca lê o relógio. */
  agora: string;
  aberto: boolean;
  focoAoFechar: HTMLElement | null;
  onFechar: () => void;
  /** O pai move (otimista). "perdido" abre o DialogoPerda. */
  onEscolherEstagio: (lead: LeadCrm, destino: DestinoMenu) => void;
  /** "Abrir" de um duplicado na edição de contato. */
  onAbrirLead: (id: string) => void;
};

// Abaixo de 640 px a Folha é tela cheia: é aí que entra a barra de baixo.
const CONSULTA_CELULAR = "(max-width: 639px)";
function inscreverCelular(aviso: () => void) {
  const mq = window.matchMedia(CONSULTA_CELULAR);
  mq.addEventListener("change", aviso);
  return () => mq.removeEventListener("change", aviso);
}
function useCelular(): boolean {
  return useSyncExternalStore(
    inscreverCelular,
    () => window.matchMedia(CONSULTA_CELULAR).matches,
    () => false,
  );
}

const TOM_ALERTA: Record<TomSelo | "ok", string> = {
  aviso: "bg-aviso-bg text-aviso-texto border-aviso-borda",
  perigo: "bg-perigo-bg text-perigo-texto border-perigo-borda",
  neutro: "bg-fundo text-texto-2 border-borda",
  ok: "bg-fundo text-texto-2 border-borda",
};
const TOM_TRIAL = { ok: "ok", expirando: "aviso", expirado: "perigo" } as const;

/**
 * Painel do lead (design doc, telas 3 e 7): drawer de 540 px no desktop, tela
 * cheia no celular, os dois pela `Folha`. Todo menu e formulário que abre
 * daqui é renderizado dentro de uma Folha, porque o resto do body fica inert.
 */
export function LeadPainel(props: Props) {
  if (!props.aberto || !props.lead) return null;
  return <PainelAberto key={props.lead.id} {...props} lead={props.lead} />;
}

function PainelAberto({
  lead,
  agora,
  focoAoFechar,
  onFechar,
  onEscolherEstagio,
  onAbrirLead,
}: Props & { lead: LeadCrm }) {
  const celular = useCelular();
  const [menuAberto, setMenuAberto] = useState(false);
  const [btnEstagio, setBtnEstagio] = useState<HTMLButtonElement | null>(null);
  const [folhaEstagio, setFolhaEstagio] = useState(false);
  const [folhaInteracao, setFolhaInteracao] = useState(false);
  const [editandoContato, setEditandoContato] = useState(false);
  // Bumpa a cada mudança feita daqui: remonta a linha do tempo.
  const [versao, setVersao] = useState(0);
  const textoInteracaoRef = useRef<HTMLTextAreaElement>(null);
  const mudou = () => setVersao((v) => v + 1);

  const agoraD = new Date(agora);
  const modeloMenu = itensMenuEstagio(lead);
  const semMenu = modeloMenu.itens.length === 0 && !modeloMenu.podeExcluir;
  const trial = alertaTrial(lead, agoraD);
  const selo = seloCard(lead);
  const subtitulo = subtituloCard(lead);

  function escolher(destino: DestinoMenu) {
    setMenuAberto(false);
    setFolhaEstagio(false);
    onEscolherEstagio(lead, destino);
  }

  const cabecalho = (
    <div className="flex flex-col gap-2">
      {subtitulo && <p className="text-sm text-texto-2 break-words">{subtitulo}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-bold ${COR_ESTAGIO[lead.status].fundo} ${COR_ESTAGIO[lead.status].texto}`}
        >
          <span aria-hidden className={`w-2 h-2 rounded-full ${COR_ESTAGIO[lead.status].ponto}`} />
          {ROTULO_ESTAGIO[lead.status]}
        </span>
        {trial && lead.trialExpiraEm && (
          <span
            className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-xs font-bold ${TOM_ALERTA[TOM_TRIAL[trial.tipo]]}`}
          >
            <Clock className="w-3.5 h-3.5" aria-hidden />
            {textoTrial(trial, lead.trialExpiraEm)}
          </span>
        )}
        {selo && (
          <span className={`inline-flex items-center h-7 px-2.5 rounded-full border text-xs font-bold ${TOM_ALERTA[selo.tom]}`}>
            {selo.texto}
          </span>
        )}
        {!celular &&
          (semMenu ? null : (
            <button
              ref={setBtnEstagio}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuAberto}
              onClick={() => setMenuAberto((a) => !a)}
              className={`${BTN_PEQUENO} ml-auto`}
            >
              <Shuffle className="w-3.5 h-3.5" aria-hidden />
              Mudar estágio
              <ChevronDown className="w-3.5 h-3.5" aria-hidden />
            </button>
          ))}
      </div>
      {semMenu && modeloMenu.bloqueio && (
        <p className="flex items-start gap-1.5 text-xs text-texto-2">
          <Lock className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />
          {modeloMenu.bloqueio}
        </p>
      )}
      {!celular && (
        <MenuEstagio
          lead={lead}
          ancora={btnEstagio}
          aberto={menuAberto}
          modo="embutido"
          onFechar={() => setMenuAberto(false)}
          onEscolher={escolher}
          onAtualizado={mudou}
        />
      )}
    </div>
  );

  const rodape = celular ? (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => setFolhaEstagio(true)}
        className={`${BTN_FANTASMA} flex-1`}
      >
        <Shuffle className="w-4 h-4" aria-hidden />
        Estágio
      </button>
      <button type="button" onClick={() => setFolhaInteracao(true)} className={`${BTN_PRIMARIO} flex-[2]`}>
        <MessageSquarePlus className="w-4 h-4" aria-hidden />
        Registrar interação
      </button>
    </div>
  ) : undefined;

  return (
    <Folha
      aberta
      onFechar={onFechar}
      titulo={lead.nome}
      cabecalho={cabecalho}
      rodape={rodape}
      focoAoFechar={focoAoFechar}
    >
      <div className="flex flex-col gap-6">
        {editandoContato ? (
          <section aria-label="Editar contato" className="flex flex-col gap-2">
            <h3 className={SECAO_TITULO}>Contato</h3>
            <FormContato
              lead={lead}
              onCancelar={() => setEditandoContato(false)}
              onSalvo={() => {
                setEditandoContato(false);
                mudou();
              }}
              onAbrirLead={onAbrirLead}
            />
          </section>
        ) : (
          <Contato lead={lead} celular={celular} onEditar={() => setEditandoContato(true)} />
        )}

        <BlocoProximaAcao lead={lead} agora={agora} onAlterado={mudou} />

        {lead.assunto && !celular && <MensagemOriginal lead={lead} />}

        {!celular && (
          <section aria-label="Registrar interação" className="flex flex-col gap-2">
            <h3 className={SECAO_TITULO}>Registrar interação</h3>
            <FormInteracao lead={lead} onRegistrado={mudou} />
          </section>
        )}

        {/* estagioEm: o movimento feito pelo pai grava um item `sistema`. */}
        <LinhaDoTempo key={`${lead.estagioEm}-${versao}`} leadId={lead.id} />

        {/* Tela 7: no celular a mensagem original vem depois da linha do tempo. */}
        {lead.assunto && celular && <MensagemOriginal lead={lead} />}

        <Dados lead={lead} />

        {lead.tenantId && <CartaoRede lead={lead} agoraD={agoraD} />}
      </div>

      {celular && (
        <Folha aberta={folhaEstagio} onFechar={() => setFolhaEstagio(false)} titulo="Mudar estágio">
          <MenuEstagio
            lead={lead}
            ancora={null}
            aberto={folhaEstagio}
            modo="embutido"
            onFechar={() => setFolhaEstagio(false)}
            onEscolher={escolher}
            onAtualizado={mudou}
          />
        </Folha>
      )}

      {celular && (
        <Folha
          aberta={folhaInteracao}
          onFechar={() => setFolhaInteracao(false)}
          titulo="Registrar interação"
          focoInicial={textoInteracaoRef}
        >
          <FormInteracao
            lead={lead}
            refTexto={textoInteracaoRef}
            onRegistrado={() => {
              setFolhaInteracao(false);
              mudou();
            }}
          />
        </Folha>
      )}
    </Folha>
  );
}

function Contato({ lead, celular, onEditar }: { lead: LeadCrm; celular: boolean; onEditar: () => void }) {
  const toast = useToast();
  const l = linksContato(lead);
  const semContato = !l.telefone && !l.email;

  function copiar(valor: string, rotulo: string) {
    navigator.clipboard
      .writeText(valor)
      .then(() => toast.sucesso("Copiado!", `${rotulo}: ${valor}`))
      .catch(() => toast.erro("Não foi possível copiar."));
  }

  const alturaAtalho = celular ? "h-16 flex-col gap-1" : "h-10";
  const atalho = (href: string | null, icone: ReactNode, rotulo: string, motivo: string, externo = false) =>
    href ? (
      <a
        href={href}
        {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-borda-campo bg-superficie text-sm font-bold text-texto hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-colors ${alturaAtalho} ${FOCO}`}
      >
        {icone}
        {rotulo}
      </a>
    ) : (
      <span
        aria-disabled="true"
        title={motivo}
        className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-borda bg-fundo text-sm font-bold text-texto-2 opacity-60 cursor-not-allowed ${alturaAtalho}`}
      >
        {icone}
        {rotulo}
        <span className="sr-only">: {motivo}</span>
      </span>
    );

  return (
    <section aria-label="Contato" className="flex flex-col gap-3">
      <div className="flex gap-2">
        {/* Fixo (10 dígitos) não mostra WhatsApp; sem telefone, fica desligado. */}
        {(l.whatsapp || !l.telefone) &&
          atalho(l.whatsapp, <MessageCircle className="w-4 h-4" aria-hidden />, "WhatsApp", "sem telefone", true)}
        {atalho(l.tel, <Phone className="w-4 h-4" aria-hidden />, "Ligar", "sem telefone")}
        {atalho(l.mailto, <Mail className="w-4 h-4" aria-hidden />, "E-mail", "sem e-mail")}
      </div>

      {semContato ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-borda-campo px-3.5 py-3">
          <p className="flex-1 min-w-40 text-sm text-texto-2">
            Sem telefone nem e-mail: os atalhos ficam desligados até você adicionar um contato.
          </p>
          <button type="button" onClick={onEditar} className={BTN_PEQUENO}>
            <UserPlus className="w-3.5 h-3.5" aria-hidden />
            Adicionar contato
          </button>
        </div>
      ) : (
        <dl className="flex flex-col gap-1.5 text-sm">
          {l.telefone && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Telefone</dt>
              <dd className="flex-1 min-w-0 font-mono text-texto">{formatarTelefone(l.telefone)}</dd>
              <button
                type="button"
                onClick={() => copiar(formatarTelefone(l.telefone ?? ""), "Telefone")}
                aria-label="Copiar telefone"
                className={`toque-44 w-8 h-8 grid place-items-center rounded-lg text-texto-2 hover:bg-fundo hover:text-texto ${FOCO}`}
              >
                <Copy className="w-4 h-4" aria-hidden />
              </button>
            </div>
          )}
          {l.email && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">E-mail</dt>
              <dd className="flex-1 min-w-0 text-texto break-all">{l.email}</dd>
              <button
                type="button"
                onClick={() => copiar(l.email ?? "", "E-mail")}
                aria-label="Copiar e-mail"
                className={`toque-44 w-8 h-8 grid place-items-center rounded-lg text-texto-2 hover:bg-fundo hover:text-texto ${FOCO}`}
              >
                <Copy className="w-4 h-4" aria-hidden />
              </button>
            </div>
          )}
          {!l.telefone || !l.email ? (
            <p className="text-xs text-texto-2">{!l.telefone ? "Sem telefone." : "Sem e-mail."}</p>
          ) : null}
        </dl>
      )}

      {!semContato && (
        <div>
          <button type="button" onClick={onEditar} className={BTN_PEQUENO}>
            <Pencil className="w-3.5 h-3.5" aria-hidden />
            Editar contato
          </button>
        </div>
      )}
    </section>
  );
}

function MensagemOriginal({ lead }: { lead: LeadCrm }) {
  return (
    <section aria-label="Mensagem original" className="flex flex-col gap-2">
      <h3 className={SECAO_TITULO}>Mensagem original</h3>
      <p className="rounded-xl border border-borda bg-fundo px-3.5 py-3 text-sm leading-relaxed text-texto whitespace-pre-wrap break-words">
        {lead.assunto}
      </p>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-texto-2">
        {lead.origem && (
          <span>
            veio de <b className="font-mono">{lead.origem}</b>
          </span>
        )}
        <span>chegou em {formatarDataHora(lead.criadoEm)}</span>
        {lead.atendidoEm && <span>respondido em {formatarDataHora(lead.atendidoEm)}</span>}
      </p>
    </section>
  );
}

function Dados({ lead }: { lead: LeadCrm }) {
  const utm = [lead.utmSource, lead.utmMedium].filter(Boolean).join(" / ");
  const linhas: [string, ReactNode][] = [
    ["Fonte", rotuloFonte(lead)],
    ["Praça", lead.praca ?? "não identificada"],
    ["Página", lead.origem ? <span className="font-mono break-all">{lead.origem}</span> : "—"],
    ["Campanha", lead.utmCampaign ?? "—"],
  ];
  if (utm) linhas.push(["Origem da campanha", utm]);
  linhas.push(["Chegou em", formatarDataHora(lead.criadoEm)]);

  return (
    <section aria-label="Dados" className="flex flex-col gap-2">
      <h3 className={SECAO_TITULO}>Dados</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="contents">
            <dt className="text-texto-2">{rotulo}</dt>
            <dd className="text-texto min-w-0 break-words">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CartaoRede({ lead, agoraD }: { lead: LeadCrm; agoraD: Date }) {
  const trial =
    lead.assinaturaEstado === "trial" && lead.trialExpiraEm
      ? classificarTrial(lead.trialExpiraEm, agoraD)
      : null;
  return (
    <section aria-label="Rede" className="flex flex-col gap-2">
      <h3 className={SECAO_TITULO}>Rede</h3>
      <div className="rounded-2xl border border-borda bg-superficie p-4 shadow-[var(--shadow-card)]">
        <Link
          href={`/master/tenants/${lead.tenantId}`}
          className={`group inline-flex items-center gap-1.5 text-sm font-bold text-texto hover:text-brand-700 rounded ${FOCO}`}
        >
          {lead.tenantNome ?? "Rede"}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {lead.tenantCodigo && (
            <>
              <dt className="text-texto-2">Código</dt>
              <dd className="font-mono text-texto">{lead.tenantCodigo}</dd>
            </>
          )}
          <dt className="text-texto-2">Assinatura</dt>
          <dd className="text-texto">
            {lead.assinaturaEstado ? ROTULO_ASSINATURA[lead.assinaturaEstado] : "sem assinatura"}
          </dd>
          {trial && lead.trialExpiraEm && (
            <>
              <dt className="text-texto-2">Trial</dt>
              <dd
                className={
                  trial.tipo === "expirado"
                    ? "font-bold text-perigo-texto"
                    : trial.tipo === "expirando"
                      ? "font-bold text-aviso-texto"
                      : "text-texto"
                }
              >
                {textoTrial(trial, lead.trialExpiraEm)}
              </dd>
            </>
          )}
        </dl>
      </div>
    </section>
  );
}
