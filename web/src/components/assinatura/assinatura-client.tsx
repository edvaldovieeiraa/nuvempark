"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import {
  CreditCard,
  Copy,
  FileText,
  AlertTriangle,
  CalendarClock,
  Receipt,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  Wallet,
  QrCode,
  Download,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { labelAssinaturaEstado } from "@/lib/status-labels";
import { formatarData, formatarDataHora } from "@/lib/format-data";
import { prepararPagamento } from "@/app/painel/assinatura/actions";
import type { FaturaRow, ProjecaoTrial } from "@/app/painel/assinatura/page";

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

// Só as CORES por estado — o texto vem de labelAssinaturaEstado (util central).
const ESTADO_CLS: Record<string, string> = {
  trial: "bg-info-bg text-info border-info/25",
  ativa: "bg-brand-50 text-brand-700 border-brand-200",
  atrasada: "bg-aviso-bg text-aviso border-aviso/25",
  suspensa: "bg-perigo-bg text-perigo border-perigo/20",
  cancelada: "bg-fundo text-texto-3 border-borda",
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

export function AssinaturaClient({
  assinatura,
  qtdPatiosAtivos,
  trialDias,
  proximos,
  historico,
  projecaoTrial,
  gatewayAtivo,
}: {
  assinatura: Assinatura;
  qtdPatiosAtivos: number;
  trialDias: number | null;
  proximos: FaturaRow[];
  historico: FaturaRow[];
  projecaoTrial: ProjecaoTrial | null;
  gatewayAtivo: boolean;
}) {
  const estadoCls = ESTADO_CLS[assinatura?.estado ?? "ativa"] ?? ESTADO_CLS.ativa;
  const estadoRotulo = labelAssinaturaEstado(assinatura?.estado ?? "ativa");
  const valorPatio = Number(assinatura?.valor_por_patio) || 0;
  const mensal = valorPatio * qtdPatiosAtivos;
  const emTrial = assinatura?.estado === "trial";

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
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${estadoCls}`}>
            {estadoRotulo}
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

      {/* Aviso trial: pode pagar já e ativar */}
      {emTrial && (proximos.length > 0 || projecaoTrial) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="flex items-start gap-3 rounded-2xl border border-info/25 bg-info-bg px-4 py-3 text-sm text-info"
        >
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Você está no <b>período de teste</b>. Pode pagar sua primeira fatura
            quando quiser — assim que o pagamento cair, sua assinatura já fica{" "}
            <b>ativa</b>.
          </p>
        </motion.div>
      )}

      {/* Próximos pagamentos */}
      <Secao
        titulo="Próximos pagamentos"
        Icone={CalendarClock}
        atraso={0.1}
        vazio={
          proximos.length === 0 && !projecaoTrial
            ? "Nenhuma fatura em aberto. Tudo em dia! 🎉"
            : null
        }
      >
        {projecaoTrial && proximos.length === 0 && (
          <ProjecaoCard
            projecao={projecaoTrial}
            gatewayAtivo={gatewayAtivo}
          />
        )}
        {proximos.map((f) => (
          <div key={f.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-bold capitalize">
                  {competenciaLabel(f.competencia)}
                </p>
                <p className="text-xs text-texto-3 mt-0.5">
                  Vencimento {formatarData(f.vencimento)}
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
            <OpcoesPagamento fatura={f} gatewayAtivo={gatewayAtivo} />
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
                  {f.pago_em ? `Pago em ${formatarDataHora(f.pago_em)}` : "Pago"}
                  {f.forma_pagamento
                    ? ` · ${FORMAS[f.forma_pagamento] ?? f.forma_pagamento}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-black tabular-nums">
                {moeda.format(Number(f.valor) || 0)}
              </span>
              <Link
                href={`/recibo/${f.id}`}
                title="Abrir o recibo para imprimir ou salvar em PDF"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-borda text-texto-2 text-xs font-bold hover:bg-fundo hover:text-texto transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Recibo
              </Link>
            </div>
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

/** Botão que pede ao servidor para emitir a cobrança (PIX/boleto/cartão). */
function BotaoGerarPagamento({
  faturaId,
  rotulo = "Gerar formas de pagamento",
}: {
  faturaId: string | null;
  rotulo?: string;
}) {
  const toast = useToast();
  const [pendente, comecar] = useTransition();
  const [pedirCpf, setPedirCpf] = useState(false);
  const [cpf, setCpf] = useState("");

  function gerar(cpfArg?: string) {
    comecar(async () => {
      const r = await prepararPagamento(faturaId, cpfArg);
      if (r?.ok) {
        toast.sucesso(r.msg);
        setPedirCpf(false);
      } else if (r?.precisaCpf) {
        // Pede o CPF/CNPJ e, se já tinha tentado com um valor, mostra o motivo.
        setPedirCpf(true);
        if (cpfArg) toast.erro(r.msg);
      } else {
        toast.erro(r?.msg ?? "Não foi possível gerar o pagamento.");
      }
    });
  }

  const digitos = cpf.replace(/\D/g, "").length;

  if (pedirCpf) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-texto-2">
          Informe o CPF ou CNPJ do responsável pela assinatura para gerar a
          cobrança:
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            inputMode="numeric"
            placeholder="CPF ou CNPJ"
            className="h-9 px-3 rounded-lg border border-borda bg-superficie text-sm tabular-nums focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 max-w-[220px]"
          />
          <button
            onClick={() => gerar(cpf)}
            disabled={pendente || (digitos !== 11 && digitos !== 14)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all disabled:opacity-60"
          >
            {pendente ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wallet className="w-3.5 h-3.5" />
            )}
            {pendente ? "Gerando…" : "Confirmar e gerar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => gerar()}
      disabled={pendente}
      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all disabled:opacity-60"
    >
      {pendente ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Wallet className="w-3.5 h-3.5" />
      )}
      {pendente ? "Gerando…" : rotulo}
    </button>
  );
}

/** Card da "próxima fatura" projetada (trial ainda sem linha real de fatura). */
function ProjecaoCard({
  projecao,
  gatewayAtivo,
}: {
  projecao: ProjecaoTrial;
  gatewayAtivo: boolean;
}) {
  return (
    <div className="p-4 bg-info-bg/40">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-bold capitalize">
            {competenciaLabel(projecao.competencia)}
          </p>
          <p className="text-xs text-texto-3 mt-0.5">
            Vencimento {formatarData(projecao.vencimento)} · primeira fatura
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-info-bg text-info border-info/25">
            próxima fatura
          </span>
          <span className="font-black tabular-nums text-lg">
            {moeda.format(projecao.valor)}
          </span>
        </div>
      </div>
      <div className="mt-3">
        {gatewayAtivo ? (
          <BotaoGerarPagamento faturaId={null} rotulo="Pagar agora" />
        ) : (
          <div className="flex items-start gap-2 text-xs font-semibold text-aviso bg-aviso-bg border border-aviso/25 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Pagamento online indisponível no momento — fale com o suporte.
          </div>
        )}
      </div>
    </div>
  );
}

/** Botões de pagamento de uma fatura, a partir dos links do gateway já gravados. */
/**
 * QR do PIX. Prefere a imagem do gateway; se ela não vier, DESENHA o QR a
 * partir do copia-e-cola.
 *
 * Isso não é um remendo: o copia-e-cola **é** o conteúdo do QR — o app do banco
 * lê exatamente essa string. Ter os dois vindos do Asaas era um acoplamento
 * desnecessário, e ele falha de dois jeitos reais: faturas emitidas antes da
 * coluna `gateway_pix_qrcode` existir (db/23) ficaram com o copia-e-cola
 * preenchido e o QR nulo PARA SEMPRE — e não há como reemitir, porque o botão
 * "Gerar pagamento" some assim que a fatura tem qualquer dado de gateway.
 * Desenhando localmente, toda fatura que tem copia-e-cola passa a ter QR.
 */
function QrPix({
  base64,
  copiaCola,
}: {
  base64: string | null;
  copiaCola: string | null;
}) {
  const [gerado, setGerado] = useState<string | null>(null);

  useEffect(() => {
    if (base64 || !copiaCola) return;
    let vivo = true;
    QRCode.toDataURL(copiaCola, { width: 480, margin: 1 })
      .then((url) => {
        if (vivo) setGerado(url);
      })
      .catch(() => {
        if (vivo) setGerado(null);
      });
    return () => {
      vivo = false;
    };
  }, [base64, copiaCola]);

  const src = base64 ? `data:image/png;base64,${base64}` : gerado;
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="QR Code para pagamento via PIX"
      className="w-44 h-44 rounded-lg bg-white p-2 border border-borda shrink-0"
    />
  );
}

