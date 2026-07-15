"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2,
  CreditCard,
  Smartphone,
  ShieldCheck,
  ShieldX,
  Copy,
  Save,
  Loader2,
} from "lucide-react";
import {
  alternarDispositivo,
  atualizarRede,
} from "@/app/painel/configuracoes/actions";
import { soDigitos, formatarCnpj, cnpjValido } from "@/lib/cnpj";
import { labelAssinaturaEstado } from "@/lib/status-labels";
import { formatarData, formatarDataHora } from "@/lib/format-data";
import { useToast } from "@/components/ui/toast";
import { Confirmar } from "@/components/ui/confirmar";

type Tenant = {
  nome: string;
  codigo: string;
  cnpj: string | null;
  razao_social: string | null;
};
type Assinatura = {
  estado: string;
  valor_por_patio: number;
  vencimento: string | null;
} | null;
type Dispositivo = {
  id: string;
  nome: string | null;
  device_uuid: string;
  status: string;
  ultimo_acesso: string | null;
  patio_id: string;
};
type Patio = {
  id: string;
  nome: string;
  codigoAcesso?: string | null;
  ativo?: boolean;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Só as cores por estado — o texto vem de labelAssinaturaEstado (util central).
const ESTADO_CLS: Record<string, string> = {
  ativa: "bg-brand-50 text-brand-700 border-brand-200",
  atrasada: "bg-aviso-bg text-aviso border-aviso/25",
  suspensa: "bg-perigo-bg text-perigo border-perigo/20",
};

export function ConfiguracoesClient({
  tenant,
  assinatura,
  dispositivos,
  patios,
  qtdPatiosAtivos,
}: {
  tenant: Tenant | null;
  assinatura: Assinatura;
  dispositivos: Dispositivo[];
  patios: Patio[];
  qtdPatiosAtivos: number;
}) {
  const toast = useToast();
  const nomePatio = (id: string) =>
    patios.find((p) => p.id === id)?.nome ?? "—";

  const estadoCls = ESTADO_CLS[assinatura?.estado ?? "ativa"] ?? ESTADO_CLS.ativa;
  const estadoRotulo = labelAssinaturaEstado(assinatura?.estado ?? "ativa");
  const mensalidade =
    (Number(assinatura?.valor_por_patio) || 0) * qtdPatiosAtivos;

  function copiarCodigoPatio(p: Patio) {
    if (!p.codigoAcesso) return;
    navigator.clipboard.writeText(p.codigoAcesso);
    toast.sucesso("Copiado!", `Código do ${p.nome}: ${p.codigoAcesso}`);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight">Configurações</h1>
        <p className="text-sm text-texto-2">
          Dados da rede, assinatura e dispositivos autorizados.
        </p>
      </motion.header>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Rede */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06 }}
          className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
              <Building2 className="w-4 h-4 text-brand-600" />
            </span>
            <h2 className="font-bold">Sua rede</h2>
          </div>

          <FormRede tenant={tenant} />

          <dl className="mt-4 pt-4 border-t border-borda text-sm">
            <div className="flex justify-between">
              <dt className="text-texto-2">Pátios ativos</dt>
              <dd className="font-bold tabular-nums">{qtdPatiosAtivos}</dd>
            </div>
          </dl>

          <p className="mt-5 mb-2 text-xs font-black uppercase tracking-wider text-texto-3">
            Códigos de acesso do app (por pátio)
          </p>
          <div className="space-y-2">
            {patios
              .filter((p) => p.ativo !== false)
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-sm text-texto-2 truncate">{p.nome}</span>
                  <button
                    onClick={() => copiarCodigoPatio(p)}
                    title="Copiar código"
                    className="inline-flex items-center gap-1.5 font-mono font-black tracking-[0.25em] text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-2.5 py-1 hover:bg-brand-100 transition-colors"
                  >
                    {p.codigoAcesso ?? "????"}
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
          </div>
          <p className="mt-4 text-xs text-texto-3 leading-relaxed">
            O operador entra no app com o código do pátio dele + usuário +
            senha — e já cai direto na unidade.
          </p>
        </motion.section>

        {/* Assinatura */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
                <CreditCard className="w-4 h-4 text-brand-600" />
              </span>
              <h2 className="font-bold">Assinatura</h2>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${estadoCls}`}
            >
              {estadoRotulo}
            </span>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-texto-2">Valor por pátio</dt>
              <dd className="font-bold tabular-nums">
                {moeda.format(Number(assinatura?.valor_por_patio) || 0)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-texto-2">Mensalidade ({qtdPatiosAtivos} pátios)</dt>
              <dd className="font-black tabular-nums text-brand-700">
                {moeda.format(mensalidade)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-texto-2">Próximo vencimento</dt>
              <dd className="font-bold tabular-nums">
                {assinatura?.vencimento
                  ? formatarData(assinatura.vencimento)
                  : "—"}
              </dd>
            </div>
          </dl>
          {assinatura?.estado !== "ativa" && (
            <p className="mt-4 text-xs font-semibold text-aviso bg-aviso-bg border border-aviso/25 rounded-lg px-3 py-2">
              Regularize a assinatura para manter o painel e o app liberados.
            </p>
          )}
        </motion.section>
      </div>

      {/* Dispositivos */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-borda flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-brand-600" />
          <h2 className="font-bold text-sm">
            Dispositivos ({dispositivos.length})
          </h2>
        </div>
        {dispositivos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-texto-3">
            Nenhum dispositivo registrado ainda. Cada celular/maquininha que
            fizer login aparece aqui.
          </p>
        ) : (
          <ul className="divide-y divide-borda">
            {dispositivos.map((d) => (
              <li
                key={d.id}
                className={`px-5 py-3.5 flex items-center gap-3 ${
                  d.status === "revogado" ? "opacity-55" : ""
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
                    d.status === "ativo" ? "bg-brand-50" : "bg-perigo-bg"
                  }`}
                >
                  {d.status === "ativo" ? (
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                  ) : (
                    <ShieldX className="w-4 h-4 text-perigo" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">
                    {d.nome || "Dispositivo sem nome"}
                    <span className="ml-2 text-[11px] font-semibold text-texto-3">
                      {nomePatio(d.patio_id)}
                    </span>
                  </p>
                  <p className="text-xs text-texto-3 font-mono truncate">
                    {d.device_uuid}
                    {d.ultimo_acesso &&
                      ` · visto ${formatarDataHora(d.ultimo_acesso)}`}
                  </p>
                </div>
                <BotaoDispositivo dispositivo={d} />
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </div>
  );
}

/* ---------- Formulário editável: dados da rede ---------- */

function FormRede({ tenant }: { tenant: Tenant | null }) {
  const toast = useToast();
  const router = useRouter();
  const [nome, setNome] = useState(tenant?.nome ?? "");
  const [razao, setRazao] = useState(tenant?.razao_social ?? "");
  const [cnpj, setCnpj] = useState(
    tenant?.cnpj ? formatarCnpj(tenant.cnpj) : "",
  );
  const [salvando, setSalvando] = useState(false);

  const cnpjDigitos = soDigitos(cnpj);
  const cnpjIncompleto = cnpjDigitos.length > 0 && cnpjDigitos.length < 14;
  const cnpjInvalido = cnpjDigitos.length === 14 && !cnpjValido(cnpjDigitos);
  const podeSalvar =
    nome.trim().length >= 2 && !cnpjIncompleto && !cnpjInvalido && !salvando;

  async function salvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    const r = await atualizarRede({
      nome: nome.trim(),
      razaoSocial: razao.trim() || null,
      cnpj: cnpjDigitos || null,
    });
    setSalvando(false);
    if (r?.ok) {
      toast.sucesso("Salvo!", r.msg);
      router.refresh();
    } else toast.erro("Não deu certo", r?.msg ?? "Erro inesperado.");
  }

  const inputCls =
    "w-full h-11 px-3.5 rounded-xl border border-borda bg-superficie text-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15";

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-bold text-texto-2 mb-1.5">
          Nome da rede
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Rede Estacionar"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-texto-2 mb-1.5">
          Razão social (opcional)
        </label>
        <input
          value={razao}
          onChange={(e) => setRazao(e.target.value)}
          placeholder="Ex.: Estacionar Serviços Ltda"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-texto-2 mb-1.5">
          CNPJ (opcional)
        </label>
        <input
          value={cnpj}
          onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          className={`${inputCls} tabular-nums ${
            cnpjInvalido || cnpjIncompleto
              ? "border-perigo/50 focus:border-perigo focus:ring-perigo/15"
              : ""
          }`}
        />
        {(cnpjInvalido || cnpjIncompleto) && (
          <p className="mt-1 text-xs font-semibold text-perigo">
            {cnpjIncompleto
              ? "CNPJ incompleto (14 dígitos)."
              : "CNPJ inválido — confira os dígitos."}
          </p>
        )}
      </div>
      <button
        onClick={salvar}
        disabled={!podeSalvar}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {salvando ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Salvar dados da rede
      </button>
    </div>
  );
}

function BotaoDispositivo({ dispositivo }: { dispositivo: Dispositivo }) {
  const toast = useToast();
  const [pendente, comecar] = useTransition();

  async function executar() {
    const r = await alternarDispositivo(dispositivo.id, dispositivo.status);
    if (r?.ok) toast.sucesso(r.msg);
    else toast.erro(r?.msg ?? "Erro inesperado.");
  }

  if (dispositivo.status === "ativo") {
    return (
      <Confirmar
        titulo="Revogar dispositivo?"
        descricao={`"${dispositivo.nome || dispositivo.device_uuid.slice(0, 12)}" perde o acesso no próximo sync. Use se o aparelho foi perdido ou trocado.`}
        rotuloConfirmar="Revogar"
        aoConfirmar={executar}
      >
        {(abrir) => (
          <button
            onClick={abrir}
            className="text-xs font-bold text-perigo bg-perigo-bg border border-perigo/20 rounded-lg px-3 py-1.5 hover:brightness-95 transition-all"
          >
            revogar
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
