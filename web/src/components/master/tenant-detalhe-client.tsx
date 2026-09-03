"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Smartphone,
  MonitorSmartphone,
  Ticket,
  Wallet,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Globe,
  History,
  Sparkles,
  Car,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { moeda } from "@/lib/financeiro";
import { labelAssinaturaEstado } from "@/lib/status-labels";
import { formatarData, formatarDataHora, tempoRelativo } from "@/lib/format-data";
import { formatarTelefone } from "@/lib/telefone";
import { formatarCnpj } from "@/lib/cnpj";
import type { Gestor } from "@/lib/gestores";

// ───────────────────────────────────────────────────────────────── tipos ──

export type FichaDispositivo = {
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
  vinculadoEm: string | null;
};

export type FichaPatio = {
  id: string;
  nome: string;
  codigo: string | null;
  qtdVagas: number;
  ativo: boolean;
  criadoEm: string;
  tickets: number;
  tickets30d: number;
  faturamento: number;
  ultimoTicket: string | null;
  dispositivos: FichaDispositivo[];
};

export type FichaOperador = {
  id: string;
  nome: string;
  usuario: string;
  ativo: boolean;
  criadoEm: string;
};

export type FichaAcesso = {
  evento: string;
  motivo: string | null;
  aparelho: string | null;
  appVersao: string | null;
  ip: string | null;
  em: string;
  patio: string;
};

export type Evento = {
  em: string;
  titulo: string;
  detalhe: string;
  tipo: "cadastro" | "painel" | "app" | "uso" | "financeiro";
};

type Props = {
  tenant: {
    id: string;
    nome: string;
    codigo: string;
    ativo: boolean;
    criadoEm: string;
    atualizadoEm: string;
    telefone: string | null;
    cnpj: string | null;
    razaoSocial: string | null;
  };
  assinatura: {
    estado: string | null;
    origem: string;
    valorPorPatio: number;
    valorDispositivoExtra: number;
    diaVencimento: number | null;
    trialExpiraEm: string | null;
    emailCobranca: string | null;
    cpfCnpj: string | null;
    temGateway: boolean;
  };
  local: {
    ddd: string | null;
    uf: string | null;
    estado: string | null;
    regiao: string | null;
    praca: string | null;
    ultimoIp: string | null;
    ultimoIpEm: string | null;
  };
  gestores: Gestor[];
  patios: FichaPatio[];
  operadores: FichaOperador[];
  acessos: FichaAcesso[];
  uso: {
    ticketsTotal: number;
    tickets30d: number;
    ticketsAbertos: number;
    faturamentoTotal: number;
    faturamento30d: number;
    primeiroTicket: string | null;
    ultimoTicket: string | null;
    patiosComMovimento: number;
  };
  /** db/38 ausente no banco: os números de uso não são confiáveis. */
  usoIndisponivel: boolean;
  financeiro: {
    emAberto: number;
    vencido: number;
    pago: number;
    qtdAbertas: number;
    qtdVencidas: number;
    qtdPagas: number;
    proximoVencimento: string | null;
  };
  eventos: Evento[];
};

const ESTADO_CLS: Record<string, string> = {
  trial: "bg-info-bg text-info border-info/25",
  ativa: "bg-brand-50 text-brand-700 border-brand-200",
  atrasada: "bg-aviso-bg text-aviso border-aviso/25",
  suspensa: "bg-perigo-bg text-perigo border-perigo/20",
  cancelada: "bg-fundo text-texto-3 border-borda",
};

const DISP_STATUS: Record<string, { rotulo: string; cls: string }> = {
  ativo: { rotulo: "Ativo", cls: "bg-brand-50 text-brand-700 border-brand-200" },
  pendente: { rotulo: "Aguardando liberação", cls: "bg-aviso-bg text-aviso border-aviso/25" },
  bloqueado: { rotulo: "Bloqueado", cls: "bg-perigo-bg text-perigo border-perigo/20" },
  revogado: { rotulo: "Revogado", cls: "bg-fundo text-texto-3 border-borda" },
};

const LICENCA: Record<string, string> = {
  nenhuma: "Sem licença",
  incluso: "Incluso no pátio",
  licenciado: "Extra (cobrado)",
  cortesia: "Cortesia",
};

