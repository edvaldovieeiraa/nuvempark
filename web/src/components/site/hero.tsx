"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Wallet,
  Car,
  ScanLine,
  RefreshCw,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { WHATSAPP } from "@/components/site/secoes";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/* =========================================================
   HERO — "Torre de Controle à noite"
   O pátio vive à noite: palco escuro (a mesma moldura navy
   do produto real) e o painel claro ACESO no centro, como o
   pátio iluminado. O esmeralda é a luz do dinheiro. Um feixe
   de varredura cruza o painel — a câmera lendo a placa.
   ========================================================= */
export function Hero() {
  const reduzir = useReducedMotion();

  const subir = (delay: number) => ({
    initial: { opacity: 0, y: reduzir ? 0 : 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  const chip = (delay: number, deX: number) => ({
    initial: { opacity: 0, x: reduzir ? 0 : deX, scale: reduzir ? 1 : 0.9 },
    animate: { opacity: 1, x: 0, scale: 1 },
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 22,
      delay,
    },
  });

  return (
    <section className="relative overflow-hidden bg-noite pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* céu do pátio: gradiente noturno igual ao da sidebar do produto */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-noite via-noite-2 to-noite" />

      {/* grade técnica (mesma linguagem da ficha de avaria) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 75% 60% at 50% 18%, black 30%, transparent 75%)",
        }}
      />

      {/* luzes do pátio */}
      <div className="pointer-events-none absolute -top-32 left-1/4 w-[36rem] h-[36rem] rounded-full bg-brand-500/12 blur-3xl" />
      <div className="pointer-events-none absolute top-12 -right-32 w-[28rem] h-[28rem] rounded-full bg-acento/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.a
            href="/cadastro"
            {...subir(0.05)}
            className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-3.5 py-1.5 text-xs font-bold text-brand-300 hover:border-brand-400/45 hover:bg-brand-500/15 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            15 dias grátis · sem cartão de crédito
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.a>

          <motion.h1
            {...subir(0.15)}
            className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.04] [text-wrap:balance]"
          >
            Cada carro registrado.
            <br />
            <span className="text-brand-400">Cada real no seu bolso.</span>
          </motion.h1>

          <motion.p
            {...subir(0.3)}
            className="mt-6 text-lg text-white/75 max-w-2xl mx-auto leading-[1.7]"
          >
            Aposente o caderno e o sistema caro. Seus operadores registram tudo
            pelo celular — <b className="text-white">até sem internet</b> — e
            você acompanha o faturamento ao vivo, de onde estiver. Sem
            instalação, sem vendedor:{" "}
            <b className="text-white">crie a conta e use hoje</b>.
          </motion.p>

          <motion.div
            {...subir(0.42)}
            className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/cadastro"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
            >
              Começar grátis por 15 dias
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-7 rounded-xl border border-white/15 bg-white/[0.03] text-white/85 font-bold hover:border-white/30 hover:text-white hover:bg-white/[0.07] transition-all"
            >
              Prefiro falar no WhatsApp
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-4 text-xs text-white/55 flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
          >
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Sem cartão
              de crédito
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Liberação
              na hora
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Cancele
              quando quiser
            </span>
          </motion.p>
        </div>

        {/* Palco: o produto aceso no escuro */}
        <div className="mt-20 relative max-w-5xl mx-auto">
          {/* a luz do pátio sob o painel */}
          <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[56px] bg-brand-500/12 blur-3xl" />
          <div className="pointer-events-none absolute -inset-x-24 top-1/3 -bottom-20 -z-10 bg-[radial-gradient(55%_60%_at_50%_50%,rgb(14_165_233/0.07),transparent_70%)] blur-2xl" />

          {/* eventos ao vivo, estilo instrumento (linguagem da seção escura) */}
          <motion.div
            {...chip(1.0, -36)}
            className="hidden lg:flex absolute -left-8 top-16 z-20 items-center gap-3 rounded-2xl bg-noite-2/85 border border-white/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8)] backdrop-blur-sm px-4 py-3 animate-float"
          >
            <span className="w-10 h-10 rounded-xl bg-brand-500/15 grid place-items-center">
              <Wallet className="w-5 h-5 text-brand-300" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-white/55">Saída paga</p>
              <p className="text-sm font-black text-white tabular-nums">
                + {moeda.format(12)}
              </p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-brand-400" />
          </motion.div>

          <motion.div
            {...chip(1.15, 36)}
            className="hidden lg:flex absolute -right-6 top-40 z-20 items-center gap-3 rounded-2xl bg-noite-2/85 border border-white/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8)] backdrop-blur-sm px-4 py-3 animate-float"
            style={{ animationDelay: "-2.5s" }}
          >
            <span className="w-10 h-10 rounded-xl bg-ceu/15 grid place-items-center">
              <ScanLine className="w-5 h-5 text-ceu" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-white/55">Placa lida</p>
              <p className="text-sm font-black tracking-widest text-white">
                RIO2A18
              </p>
            </div>
          </motion.div>

          <motion.div
            {...chip(1.3, -28)}
            className="hidden lg:flex absolute left-10 -bottom-6 z-20 items-center gap-3 rounded-2xl bg-noite-2/85 border border-white/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8)] backdrop-blur-sm px-4 py-3 animate-float"
            style={{ animationDelay: "-4s" }}
          >
            <span className="w-10 h-10 rounded-xl bg-aviso/15 grid place-items-center">
              <Printer className="w-5 h-5 text-aviso" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-white/55">Ticket</p>
              <p className="text-sm font-black text-white">Impresso ✓</p>
            </div>
          </motion.div>

          {/* painel — o produto claro, aceso no palco escuro */}
          <motion.div
            initial={{ opacity: 0, y: reduzir ? 0 : 48, scale: reduzir ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <MockupDashboard />
            {/* varredura: a câmera lendo o pátio, ao vivo */}
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-2xl">
              <div className="animate-scan absolute inset-y-0 left-0 w-[12%] opacity-0 bg-gradient-to-r from-transparent via-brand-400/20 to-transparent" />
            </div>
          </motion.div>

          {/* celular com o app do operador, sobreposto */}
          <motion.div
            initial={{ opacity: 0, y: reduzir ? 0 : 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="hidden md:block absolute -right-4 lg:-right-10 -bottom-10 z-10 w-[220px]"
          >
            <MockupApp />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** Prévia do painel web (tema claro, fiel ao produto). */
function MockupDashboard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white shadow-[0_48px_120px_-24px_rgba(0,0,0,0.75)] overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 h-10 border-b border-borda bg-fundo/60">
        <span className="w-2.5 h-2.5 rounded-full bg-perigo/40" />
        <span className="w-2.5 h-2.5 rounded-full bg-aviso/40" />
        <span className="w-2.5 h-2.5 rounded-full bg-brand-300" />
        <span className="ml-3 text-[11px] font-mono text-texto-3">
          nuvempark.com/painel
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          AO VIVO
        </span>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiFake destaque Icone={Wallet} rotulo="Faturamento hoje" valor={moeda.format(4820)} />
        <KpiFake Icone={Car} rotulo="No pátio agora" valor="87 / 120" cor="text-ceu" fundo="bg-info-bg" />
        <KpiFake Icone={ScanLine} rotulo="Saídas hoje" valor="214" cor="text-violeta" fundo="bg-violeta/10" />
        <KpiFake Icone={RefreshCw} rotulo="Sincronizado" valor="há 2min" cor="text-brand-600" fundo="bg-brand-50" verde />
      </div>

      <div className="px-4 sm:px-6 pb-6 grid lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-borda bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-texto-3 mb-3">
            Ocupação por pátio
          </p>
          {[
            { nome: "Pátio Centro", pct: 72, cor: "from-brand-500 to-acento-teal" },
            { nome: "Shopping Norte", pct: 91, cor: "from-saida to-perigo" },
            { nome: "Aeroporto", pct: 45, cor: "from-ceu to-acento-teal" },
          ].map((p) => (
            <div key={p.nome} className="mb-3 last:mb-0">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-texto font-semibold">{p.nome}</span>
                <span className="text-texto-3 tabular-nums">{p.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-fundo overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${p.cor}`}
                  style={{ width: `${p.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 rounded-xl border border-borda bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-texto-3 mb-3">
            Últimos movimentos
          </p>
          <div className="space-y-2">
            {[
              { placa: "RIO2A18", tipo: "carro", valor: "R$ 12,00", st: "saiu" },
              { placa: "BRA1E23", tipo: "moto", valor: "no pátio", st: "aberto" },
              { placa: "FLA9K02", tipo: "carro", valor: "R$ 8,50", st: "saiu" },
            ].map((t) => (
              <div key={t.placa} className="flex items-center gap-3 text-[12px]">
                <span className="font-black tracking-widest text-texto bg-fundo border border-borda rounded px-2 py-0.5">
                  {t.placa}
                </span>
                <span className="text-texto-3 capitalize">{t.tipo}</span>
                <span
                  className={`ml-auto font-bold tabular-nums ${t.st === "aberto" ? "text-brand-700" : "text-texto-2"}`}
                >
                  {t.valor}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Celular com a tela de entrada do app do operador. */
function MockupApp() {
  return (
    <div className="rounded-[28px] border-[6px] border-noite-3 ring-1 ring-white/15 bg-noite-3 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] overflow-hidden">
      <div className="bg-fundo rounded-[20px] overflow-hidden">
        {/* status bar + header do app */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-3.5 pt-3 pb-3">
          <div className="flex justify-between items-center text-[8px] text-white/70 font-semibold mb-2">
            <span>09:41</span>
            <span>▮▮▮ 100%</span>
          </div>
          <p className="text-[10px] font-bold text-white/70">Pátio Centro</p>
          <p className="text-sm font-black text-white">Nova entrada</p>
        </div>

        <div className="p-3 space-y-2.5">
          {/* campo de placa com scan */}
          <div>
            <p className="text-[9px] font-bold text-texto-3 mb-1">PLACA</p>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-9 rounded-lg border-2 border-brand-500 bg-white px-2 flex items-center">
                <span className="font-black tracking-[0.2em] text-[13px] text-texto">
                  RIO2A18
                </span>
              </div>
              <span className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-200 grid place-items-center">
                <ScanLine className="w-4 h-4 text-brand-600" />
              </span>
            </div>
            <p className="text-[8px] font-semibold text-brand-600 mt-1">
              ✓ lida pela câmera
            </p>
          </div>

          {/* tipo de veículo */}
          <div>
            <p className="text-[9px] font-bold text-texto-3 mb-1">VEÍCULO</p>
            <div className="flex gap-1">
              <span className="flex-1 text-center text-[10px] font-bold py-1.5 rounded-lg bg-brand-600 text-white">
                Carro
              </span>
              <span className="flex-1 text-center text-[10px] font-bold py-1.5 rounded-lg bg-white border border-borda text-texto-2">
                Moto
              </span>
              <span className="flex-1 text-center text-[10px] font-bold py-1.5 rounded-lg bg-white border border-borda text-texto-2">
                Van
              </span>
            </div>
          </div>

          {/* botão principal */}
          <div className="h-10 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 grid place-items-center shadow-[var(--shadow-brand)]">
            <span className="text-[11px] font-black text-white">
              REGISTRAR ENTRADA
            </span>
          </div>

          {/* indicador de impressão */}
          <div className="flex items-center justify-center gap-1.5 pb-1">
            <Printer className="w-3 h-3 text-texto-3" />
            <span className="text-[8px] font-semibold text-texto-3">
              Imprime o ticket automaticamente
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiFake({
  rotulo,
  valor,
  Icone,
  destaque = false,
  verde = false,
  cor = "text-texto-3",
  fundo = "bg-fundo",
}: {
  rotulo: string;
  valor: string;
  Icone: React.ComponentType<{ className?: string }>;
  destaque?: boolean;
  verde?: boolean;
  cor?: string;
  fundo?: string;
}) {
  return (
    <div
      className={`rounded-xl p-3.5 ${
        destaque
          ? "bg-gradient-to-br from-brand-600 to-acento-teal text-white"
          : "border border-borda bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${destaque ? "text-white/80" : "text-texto-3"}`}
        >
          {rotulo}
        </span>
        <span
          className={`w-6 h-6 rounded-md grid place-items-center ${destaque ? "bg-white/15" : fundo}`}
        >
          <Icone className={`w-3.5 h-3.5 ${destaque ? "text-white" : cor}`} />
        </span>
      </div>
      <div
        className={`mt-1.5 text-lg font-black tabular-nums ${destaque ? "text-white" : verde ? "text-brand-700" : "text-texto"}`}
      >
        {valor}
      </div>
    </div>
  );
}
