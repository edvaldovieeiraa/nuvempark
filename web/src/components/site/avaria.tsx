import {
  ShieldCheck,
  Camera,
  ScrollText,
  Scale,
  Clock,
  MapPin,
} from "lucide-react";
import { Reveal } from "@/components/site/reveal";

/* =========================================================
   SEÇÃO AVARIA — "Ficha de perícia"
   Estética: dossiê de evidência. A avaria não é um recurso
   bonitinho — é uma PROVA. Fundo escuro (quebra o ritmo claro
   do site), acento âmbar/laranja de alerta, placa e timestamp
   em mono. Anchor visual: o cartão de evidência com marcadores
   pulsantes sobre a silhueta do carro.
   ========================================================= */
export function Avaria() {
  return (
    <section className="relative overflow-hidden bg-noite py-24">
      {/* textura: grade técnica sutil + glow âmbar de canto */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      <div className="pointer-events-none absolute -top-24 right-0 w-[32rem] h-[32rem] rounded-full bg-saida/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-aviso/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-5 grid lg:grid-cols-[1fr_1.05fr] gap-14 items-center">
        {/* -------- Lado texto -------- */}
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-saida/30 bg-saida/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-saida">
            <ScrollText className="w-3.5 h-3.5" />
            Diferencial NuvemPark
          </span>

          <h2 className="mt-5 text-3xl sm:text-4xl font-black tracking-tight text-white leading-[1.08]">
            &ldquo;Esse risco já estava
            <br className="hidden sm:block" /> quando o carro entrou.&rdquo;
          </h2>

          <p className="mt-5 text-white/70 leading-relaxed">
            A frase que todo dono de pátio teme ouvir na saída — e não consegue
            provar. Com o <b className="text-white">registro de avarias</b>, seu
            operador fotografa e descreve qualquer dano{" "}
            <b className="text-white">no momento da entrada</b>. Fica tudo
            guardado, com placa, data e hora, esperando no seu painel.
          </p>

          <p className="mt-4 text-white/70 leading-relaxed">
            Se o cliente reclamar de um arranhão, a resposta não é sua palavra
            contra a dele.{" "}
            <b className="text-white">É a foto, com a hora que ele entrou.</b>
          </p>

          {/* três garantias, estilo checklist técnico */}
          <ul className="mt-7 space-y-3">
            {[
              {
                Icone: Camera,
                t: "Foto na entrada, não depois",
                d: "O operador registra o dano antes de liberar a vaga.",
              },
              {
                Icone: Scale,
                t: "Fim do prejuízo em disputa",
                d: "Você para de pagar por avaria que não causou.",
              },
              {
                Icone: ShieldCheck,
                t: "Prova guardada no painel",
                d: "Placa, descrição e fotos, sempre à mão.",
              },
            ].map((g) => (
              <li key={g.t} className="flex items-start gap-3">
                <span className="mt-0.5 inline-grid place-items-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-saida shrink-0">
                  <g.Icone className="w-4 h-4" />
                </span>
                <span>
                  <span className="block font-bold text-white text-sm">
                    {g.t}
                  </span>
                  <span className="block text-white/55 text-sm">{g.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* -------- Lado: cartão de evidência (o anchor visual) -------- */}
        <Reveal delay={0.15}>
          <FichaEvidencia />
        </Reveal>
      </div>
    </section>
  );
}

/** Cartão "laudo de perícia": foto do carro com marcadores de avaria anotados. */
function FichaEvidencia() {
  return (
    <div className="relative">
      {/* selo REGISTRADO, rotacionado, sobreposto */}
      <div className="absolute -top-4 -right-2 z-20 rotate-6">
        <div className="rounded-lg border-2 border-brand-400/70 bg-noite/80 backdrop-blur px-3 py-1.5 shadow-lg">
          <div className="text-[10px] font-black uppercase tracking-widest text-brand-400 leading-none">
            ✓ Registrado
          </div>
          <div className="text-[9px] font-mono text-white/50 mt-0.5">
            na entrada
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-sm p-4 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.6)]">
        {/* cabeçalho do laudo */}
        <div className="flex items-center justify-between px-1 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-saida animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-white/70">
              Ficha de avaria
            </span>
          </div>
          <span className="font-mono text-[11px] text-white/40">
            #AV-2418
          </span>
        </div>

        {/* "foto" do carro com marcadores */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-noite-3 to-noite-2 border border-white/8 aspect-[16/10]">
          {/* grade de scanner sutil */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(245,158,11,.4) 1px,transparent 1px)",
              backgroundSize: "100% 22px",
            }}
          />
          {/* silhueta do carro */}
          <CarroSilhueta />

          {/* marcador de avaria 1 — pulsante (o micro-motion com função) */}
          <Marcador className="left-[26%] top-[38%]" label="Arranhão · porta diant. esq." />
          {/* marcador de avaria 2 */}
          <Marcador className="left-[63%] top-[58%]" label="Amassado · paralama" atraso />

          {/* rótulo de canto: câmera */}
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-md bg-black/50 backdrop-blur px-2 py-1">
            <Camera className="w-3 h-3 text-saida" />
            <span className="font-mono text-[10px] text-white/70">CAM 01</span>
          </div>
        </div>

        {/* rodapé de metadados, estilo EXIF/laudo */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetaDado Icone={MapPin} rotulo="Placa" valor="RIO2A18" mono />
          <MetaDado Icone={Clock} rotulo="Entrada" valor="14:07" mono />
          <MetaDado Icone={Camera} rotulo="Fotos" valor="3" />
        </div>
      </div>
    </div>
  );
}

function Marcador({
  className,
  label,
  atraso = false,
}: {
  className: string;
  label: string;
  atraso?: boolean;
}) {
  return (
    <div className={`absolute ${className} group/mark`}>
      {/* ping */}
      <span className="absolute inset-0 grid place-items-center">
        <span
          className="w-5 h-5 rounded-full bg-saida/40 animate-ping-slow"
          style={atraso ? { animationDelay: "-1.1s" } : undefined}
        />
      </span>
      {/* ponto central */}
      <span className="relative block w-5 h-5 rounded-full border-2 border-saida bg-saida/25" />
      {/* etiqueta */}
      <span className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-noite/90 border border-saida/30 px-2 py-1 text-[10px] font-mono font-bold text-saida shadow-lg">
        {label}
      </span>
    </div>
  );
}

function MetaDado({
  Icone,
  rotulo,
  valor,
  mono = false,
}: {
  Icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/8 px-3 py-2">
      <div className="flex items-center gap-1.5 text-white/40">
        <Icone className="w-3 h-3" />
        <span className="text-[9px] font-bold uppercase tracking-wider">
          {rotulo}
        </span>
      </div>
      <div
        className={`mt-0.5 text-sm font-black text-white ${mono ? "font-mono tracking-wider" : ""}`}
      >
        {valor}
      </div>
    </div>
  );
}

/** Silhueta lateral simples de um carro (SVG inline, leve). */
function CarroSilhueta() {
  return (
    <svg
      viewBox="0 0 320 160"
      className="absolute inset-0 w-full h-full p-6 opacity-90"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M28 108 h264 M50 108 c0-14 11-25 25-25s25 11 25 25 M220 108 c0-14 11-25 25-25s25 11 25 25"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M40 108 L52 70 c3-9 11-15 21-15 h94 l40 33 h34 c12 0 22 10 22 22 v0"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M78 55 h84 l30 33 H100 z"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="rgba(255,255,255,0.03)"
      />
      {/* rodas */}
      <circle cx="75" cy="108" r="15" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <circle cx="245" cy="108" r="15" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
    </svg>
  );
}