const EVENTO_APP: Record<string, string> = {
  login_ok: "Login do operador",
  login_negado: "Login negado",
  vinculado: "Aparelho vinculado",
  licenciado: "Aparelho licenciado",
  revogado: "Aparelho revogado",
  bloqueado: "Aparelho bloqueado",
  desbloqueado: "Aparelho desbloqueado",
  reidentificado: "Reinstalação reconhecida",
};

const TIPO_EVENTO: Record<Evento["tipo"], { cls: string; ponto: string }> = {
  cadastro: { cls: "text-texto-2", ponto: "bg-texto-3" },
  painel: { cls: "text-info", ponto: "bg-info" },
  app: { cls: "text-acento", ponto: "bg-acento" },
  uso: { cls: "text-brand-700", ponto: "bg-brand-500" },
  financeiro: { cls: "text-aviso", ponto: "bg-aviso" },
};

// ──────────────────────────────────────────────────────────── componente ──

export function TenantDetalheClient(props: Props) {
  const toast = useToast();
  const { tenant, assinatura, local, gestores, patios, operadores, uso } = props;

  const dispositivos = useMemo(
    () => patios.flatMap((p) => p.dispositivos.map((d) => ({ ...d, patio: p.nome }))),
    [patios],
  );
  const baixouApp = dispositivos.length > 0;
  const dispositivosVivos = dispositivos.filter((d) => d.status === "ativo");
  const ultimoAcessoApp = dispositivos
    .map((d) => d.ultimoAcesso)
    .filter((v): v is string => !!v)
    .sort()
    .at(-1);

  const ultimoLoginPainel = gestores
    .map((g) => g.ultimoLogin)
    .filter((v): v is string => !!v)
    .sort()
    .at(-1);

  const patiosAtivos = patios.filter((p) => p.ativo).length;
  const mensalidade = assinatura.valorPorPatio * patiosAtivos;
  const estadoCls = ESTADO_CLS[assinatura.estado ?? ""] ?? ESTADO_CLS.ativa;

  function copiar(valor: string, rotulo: string) {
    navigator.clipboard.writeText(valor);
    toast.sucesso("Copiado!", `${rotulo}: ${valor}`);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        href="/master/tenants"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-texto-3 hover:text-brand-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Redes
      </Link>

      {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start gap-4 flex-wrap"
      >
        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white shrink-0 shadow-[var(--shadow-brand)]">
          <Building2 className="w-6 h-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[26px] font-black tracking-tight">{tenant.nome}</h1>
            <button
              onClick={() => copiar(tenant.codigo, "Código da rede")}
              title="Copiar código da rede"
              className="inline-flex items-center gap-1.5 font-mono font-black tracking-[0.2em] text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-2 py-1 hover:bg-brand-100 transition-colors"
            >
              {tenant.codigo}
              <Copy className="w-3 h-3" />
            </button>
            {assinatura.origem === "signup" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-acento bg-info-bg border border-info/20 px-1.5 py-0.5 rounded">
                <Sparkles className="w-3 h-3" />
                Veio do site
              </span>
            )}
          </div>
          <p className="text-sm text-texto-2">
            Ficha completa da rede — cadastro, praça, acessos e operação.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!tenant.ativo && (
            <span className="inline-block text-xs font-bold px-3 py-1 rounded-full border bg-perigo-bg text-perigo border-perigo/20">
              Rede desativada
            </span>
          )}
          <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${estadoCls}`}>
            {labelAssinaturaEstado(assinatura.estado)}
          </span>
        </div>
      </motion.header>

      {/* ── Os quatro sinais ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Sinal
          Icone={Smartphone}
          rotulo="App instalado"
          valor={baixouApp ? "Sim" : "Não"}
          detalhe={
            baixouApp
              ? `${dispositivosVivos.length} de ${dispositivos.length} ${dispositivos.length === 1 ? "aparelho ativo" : "aparelhos ativos"}`
              : "Nenhum aparelho pareado"
          }
          cor={baixouApp ? "brand" : "neutro"}
        />
        <Sinal
          Icone={MonitorSmartphone}
          rotulo="Painel web"
          valor={ultimoLoginPainel ? tempoRelativo(ultimoLoginPainel) : "Nunca"}
          detalhe={
            gestores.length > 0
              ? `${gestores.length} ${gestores.length === 1 ? "gestor" : "gestores"} com acesso`
              : "Sem gestor no Auth"
          }
          cor={ultimoLoginPainel ? "info" : "aviso"}
        />
        <Sinal
          Icone={Ticket}
          rotulo="Tickets (30 dias)"
          valor={props.usoIndisponivel ? "—" : uso.tickets30d.toLocaleString("pt-BR")}
          detalhe={
            props.usoIndisponivel
              ? "agregação indisponível"
              : uso.ultimoTicket
                ? `último ${tempoRelativo(uso.ultimoTicket)}`
                : "nunca emitiu ticket"
          }
          cor={props.usoIndisponivel ? "neutro" : uso.tickets30d > 0 ? "brand" : "aviso"}
        />
        <Sinal
          Icone={Wallet}
          rotulo="Em atraso"
          valor={moeda.format(props.financeiro.vencido)}
          detalhe={
            props.financeiro.qtdVencidas > 0
              ? `${props.financeiro.qtdVencidas} ${props.financeiro.qtdVencidas === 1 ? "fatura vencida" : "faturas vencidas"}`
              : "nada vencido"
          }
          cor={props.financeiro.vencido > 0 ? "perigo" : "brand"}
        />
      </motion.div>

      {/* ── Cadastro + Localização ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cartao Icone={FileText} titulo="Cadastro" atraso={0.1}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
            <Campo rotulo="Nome da rede" valor={tenant.nome} />
            <Campo rotulo="Razão social" valor={tenant.razaoSocial} />
            <Campo
              rotulo="CNPJ"
              valor={tenant.cnpj ? formatarCnpj(tenant.cnpj) : null}
            />
            <Campo rotulo="Código interno" valor={tenant.codigo} mono />
            <div>
              <Rotulo>Telefone</Rotulo>
              {tenant.telefone ? (
                <dd className="mt-0.5 flex items-center gap-2 flex-wrap">
                  <a
                    href={`tel:+55${tenant.telefone}`}
                    className="font-bold hover:text-brand-700 transition-colors"
                  >
                    {formatarTelefone(tenant.telefone)}
                  </a>
                  <a
                    href={`https://wa.me/55${tenant.telefone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline"
                  >
                    WhatsApp
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </dd>
              ) : (
                <dd className="mt-0.5 font-bold text-texto-3">—</dd>
              )}
            </div>
            <div>
              <Rotulo>E-mail de cobrança</Rotulo>
              {assinatura.emailCobranca ? (
                <dd className="mt-0.5">
                  <a
                    href={`mailto:${assinatura.emailCobranca}`}
                    className="font-bold break-all hover:text-brand-700 transition-colors"
                  >
                    {assinatura.emailCobranca}
                  </a>
                </dd>
              ) : (
                <dd className="mt-0.5 font-bold text-aviso">não definido</dd>
              )}
            </div>
            <Campo rotulo="Cadastrada em" valor={formatarDataHora(tenant.criadoEm)} />
            <Campo
              rotulo="Última alteração"
              valor={formatarDataHora(tenant.atualizadoEm)}
            />
          </dl>

          <div className="mt-4 pt-4 border-t border-borda flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <Mini rotulo="Mensalidade" valor={moeda.format(mensalidade)} destaque />
            <Mini
              rotulo="Por pátio"
              valor={`${moeda.format(assinatura.valorPorPatio)}`}
            />
            <Mini
              rotulo="Aparelho extra"
              valor={`${moeda.format(assinatura.valorDispositivoExtra)}`}
            />
            <Mini
              rotulo="Vencimento"
              valor={assinatura.diaVencimento ? `dia ${assinatura.diaVencimento}` : "—"}
            />
            {assinatura.trialExpiraEm && (
              <Mini
                rotulo="Trial até"
                valor={formatarData(assinatura.trialExpiraEm)}
              />
            )}
          </div>
        </Cartao>

        <Cartao Icone={MapPin} titulo="Localização" atraso={0.14}>
          {local.praca ? (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-black tracking-tight">
                  {local.uf}
                </span>
                <span className="text-sm font-bold text-texto-2">
                  {local.estado}
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-texto-3 bg-fundo border border-borda rounded-md px-1.5 py-0.5">
                  {local.regiao}
                </span>
              </div>
              <p className="mt-2 text-sm text-texto-2">
                <b className="text-texto">{local.praca}</b>
                <span className="text-texto-3">
                  {" "}
                  — área do DDD {local.ddd}.
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-texto-3">
              Sem telefone no cadastro — não dá para inferir a praça.
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-borda">
            <Rotulo>Último IP do app</Rotulo>
            {local.ultimoIp ? (
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => copiar(local.ultimoIp!, "IP")}
                  className="inline-flex items-center gap-1.5 font-mono text-sm font-bold bg-fundo border border-borda rounded-lg px-2 py-1 hover:border-brand-300 transition-colors"
                >
                  {local.ultimoIp}
                  <Copy className="w-3 h-3 text-texto-3" />
                </button>
                <span className="text-xs text-texto-3">
                  {tempoRelativo(local.ultimoIpEm)}
                </span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-texto-3">
                Nenhum acesso do app registrou IP ainda.
              </p>
            )}
          </div>

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-texto-3">
            <Globe className="w-3.5 h-3.5 mt-px shrink-0" />
            Praça deduzida do DDD do telefone e IP do último acesso do app. É
            pista comercial, não endereço: o DDD é do número, não da pessoa, e o
            IP pode ser de operadora móvel.
          </p>
        </Cartao>
      </div>

      {/* ── Acesso à plataforma ─────────────────────────────────────────── */}
      <Cartao
        Icone={MonitorSmartphone}
        titulo="Acesso à plataforma (painel web)"
        atraso={0.18}
        subtitulo={
          gestores.length > 0
            ? `${gestores.length} ${gestores.length === 1 ? "conta" : "contas"} vinculadas a esta rede no Supabase Auth`
            : undefined
        }
      >
        {gestores.length === 0 ? (
          <Vazio
            Icone={AlertTriangle}
            alerta
            texto="Nenhum usuário do Auth aponta para esta rede. O gestor não consegue entrar no painel — só o app funciona."
          />
        ) : (
          <ResponsiveTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                  <th className="py-2 pr-4 font-bold">Gestor</th>
                  <th className="py-2 pr-4 font-bold">Entra por</th>
                  <th className="py-2 pr-4 font-bold">E-mail confirmado</th>
                  <th className="py-2 pr-4 font-bold">Criado em</th>
                  <th className="py-2 font-bold">Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {gestores.map((g) => (
                  <tr key={g.id} className="border-t border-borda align-top">
                    <td className="py-3 pr-4">
                      <div className="font-bold">{g.nome ?? "—"}</div>
                      {g.email && (
                        <a
                          href={`mailto:${g.email}`}
                          className="text-[12px] text-texto-2 hover:text-brand-700 break-all"
                        >
                          {g.email}
                        </a>
                      )}
                      {g.telefone && (
                        <div className="text-[11px] text-texto-3 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {formatarTelefone(g.telefone)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {g.provedores.length === 0 ? (
                          <span className="text-texto-3">—</span>
                        ) : (
                          g.provedores.map((p) => (
                            <span
                              key={p}
                              className="text-[11px] font-bold px-1.5 py-0.5 rounded border bg-fundo border-borda text-texto-2"
                            >
                              {p === "email" ? "E-mail e senha" : p === "google" ? "Google" : p}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {g.emailConfirmadoEm ? (
                        <span className="inline-flex items-center gap-1 text-brand-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {formatarData(g.emailConfirmadoEm)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-aviso font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          pendente
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-texto-2 whitespace-nowrap">
                      {formatarData(g.criadoEm)}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      {g.ultimoLogin ? (
                        <>
                          <div className="font-semibold">{tempoRelativo(g.ultimoLogin)}</div>
                          <div className="text-[11px] text-texto-3">
                            {formatarDataHora(g.ultimoLogin)}
                          </div>
                        </>
                      ) : (
                        <span className="text-aviso font-semibold">nunca entrou</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </Cartao>

      {/* ── App ─────────────────────────────────────────────────────────── */}
      <Cartao
        Icone={Smartphone}
        titulo="App do operador"
        atraso={0.22}
        subtitulo={
          baixouApp
            ? ultimoAcessoApp
              ? `Último uso ${tempoRelativo(ultimoAcessoApp)}`
              : "Pareado, mas ainda sem uso registrado"
            : undefined
        }
      >
        {!baixouApp ? (
          <Vazio
            Icone={Smartphone}
            alerta
            texto="Nenhum aparelho pareado — esta rede ainda não instalou (ou nunca abriu) o app. O gestor precisa cadastrar um pátio e usar o código do pátio no aplicativo."
          />
        ) : (
          <div className="space-y-3">
            {dispositivos.map((d) => {
              const st = DISP_STATUS[d.status] ?? DISP_STATUS.revogado;
              return (
                <div
                  key={d.id}
                  className="rounded-xl border border-borda bg-fundo/50 p-3.5 flex items-start gap-3 flex-wrap"
                >
                  <span className="w-9 h-9 rounded-lg bg-superficie border border-borda grid place-items-center shrink-0">
                    <Smartphone className="w-4 h-4 text-texto-2" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">
                      {d.apelido ||
                        [d.fabricante, d.modelo].filter(Boolean).join(" ") ||
                        "Aparelho"}
                    </div>
                    <div className="text-[12px] text-texto-2">
                      {[d.fabricante, d.modelo].filter(Boolean).join(" ") || "modelo desconhecido"}
                      {d.soVersao && ` · Android ${d.soVersao}`}
                      {d.appVersao && ` · app ${d.appVersao}`}
                    </div>
                    <div className="text-[11px] text-texto-3 mt-0.5">
                      {d.patio} · {LICENCA[d.licenca] ?? d.licenca}
                      {d.codigoPareamento && ` · pareamento ${d.codigoPareamento}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}
                    >
                      {st.rotulo}
                    </span>
                    <div className="text-[11px] text-texto-3 mt-1">
                      {d.ultimoAcesso ? tempoRelativo(d.ultimoAcesso) : "sem acesso"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {props.acessos.length > 0 && (
          <div className="mt-5 pt-4 border-t border-borda">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-texto-3 mb-2">
              Últimos eventos do app
            </h3>
            <ResponsiveTable>
              <table className="w-full text-sm">
                <tbody>
                  {props.acessos.slice(0, 12).map((a, i) => (
                    <tr key={`${a.em}-${i}`} className="border-t border-borda first:border-t-0">
                      <td className="py-2 pr-4">
                        <span
                          className={`font-semibold ${a.evento === "login_negado" ? "text-perigo" : ""}`}
                        >
                          {EVENTO_APP[a.evento] ?? a.evento}
                        </span>
                        {a.motivo && (
                          <span className="text-texto-3"> · {a.motivo}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-texto-2 whitespace-nowrap">{a.patio}</td>
                      <td className="py-2 pr-4 text-texto-3 whitespace-nowrap hidden sm:table-cell">
                        {a.aparelho ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-texto-3 font-mono text-[12px] whitespace-nowrap hidden md:table-cell">
                        {a.ip ?? "—"}
                      </td>
                      <td className="py-2 text-texto-3 whitespace-nowrap text-right">
                        {formatarDataHora(a.em)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          </div>
        )}
      </Cartao>

      {/* ── Uso real ────────────────────────────────────────────────────── */}
      <Cartao Icone={Ticket} titulo="Uso da operação" atraso={0.26}>
        {props.usoIndisponivel && (
          <p className="mb-4 flex items-start gap-2 text-sm text-perigo bg-perigo-bg border border-perigo/20 rounded-xl px-3.5 py-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            Números indisponíveis — as funções de agregação não respondem. Aplique{" "}
            <b>db/38-master-tenant-detalhe.sql</b> no SQL Editor. Os zeros abaixo
            não significam que a rede está parada.
          </p>
        )}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <Campo rotulo="Tickets no total" valor={uso.ticketsTotal.toLocaleString("pt-BR")} />
          <Campo rotulo="Últimos 30 dias" valor={uso.tickets30d.toLocaleString("pt-BR")} destaque />
          <Campo rotulo="Abertos agora" valor={uso.ticketsAbertos.toLocaleString("pt-BR")} />
          <Campo
            rotulo="Pátios com movimento"
            valor={`${uso.patiosComMovimento} de ${patios.length}`}
          />
          <Campo rotulo="Faturamento do cliente" valor={moeda.format(uso.faturamentoTotal)} />
          <Campo rotulo="Nos últimos 30 dias" valor={moeda.format(uso.faturamento30d)} />
          <Campo
            rotulo="Primeiro ticket"
            valor={uso.primeiroTicket ? formatarData(uso.primeiroTicket) : null}
          />
          <Campo
            rotulo="Último ticket"
            valor={uso.ultimoTicket ? formatarDataHora(uso.ultimoTicket) : null}
          />
        </dl>
        {uso.ticketsTotal === 0 && !props.usoIndisponivel && (
          <p className="mt-4 flex items-start gap-2 text-sm text-aviso bg-aviso-bg border border-aviso/25 rounded-xl px-3.5 py-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            Rede cadastrada mas sem nenhum ticket — nunca saiu do papel. Vale uma
            ligação de onboarding.
          </p>
        )}
      </Cartao>

      {/* ── Pátios ──────────────────────────────────────────────────────── */}
      <Cartao
        Icone={Car}
        titulo="Pátios"
        atraso={0.3}
        subtitulo={`${patiosAtivos} ${patiosAtivos === 1 ? "ativo" : "ativos"} de ${patios.length}`}
      >
        {patios.length === 0 ? (
          <Vazio
            Icone={Car}
            alerta
            texto="Nenhum pátio cadastrado. Sem pátio não há código de acesso para o app — a rede está parada no primeiro passo."
          />
        ) : (
          <ResponsiveTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                  <th className="py-2 pr-4 font-bold">Pátio</th>
                  <th className="py-2 pr-4 font-bold">Vagas</th>
                  <th className="py-2 pr-4 font-bold">Aparelhos</th>
                  <th className="py-2 pr-4 font-bold text-right">Tickets</th>
                  <th className="py-2 pr-4 font-bold text-right">30 dias</th>
                  <th className="py-2 font-bold text-right">Último ticket</th>
                </tr>
              </thead>
              <tbody>
                {patios.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t border-borda ${p.ativo ? "" : "opacity-55"}`}
                  >
                    <td className="py-3 pr-4">
                      <div className="font-bold">{p.nome}</div>
                      <div className="text-[11px] text-texto-3">
                        {p.codigo ? (
                          <span className="font-mono tracking-wider">{p.codigo}</span>
                        ) : (
                          "sem código"
                        )}
                        {!p.ativo && " · desativado"}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-texto-2 tabular-nums">{p.qtdVagas}</td>
                    <td className="py-3 pr-4 text-texto-2 tabular-nums">
                      {p.dispositivos.filter((d) => d.status === "ativo").length}
                      <span className="text-texto-3"> / {p.dispositivos.length}</span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums font-bold">
                      {props.usoIndisponivel ? "—" : p.tickets.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {props.usoIndisponivel ? "—" : p.tickets30d.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 text-right text-texto-3 whitespace-nowrap">
                      {props.usoIndisponivel
                        ? "—"
                        : p.ultimoTicket
                          ? tempoRelativo(p.ultimoTicket)
                          : "nunca"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </Cartao>

      {/* ── Operadores ──────────────────────────────────────────────────── */}
      <Cartao
        Icone={Users}
        titulo="Operadores do app"
        atraso={0.34}
        subtitulo={
          operadores.length > 0
            ? `${operadores.filter((o) => o.ativo).length} ativos de ${operadores.length}`
            : undefined
        }
      >
        {operadores.length === 0 ? (
          <Vazio
            Icone={Users}
            texto="Nenhum operador cadastrado pelo gestor ainda."
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {operadores.map((o) => (
              <div
                key={o.id}
                className={`rounded-xl border px-3 py-2 ${
                  o.ativo
                    ? "border-borda bg-fundo/50"
                    : "border-borda bg-fundo/50 opacity-55"
                }`}
              >
                <div className="font-bold text-sm">{o.nome}</div>
                <div className="text-[11px] text-texto-3 font-mono">
                  {o.usuario}
                  {!o.ativo && " · inativo"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Cartao>

      {/* ── Financeiro ──────────────────────────────────────────────────── */}
      <Cartao Icone={Wallet} titulo="Financeiro" atraso={0.38}>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <Campo
            rotulo="A vencer"
            valor={`${moeda.format(props.financeiro.emAberto)}`}
          />
          <Campo
            rotulo="Vencido"
            valor={`${moeda.format(props.financeiro.vencido)}`}
            alerta={props.financeiro.vencido > 0}
          />
          <Campo rotulo="Já pago" valor={moeda.format(props.financeiro.pago)} destaque />
          <Campo
            rotulo="Próximo vencimento"
            valor={
              props.financeiro.proximoVencimento
                ? formatarData(props.financeiro.proximoVencimento)
                : null
            }
          />
        </dl>
        <div className="mt-4 pt-4 border-t border-borda flex items-center gap-3 flex-wrap text-[12px] text-texto-3">
          <span>
            {props.financeiro.qtdPagas} pagas · {props.financeiro.qtdAbertas} abertas ·{" "}
            {props.financeiro.qtdVencidas} vencidas
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {assinatura.temGateway ? "Cliente criado no gateway" : "Sem cliente no gateway"}
          </span>
          <Link
            href={`/master/assinaturas/${tenant.id}`}
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-sm font-bold hover:bg-brand-100 transition-colors"
          >
            Abrir faturas
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Cartao>

      {/* ── Linha do tempo ──────────────────────────────────────────────── */}
      <Cartao Icone={History} titulo="Linha do tempo" atraso={0.42}>
        <ol className="relative border-l border-borda ml-1.5 space-y-4">
          {props.eventos.map((e, i) => {
            const t = TIPO_EVENTO[e.tipo];
            return (
              <li key={`${e.em}-${i}`} className="pl-5 relative">
                <span
                  className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-superficie ${t.ponto}`}
                />
                <div className={`text-sm font-bold ${t.cls}`}>{e.titulo}</div>
                <div className="text-[12px] text-texto-2">{e.detalhe}</div>
                <div className="text-[11px] text-texto-3 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {formatarDataHora(e.em)}
                  <span>· {tempoRelativo(e.em)}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </Cartao>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── auxiliares ──

function Cartao({
  Icone,
  titulo,
  subtitulo,
  atraso,
  children,
}: {
  Icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  subtitulo?: string;
  atraso: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: atraso }}
      className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center shrink-0">
          <Icone className="w-4 h-4 text-brand-600" />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold leading-tight">{titulo}</h2>
          {subtitulo && (
            <p className="text-[11px] text-texto-3 leading-tight">{subtitulo}</p>
          )}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function Sinal({
  Icone,
  rotulo,
  valor,
  detalhe,
  cor,
}: {
  Icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor: string;
  detalhe: string;
  cor: "brand" | "info" | "aviso" | "perigo" | "neutro";
}) {
  const cls = {
    brand: "bg-brand-50 text-brand-600",
    info: "bg-info-bg text-info",
    aviso: "bg-aviso-bg text-aviso",
    perigo: "bg-perigo-bg text-perigo",
    neutro: "bg-fundo text-texto-3",
  }[cor];
  return (
    <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-4">
      <span className={`w-9 h-9 rounded-xl grid place-items-center ${cls}`}>
        <Icone className="w-4.5 h-4.5" />
      </span>
      <div className="text-[11px] font-bold uppercase tracking-wider text-texto-3 mt-2.5">
        {rotulo}
      </div>
      <div className="text-lg font-black leading-tight truncate">{valor}</div>
      <div className="text-[11px] text-texto-3 leading-tight mt-0.5">{detalhe}</div>
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-xs font-bold text-texto-3 uppercase tracking-wide">
      {children}
    </dt>
  );
}

function Campo({
  rotulo,
  valor,
  destaque,
  alerta,
  mono,
}: {
  rotulo: string;
  valor: string | null;
  destaque?: boolean;
  alerta?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <Rotulo>{rotulo}</Rotulo>
      <dd
        className={`mt-0.5 tabular-nums break-words ${
          destaque ? "text-brand-700 font-black text-lg" : "font-bold"
        } ${alerta ? "text-perigo" : ""} ${mono ? "font-mono tracking-wider" : ""} ${
          valor ? "" : "text-texto-3"
        }`}
      >
        {valor || "—"}
      </dd>
    </div>
  );
}

function Mini({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-wider text-texto-3">
        {rotulo}
      </div>
      <div
        className={`tabular-nums ${destaque ? "font-black text-brand-700" : "font-bold text-sm"}`}
      >
        {valor}
      </div>
    </div>
  );
}

function Vazio({
  Icone,
  texto,
  alerta = false,
}: {
  Icone: React.ComponentType<{ className?: string }>;
  texto: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm ${
        alerta
          ? "border-aviso/25 bg-aviso-bg text-aviso"
          : "border-borda bg-fundo/50 text-texto-3"
      }`}
    >
      <Icone className="w-4 h-4 mt-0.5 shrink-0" />
      <p>{texto}</p>
    </div>
  );
}