function OpcoesPagamento({
  fatura,
  gatewayAtivo,
}: {
  fatura: FaturaRow;
  gatewayAtivo: boolean;
}) {
  const toast = useToast();
  const temAlgum =
    Boolean(fatura.gateway_link) ||
    Boolean(fatura.gateway_pix_copia) ||
    Boolean(fatura.gateway_pix_qrcode) ||
    Boolean(fatura.gateway_boleto_url);

  if (!temAlgum) {
    // Sem cobrança emitida: se o gateway está ativo, o cliente gera na hora.
    return (
      <div className="mt-3">
        {gatewayAtivo ? (
          <BotaoGerarPagamento faturaId={fatura.id} />
        ) : (
          <div className="flex items-start gap-2 text-xs font-semibold text-aviso bg-aviso-bg border border-aviso/25 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Cobrança ainda não emitida — fale com o suporte.
          </div>
        )}
      </div>
    );
  }

  function copiarPix() {
    if (!fatura.gateway_pix_copia) return;
    navigator.clipboard.writeText(fatura.gateway_pix_copia);
    toast.sucesso("Copiado!", "Código PIX copiado para a área de transferência.");
  }

  const temPix = Boolean(fatura.gateway_pix_qrcode || fatura.gateway_pix_copia);

  return (
    <div className="mt-3 space-y-3">
      {/* PIX — QR + copia-e-cola direto na tela */}
      {temPix && (
        <div className="rounded-xl border border-borda bg-fundo/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-md bg-brand-50 grid place-items-center">
              <QrCode className="w-3.5 h-3.5 text-brand-600" />
            </span>
            <span className="text-sm font-bold">Pague com PIX</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <QrPix
              base64={fatura.gateway_pix_qrcode}
              copiaCola={fatura.gateway_pix_copia}
            />
            <div className="min-w-0 flex-1 w-full">
              <p className="text-xs text-texto-3 mb-2">
                Escaneie o QR no app do seu banco ou copie o código abaixo.
              </p>
              {fatura.gateway_pix_copia && (
                <>
                  <div className="text-[11px] font-mono break-all bg-superficie border border-borda rounded-lg p-2.5 max-h-24 overflow-y-auto text-texto-2 select-all">
                    {fatura.gateway_pix_copia}
                  </div>
                  <button
                    onClick={copiarPix}
                    className="mt-2 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold hover:bg-brand-100 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar código PIX
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cartão / boleto — alternativas */}
      {(fatura.gateway_link || fatura.gateway_boleto_url) && (
        <div className="flex flex-wrap gap-2">
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
      )}
    </div>
  );
}
