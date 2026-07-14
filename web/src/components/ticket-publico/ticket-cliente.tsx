"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  Clock,
  Copy,
  Loader2,
  QrCode,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Marca } from "@/components/marca";
import { API_PUBLICA } from "@/lib/api-publica";

export type StatusPagamento = "nao_pago" | "pago" | "pago_diferenca_pendente";

export interface TicketPublicoDados {
  placa_mascarada: string;
  entrada: string;
  agora: string;
  patio_nome: string;
  status_pagamento: StatusPagamento;
  valor_atual: number | null;
  pago: { valor: number; pago_em: string; carencia_ate: string } | null;
  diferenca: number | null;
  carencia_minutos: number;
}

interface Cobranca {
  pagamento_id: string;
  valor: number;
  pix_copia_cola: string;
  pix_qrcode_base64: string | null;
  expira_em: string;
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Fuso fixo: o servidor roda em UTC e o celular do cliente, em BRT. */
const hora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Página do cliente que escaneou o QR do cupom. Mobile-first: ela é aberta no
 * celular, em pé, muitas vezes na rampa da garagem com pressa.
 *
 * O relógio de referência é o do SERVIDOR (`dados.agora`) — o do celular pode
 * estar errado, e um minuto a mais ou a menos muda o valor da estadia.
 */
export function TicketPublicoClient({
  id,
  inicial,
}: {
  id: string;
  inicial: TicketPublicoDados;
}) {
  const [dados, setDados] = useState(inicial);
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Relógio: o do CELULAR não serve. Ele pode estar minutos fora, e minuto a
  // mais muda o valor da estadia. Medimos uma vez a diferença para o servidor e
  // andamos com ela.
  const [offsetMs] = useState(
    () => new Date(inicial.agora).getTime() - Date.now(),
  );
  const [agora, setAgora] = useState(() => new Date(inicial.agora));

  // Tique de 1 min: o tempo decorrido anda na tela sem bater no servidor.
  useEffect(() => {
    const t = setInterval(
      () => setAgora(new Date(Date.now() + offsetMs)),
      60_000,
    );
    return () => clearInterval(t);
  }, [offsetMs]);

  const recarregar = useCallback(async () => {
    const r = await fetch(`${API_PUBLICA}/ticket/${id}`, { cache: "no-store" });
    if (r.ok) setDados((await r.json()) as TicketPublicoDados);
  }, [id]);

  // Polling enquanto há Pix na tela: o webhook confirma em segundos, e a página
  // vira ticket digital sozinha — o cliente não precisa recarregar nada.
  useEffect(() => {
    if (!cobranca) return;
    const t = setInterval(async () => {
      const r = await fetch(`${API_PUBLICA}/ticket/${id}/pagamento`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const { status_pagamento } = (await r.json()) as {
        status_pagamento: StatusPagamento;
      };
      if (status_pagamento === "pago") {
        setCobranca(null);
        await recarregar();
      }
    }, 5000);
    return () => clearInterval(t);
  }, [cobranca, id, recarregar]);

  async function gerarPix() {
    setGerando(true);
    setErro(null);
    try {
      const r = await fetch(`${API_PUBLICA}/ticket/${id}/pix`, {
        method: "POST",
      });
      if (!r.ok) {
        setErro(
          r.status === 409
            ? "Esta estadia já está paga."
            : "Não foi possível gerar o Pix agora. Tente de novo.",
        );
        await recarregar();
        return;
      }
      setCobranca((await r.json()) as Cobranca);
    } catch {
      setErro("Sem conexão. Verifique a internet e tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  const decorrido = minutos(new Date(dados.entrada), agora);

  return (
    <main className="min-h-dvh bg-fundo text-texto flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <Cabecalho patio={dados.patio_nome} />

        <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-black tracking-widest text-lg">
              {dados.placa_mascarada}
            </span>
            <span className="text-xs text-texto-3">
              entrada {hora.format(new Date(dados.entrada))}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-texto-2">
            <Clock className="w-3.5 h-3.5" />
            {decorrido} no pátio
          </p>
        </section>

        {dados.status_pagamento === "pago" && dados.pago ? (
          <TicketDigital id={id} pago={dados.pago} />
        ) : (
          <Cobrar
            dados={dados}
            cobranca={cobranca}
            gerando={gerando}
            erro={erro}
            copiado={copiado}
            aoGerar={gerarPix}
            aoCopiar={copiar}
            agora={agora}
          />
        )}

        <p className="text-center text-[11px] text-texto-3 pt-2">
          Pagamento processado com segurança. A placa aparece parcialmente por
          privacidade.
        </p>
      </div>
    </main>
  );
}

function Cabecalho({ patio }: { patio: string }) {
  return (
    <header className="flex items-center gap-3 pb-1">
      <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-acento-teal grid place-items-center shadow-[var(--shadow-brand)]">
        <Marca className="w-6 h-6" />
      </span>
      <div className="min-w-0">
        <p className="font-extrabold leading-tight tracking-tight">
          Nuvem<span className="text-brand-600">Park</span>
        </p>
        <p className="text-xs text-texto-2 truncate">{patio}</p>
      </div>
    </header>
  );
}

/** Estado 1 e 3: precisa pagar (a estadia toda, ou só a diferença). */
function Cobrar({
  dados,
  cobranca,
  gerando,
  erro,
  copiado,
  aoGerar,
  aoCopiar,
  agora,
}: {
  dados: TicketPublicoDados;
  cobranca: Cobranca | null;
  gerando: boolean;
  erro: string | null;
  copiado: boolean;
  aoGerar: () => void;
  aoCopiar: (t: string) => void;
  agora: Date;
}) {
  const diferenca = dados.status_pagamento === "pago_diferenca_pendente";
  const valor = diferenca ? (dados.diferenca ?? 0) : (dados.valor_atual ?? 0);

  return (
    <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5 space-y-4">
      {diferenca && dados.pago && (
        <div className="rounded-xl border border-aviso/25 bg-aviso-bg p-3 flex gap-2.5">
          <TriangleAlert className="w-4 h-4 text-aviso shrink-0 mt-0.5" />
          <p className="text-xs text-texto-2">
            Você pagou <b>{moeda.format(dados.pago.valor)}</b> e o veículo
            continuou no pátio. Falta a diferença do tempo a mais.
          </p>
        </div>
      )}

      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-texto-3">
          {diferenca ? "Diferença a pagar" : "Valor da estadia"}
        </p>
        <p className="text-4xl font-black tabular-nums text-brand-700">
          {moeda.format(valor)}
        </p>
      </div>

      {erro && <p className="text-sm text-perigo font-semibold">{erro}</p>}

      {!cobranca ? (
        <button
          onClick={aoGerar}
          disabled={gerando || valor <= 0}
          className="w-full h-14 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {gerando ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <QrCode className="w-5 h-5" />
          )}
          {gerando ? "Gerando Pix…" : "Pagar com Pix"}
        </button>
      ) : (
        <PixNaTela
          cobranca={cobranca}
          copiado={copiado}
          aoCopiar={aoCopiar}
          agora={agora}
        />
      )}
    </section>
  );
}

function PixNaTela({
  cobranca,
  copiado,
  aoCopiar,
  agora,
}: {
  cobranca: Cobranca;
  copiado: boolean;
  aoCopiar: (t: string) => void;
  agora: Date;
}) {
  const restam = Math.max(
    0,
    Math.round(
      (new Date(cobranca.expira_em).getTime() - agora.getTime()) / 60_000,
    ),
  );

  return (
    <div className="space-y-3">
      {cobranca.pix_qrcode_base64 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/png;base64,${cobranca.pix_qrcode_base64}`}
          alt="QR Code do Pix"
          className="w-full max-w-[240px] mx-auto rounded-xl border border-borda bg-white"
        />
      )}

      <p className="text-center text-xs font-bold uppercase tracking-wider text-texto-3">
        Pix copia e cola
      </p>

      {/* O código visível, selecionável. Quem paga em OUTRO aparelho (o QR está
          na tela do celular do cliente) precisa do texto para copiar à mão. */}
      <div className="rounded-xl border border-borda bg-fundo p-3">
        <p className="font-mono text-[11px] leading-relaxed break-all text-texto-2 select-all">
          {cobranca.pix_copia_cola}
        </p>
      </div>

      <button
        onClick={() => aoCopiar(cobranca.pix_copia_cola)}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold inline-flex items-center justify-center gap-2"
      >
        {copiado ? (
          <>
            <Check className="w-4 h-4" /> Código copiado!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" /> Copiar código Pix
          </>
        )}
      </button>

      <p className="text-center text-xs text-texto-3">
        {restam > 0
          ? `Válido por mais ${restam} min · aguardando o pagamento…`
          : "Este código expirou. Recarregue a página."}
      </p>
    </div>
  );
}

/**
 * Estado 2: pago. A página VIRA o ticket — é isto que o cliente mostra na saída,
 * no lugar do papel. O QR codifica a própria URL, então o app do operador lê
 * exatamente o mesmo que leria no cupom impresso.
 */
function TicketDigital({
  id,
  pago,
}: {
  id: string;
  pago: { valor: number; pago_em: string; carencia_ate: string };
}) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    // Gerado no cliente: a URL é a mesma que ele já tem na barra de endereço.
    QRCode.toDataURL(window.location.href, { width: 480, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [id]);

  return (
    <section className="bg-superficie border-2 border-brand-500 rounded-2xl shadow-[var(--shadow-card)] p-5 space-y-4">
      <div className="flex items-center gap-2 text-brand-700">
        <ShieldCheck className="w-5 h-5" />
        <span className="font-black uppercase tracking-wider text-sm">
          Estadia paga
        </span>
      </div>

      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr}
          alt="QR do ticket digital — apresente na saída"
          className="w-full max-w-[260px] mx-auto rounded-xl border border-borda bg-white"
        />
      ) : (
        <div className="h-[260px] grid place-items-center text-texto-3">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      <p className="text-center text-sm font-bold">
        Apresente este código na saída
      </p>

      <div className="rounded-xl bg-fundo border border-borda divide-y divide-borda">
        <Linha rotulo="Valor pago" valor={moeda.format(pago.valor)} />
        <Linha rotulo="Pago às" valor={hora.format(new Date(pago.pago_em))} />
        <Linha
          rotulo="Válido para saída até"
          valor={hora.format(new Date(pago.carencia_ate))}
          destaque
        />
      </div>

      <p className="text-center text-[11px] text-texto-3">
        Depois desse horário, o tempo a mais é cobrado na saída.
      </p>
    </section>
  );
}

function Linha({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-xs text-texto-2">{rotulo}</span>
      <span
        className={`text-sm font-bold tabular-nums ${destaque ? "text-brand-700" : ""}`}
      >
        {valor}
      </span>
    </div>
  );
}

function minutos(de: Date, ate: Date): string {
  const min = Math.max(0, Math.round((ate.getTime() - de.getTime()) / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h${String(min % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
