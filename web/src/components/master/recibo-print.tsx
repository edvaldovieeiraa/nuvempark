"use client";

import { useEffect } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function ReciboPrint(props: {
  numero: string;
  rede: string;
  codigo: string;
  competencia: string;
  valor: string;
  qtdPatios: number;
  valorPorPatio: string;
  estado: string;
  pagoEm: string | null;
  formaPagamento: string | null;
  /** Para onde o "Voltar" leva. O recibo é servido em dois lugares: o console
   *  do master (lista de faturas) e o painel do próprio cliente. */
  voltarHref?: string;
}) {
  const voltarHref = props.voltarHref ?? "/master/financeiro/faturas";
  // dispara o diálogo de impressão automaticamente ao abrir
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  const pago = props.estado === "paga";

  return (
    <div className="min-h-screen bg-fundo py-10 px-4">
      {/* Barra de ações — some na impressão */}
      <div className="max-w-[600px] mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link
          href={voltarHref}
          className="inline-flex items-center gap-2 text-sm font-bold text-texto-2 hover:text-texto"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-sm shadow-[var(--shadow-brand)]"
        >
          <Printer className="w-4 h-4" />
          Imprimir / PDF
        </button>
      </div>

      {/* Recibo */}
      <div className="max-w-[600px] mx-auto bg-white rounded-2xl border border-borda shadow-[var(--shadow-card)] overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        <div className="bg-gradient-to-br from-brand-700 to-acento-teal px-8 py-6 text-white flex items-center justify-between">
          <div>
            <div className="text-xl font-black tracking-tight">
              Nuvem<span className="text-brand-200">Park</span>
            </div>
            <div className="text-sm text-white/70">Recibo de pagamento</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-white/60 font-bold">
              Recibo nº
            </div>
            <div className="font-mono font-black text-lg">{props.numero}</div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-5">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
              pago
                ? "bg-brand-50 text-brand-700 border border-brand-200"
                : "bg-aviso-bg text-aviso border border-aviso/25"
            }`}
          >
            {pago ? "● Pago" : "○ Em aberto"}
          </div>

          <Bloco titulo="Cliente">
            <div className="font-black text-lg">{props.rede}</div>
            <div className="text-sm text-texto-3">Código da rede: {props.codigo}</div>
          </Bloco>

          <Bloco titulo="Referente a">
            <div className="capitalize font-bold">
              Assinatura · {props.competencia}
            </div>
            <div className="text-sm text-texto-3">
              {props.qtdPatios} {props.qtdPatios === 1 ? "pátio" : "pátios"} ×{" "}
              {props.valorPorPatio}
            </div>
          </Bloco>

          {pago && (
            <Bloco titulo="Pagamento">
              <div className="text-sm">
                {props.pagoEm && (
                  <span>
                    Pago em <b>{props.pagoEm}</b>
                  </span>
                )}
                {props.formaPagamento && (
                  <span className="text-texto-3">
                    {" "}
                    · via {rotuloForma(props.formaPagamento)}
                  </span>
                )}
              </div>
            </Bloco>
          )}

          <div className="border-t border-borda pt-5 flex items-end justify-between">
            <span className="text-sm font-bold text-texto-2">Valor total</span>
            <span className="text-3xl font-black text-brand-700 tabular-nums">
              {props.valor}
            </span>
          </div>
        </div>

        <div className="px-8 py-4 border-t border-borda text-center text-xs text-texto-3">
          Documento gerado eletronicamente por NuvemPark · sem valor fiscal
        </div>
      </div>
    </div>
  );
}

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-black text-texto-3 mb-1">
        {titulo}
      </div>
      {children}
    </div>
  );
}

function rotuloForma(f: string): string {
  const m: Record<string, string> = {
    manual: "baixa manual",
    pix: "PIX",
    boleto: "boleto",
    cartao: "cartão",
  };
  return m[f] ?? f;
}
