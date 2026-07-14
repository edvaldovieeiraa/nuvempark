"use client";

import { motion } from "framer-motion";
import {
  CreditCard,
  Copy,
  FileText,
  AlertTriangle,
  CalendarClock,
  Receipt,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { FaturaRow } from "@/app/painel/assinatura/page";

type Assinatura = {
  estado: string;
  valor_por_patio: number;
  dia_vencimento: number;
  trial_expira_em: string | null;
} | null;

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const ESTADOS: Record<string, { rotulo: string; cls: string }> = {
  trial: { rotulo: "Período de teste", cls: "bg-info-bg text-info border-info/25" },
  ativa: { rotulo: "Ativa", cls: "bg-brand-50 text-brand-700 border-brand-200" },
  atrasada: { rotulo: "Atrasada", cls: "bg-aviso-bg text-aviso border-aviso/25" },
  suspensa: { rotulo: "Suspensa", cls: "bg-perigo-bg text-perigo border-perigo/20" },
  cancelada: { rotulo: "Cancelada", cls: "bg-fundo text-texto-3 border-borda" },
};

const FORMAS: Record<string, string> = {
  manual: "Manual",
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao: "Cartão",
  boleto: "Boleto",
};

function competenciaLabel(comp: string): string {
  return new Date(`${comp.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}
function dataBR(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

export function AssinaturaClient({
  assinatura,
  qtdPatiosAtivos,
  trialDias,
  proximos,
  historico,
}: {
  assinatura: Assinatura;
  qtdPatiosAtivos: number;
  trialDias: number | null;
  proximos: FaturaRow[];
  historico: FaturaRow[];
}) {
  const estado = ESTADOS[assinatura?.estado ?? "ativa"] ?? ESTADOS.ativa;
  const valorPatio = Number(assinatura?.valor_por_patio) || 0;
  const mensal = valorPatio * qtdPatiosAtivos;

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight">Assinatura</h1>
        <p className="text-sm text-texto-2">
          Plano da sua rede, próximos pagamentos e histórico.
        </p>
      </motion.header>

      {/* Resumo */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
              <CreditCard className="w-4 h-4 text-brand-600" />
            </span>
            <h2 className="font-bold">Plano atual</h2>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${estado.cls}`}>
            {estado.rotulo}
          </span>
        </div>

        {assinatura?.estado === "trial" && trialDias !== null && (
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-info bg-info-bg border border-info/25 rounded-xl px-3.5 py-2.5">
            <Clock className="w-4 h-4 shrink-0" />
            {trialDias > 0
              ? `Teste grátis — faltam ${trialDias} ${trialDias === 1 ? "dia" : "dias"}.`
              : "Seu período de teste terminou."}
          </div>
        )}

        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Linha rotulo="Valor por pátio" valor={moeda.format(valorPatio)} />
          <Linha rotulo="Pátios ativos" valor={String(qtdPatiosAtivos)} />
          <Linha
            rotulo="Mensalidade total"
            valor={moeda.format(mensal)}
            destaque
          />
          <Linha
            rotulo="Dia de vencimento"
            valor={
              assinatura?.dia_vencimento
                ? `dia ${assinatura.dia_vencimento}`
                : "—"
            }
          />
        </dl>
      </motion.section>

      {/* Próximos pagamentos */}
      <Secao
        titulo="Próximos pagamentos"
        Icone={CalendarClock}
        atraso={0.1}
        vazio={
          proximos.length === 0
            ? "Nenhuma fatura em aberto. Tudo em dia! 🎉"
            : null
        }
      >
        {proximos.map((f) => (
          <div key={f.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-bold capitalize">
                  {competenciaLabel(f.competencia)}
                </p>
                <p className="text-xs text-texto-3 mt-0.5">
                  Vencimento {dataBR(f.vencimento)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    f.estado === "vencida"
                      ? "bg-perigo-bg text-perigo border-perigo/20"
                      : "bg-aviso-bg text-aviso border-aviso/25"
                  }`}
                >
                  {f.estado === "vencida" ? "vencida" : "em aberto"}
                </span>
                <span className="font-black tabular-nums text-lg">
                  {moeda.format(Number(f.valor) || 0)}
                </span>
              </div>
            </div>
            <OpcoesPagamento fatura={f} />
          </div>
        ))}
      </Secao>

      {/* Histórico */}
      <Secao
        titulo="Histórico de pagamentos"
        Icone={Receipt}
        atraso={0.14}
        vazio={
          historico.length === 0 ? "Nenhum pagamento registrado ainda." : null
        }
      >
        {historico.map((f) => (
          <div key={f.id} className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold capitalize truncate">
                  {competenciaLabel(f.competencia)}
                </p>
                <p className="text-xs text-texto-3 mt-0.5">
                  {f.pago_em ? `Pago em ${dataBR(f.pago_em)}` : "Pago"}
                  {f.forma_pagamento
                    ? ` · ${FORMAS[f.forma_pagamento] ?? f.forma_pagamento}`
                    : ""}
                </p>
              </div>
            </div>
            <span className="font-black tabular-nums">
              {moeda.format(Number(f.valor) || 0)}
            </span>
          </div>
        ))}
      </Secao>
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-texto-2">{rotulo}</dt>
      <dd
        className={`font-bold tabular-nums ${destaque ? "text-brand-700 font-black" : ""}`}
      >
        {valor}
      </dd>
    </div>
  );
}

function Secao({
  titulo,
  Icone,
  atraso,
  vazio,
  children,
}: {
  titulo: string;
  Icone: typeof Receipt;
  atraso: number;
  vazio: string | null;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: atraso }}
      className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-borda flex items-center gap-2">
        <Icone className="w-4 h-4 text-brand-600" />
        <h2 className="font-bold text-sm">{titulo}</h2>
      </div>
      {vazio ? (
        <p className="px-5 py-10 text-center text-sm text-texto-3">{vazio}</p>
      ) : (
        <div className="divide-y divide-borda">{children}</div>
      )}
    </motion.section>
  );
}

/** Botões de pagamento de uma fatura, a partir dos links do gateway já gravados. */
function OpcoesPagamento({ fatura }: { fatura: FaturaRow }) {
  const toast = useToast();
  const temAlgum =
    Boolean(fatura.gateway_link) ||
    Boolean(fatura.gateway_pix_copia) ||
    Boolean(fatura.gateway_boleto_url);

  if (!temAlgum) {
    return (
      <div className="mt-3 flex items-start gap-2 text-xs font-semibold text-aviso bg-aviso-bg border border-aviso/25 rounded-lg px-3 py-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        Cobrança ainda não emitida — fale com o suporte.
      </div>
    );
  }

  function copiarPix() {
    if (!fatura.gateway_pix_copia) return;
    navigator.clipboard.writeText(fatura.gateway_pix_copia);
    toast.sucesso("Copiado!", "Pix copia-e-cola copiado para a área de transferência.");
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {fatura.gateway_link && (
        <a
          href={fatura.gateway_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
        >
          <CreditCard className="w-3.5 h-3.5" />
          Pagar com cartão
        </a>
      )}
      {fatura.gateway_pix_copia && (
        <button
          onClick={copiarPix}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold hover:bg-brand-100 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copiar Pix copia-e-cola
        </button>
      )}
      {fatura.gateway_boleto_url && (
        <a
          href={fatura.gateway_boleto_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-borda text-texto-2 text-xs font-bold hover:bg-fundo transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Ver boleto
        </a>
      )}
    </div>
  );
}
