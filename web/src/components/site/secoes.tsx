import Link from "next/link";
import {
  WifiOff,
  ScanLine,
  Clock,
  Printer,
  QrCode,
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  Check,
  ArrowRight,
  Car,
  Camera,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { PlayBadge } from "@/components/site/play-badge";
import { urlApp } from "@/lib/urls";

/** WhatsApp comercial da NuvemPark. */
export const WHATSAPP =
  "https://wa.me/5581996142120?text=Ol%C3%A1!%20Quero%20conhecer%20o%20NuvemPark";

/* =========================================================
   FAIXA DE NÚMEROS (credibilidade)
   ========================================================= */
export function Numeros() {
  const itens = [
    { valor: "100%", rotulo: "offline — a fila anda mesmo sem internet" },
    { valor: "3 seg", rotulo: "da placa lida ao ticket na mão do cliente" },
    { valor: "R$ 0", rotulo: "de equipamento — funciona no celular que você já tem" },
    { valor: "1 painel", rotulo: "para enxergar todos os seus pátios ao vivo" },
  ];
  return (
    <section className="border-y border-borda bg-fundo">
      <div className="mx-auto max-w-6xl px-5 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {itens.map((n, i) => (
          <Reveal key={n.rotulo} delay={i * 0.08} className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-brand-700 tabular-nums">
              {n.valor}
            </div>
            <div className="mt-1 text-xs sm:text-sm text-texto-2 font-medium">
              {n.rotulo}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   RECURSOS
   ========================================================= */
type Recurso = {
  Icone: LucideIcon;
  titulo: string;
  texto: string;
  /** classes de cor do ícone: fundo + texto + gradiente no hover */
  cor: { fundo: string; texto: string; hover: string };
};

const COR = {
  verde: { fundo: "bg-brand-50", texto: "text-brand-600", hover: "group-hover:from-brand-500 group-hover:to-acento-teal" },
  azul: { fundo: "bg-info-bg", texto: "text-ceu", hover: "group-hover:from-ceu group-hover:to-acento-teal" },
  violeta: { fundo: "bg-violeta/10", texto: "text-violeta", hover: "group-hover:from-violeta group-hover:to-ceu" },
  ambar: { fundo: "bg-aviso-bg", texto: "text-ambar", hover: "group-hover:from-ambar group-hover:to-saida" },
};

const RECURSOS: Recurso[] = [
  {
    Icone: WifiOff,
    titulo: "A internet caiu? Ninguém percebe.",
    texto:
      "O app registra entradas, saídas e pagamentos mesmo offline. Quando a conexão volta, tudo sobe sozinho para o painel. A fila não para — e o dinheiro não se perde.",
    cor: COR.verde,
  },
  {
    Icone: ScanLine,
    titulo: "A câmera digita a placa por você",
    texto:
      "O operador aponta o celular e pronto: placa lida em um segundo. Sem erro de digitação, sem fila crescendo na entrada.",
    cor: COR.azul,
  },
  {
    Icone: Clock,
    titulo: "O valor certo, sem conta de cabeça",
    texto:
      "Fração, hora, diária, tolerância e pernoite — o app calcula tudo sozinho. Você para de perder dinheiro em arredondamento de operador.",
    cor: COR.ambar,
  },
  {
    Icone: Printer,
    titulo: "Ticket profissional na hora",
    texto:
      "Comprovante impresso com QR Code e o nome do seu estacionamento, numa impressora térmica de bolso. Seu pátio ganha cara de empresa grande.",
    cor: COR.violeta,
  },
  {
    Icone: QrCode,
    titulo: "Saída em segundos, cliente feliz",
    texto:
      "O operador escaneia o QR do ticket e o sistema mostra o veículo, o tempo e o valor. Ninguém procurando papel em lista.",
    cor: COR.violeta,
  },
  {
    Icone: LayoutDashboard,
    titulo: "Seu faturamento, ao vivo, no seu celular",
    texto:
      "Cada entrada e cada real aparecem no painel na hora em que acontecem. De casa, da praia, de onde você estiver.",
    cor: COR.verde,
  },
  {
    Icone: Building2,
    titulo: "Da primeira vaga à quinta filial",
    texto:
      "Cada pátio com suas tarifas, operadores e caixa — tudo consolidado numa conta só. Crescer não exige trocar de sistema.",
    cor: COR.azul,
  },
  {
    Icone: ShieldCheck,
    titulo: "Cada centavo tem dono",
    texto:
      "Caixa por operador, sangria registrada, fechamento com conferência. Se faltar dinheiro, você sabe exatamente onde e quando.",
    cor: COR.ambar,
  },
  {
    Icone: Camera,
    titulo: "Avaria fotografada na entrada",
    texto:
      "Arranhão, amassado, retrovisor quebrado — o operador registra com foto e descrição na hora que o carro chega. Quando o cliente reclamar, você tem a prova, não a discussão.",
    cor: COR.ambar,
  },
];

export function Recursos({ resumido = false }: { resumido?: boolean }) {
  const lista = resumido ? RECURSOS.slice(0, 4) : RECURSOS;
  return (
    <section id="recursos" className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">
            Recursos
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-texto">
            Feito para o caos real
            <br className="hidden sm:block" /> de um pátio cheio
          </h2>
          <p className="mt-4 text-texto-2 leading-relaxed">
            Sexta-feira, 18h, fila na entrada e o cartão da maquininha falhando.
            É para esse momento que o NuvemPark foi construído.
          </p>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {lista.map((r, i) => (
            <Reveal key={r.titulo} delay={(i % 4) * 0.08}>
              <div className="group h-full rounded-2xl border border-borda bg-white p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-brand-200 hover:-translate-y-0.5 transition-all">
                <span
                  className={`inline-grid place-items-center w-11 h-11 rounded-xl ${r.cor.fundo} ${r.cor.texto} group-hover:bg-gradient-to-br ${r.cor.hover} group-hover:text-white transition-all`}
                >
                  <r.Icone className="w-5 h-5" />
                </span>
                <h3 className="mt-4 font-extrabold text-lg text-texto">
                  {r.titulo}
                </h3>
                <p className="mt-2 text-sm text-texto-2 leading-relaxed">
                  {r.texto}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {resumido && (
          <Reveal delay={0.2} className="mt-10 text-center">
            <Link
              href="/recursos"
              className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800 transition-colors"
            >
              Ver todos os recursos
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   ROADMAP TEASER (features futuras — sem detalhar)
   ========================================================= */
export function RoadmapTeaser() {
  const proximas = [
    "Pagamento por Pix integrado",
    "App para o cliente final",
    "Exportação de relatórios",
    "Integrações via API",
  ];
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-borda bg-fundo p-8 sm:p-12">
            <div className="pointer-events-none absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violeta via-ceu to-brand-500" />
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              <div className="lg:flex-1">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-violeta">
                  Em constante evolução
                </span>
                <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-texto">
                  Você assina uma vez.
                  <br />O produto melhora todo mês.
                </h2>
                <p className="mt-3 text-texto-2 leading-relaxed max-w-md">
                  Cada novidade entra no seu plano automaticamente, sem custo
                  extra e sem &ldquo;versão premium&rdquo;. Olha o que está
                  chegando:
                </p>
                <Link
                  href="/novidades"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800 transition-colors"
                >
                  Conhecer as novidades
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="lg:flex-1 grid sm:grid-cols-2 gap-3">
                {proximas.map((p) => (
                  <div
                    key={p}
                    className="flex items-center gap-2.5 rounded-xl border border-borda bg-white px-4 py-3.5 shadow-[var(--shadow-card)]"
                  >
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-violeta to-ceu shrink-0" />
                    <span className="text-sm font-bold text-texto">{p}</span>
                    <span className="ml-auto text-[10px] font-black uppercase text-violeta bg-violeta/10 rounded-full px-2 py-0.5">
                      breve
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =========================================================
   COMO FUNCIONA (3 passos)
   ========================================================= */
export function ComoFunciona() {
  const passos = [
    {
      n: "01",
      Icone: UserPlus,
      titulo: "Crie sua conta em 1 minuto",
      texto:
        "Cadastro grátis aqui no site, sem cartão e sem falar com vendedor. Confirmou o e-mail, seu painel já abre — com 15 dias liberados na hora.",
      grad: "from-brand-500 to-acento-teal",
      numCor: "text-brand-100",
    },
    {
      n: "02",
      Icone: Smartphone,
      titulo: "Baixe o app e chame sua equipe",
      texto:
        "Você cadastra seus pátios e operadores no painel. Eles baixam o app no Android e entram com o código do pátio — sem instalação técnica, sem obra.",
      grad: "from-ceu to-acento-teal",
      numCor: "text-sky-100",
    },
    {
      n: "03",
      Icone: RefreshCw,
      titulo: "Opere e acompanhe ao vivo",
      texto:
        "Carro chega, câmera lê a placa, ticket sai impresso. Cada entrada e cada real aparecem no seu painel na hora — a pergunta “quanto faturou hoje?” some.",
      grad: "from-violeta to-ceu",
      numCor: "text-violet-100",
    },
  ];

  return (
    <section id="como-funciona" className="py-24 bg-fundo">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">
            Como funciona
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-texto">
            Do cadastro ao primeiro
            <br className="hidden sm:block" /> ticket, no mesmo dia.
          </h2>
          <p className="mt-4 text-texto-2 leading-relaxed">
            Sistema de estacionamento costuma significar semanas de instalação e
            equipamento caro. Aqui você mesmo põe pra rodar — em 3 passos:
          </p>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {passos.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.12}>
              <div className="relative h-full rounded-2xl border border-borda bg-white p-7 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
                <span className={`text-5xl font-black tabular-nums ${p.numCor}`}>
                  {p.n}
                </span>
                <span
                  className={`absolute top-7 right-7 inline-grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br ${p.grad} text-white shadow-lg`}
                >
                  <p.Icone className="w-5 h-5" />
                </span>
                <h3 className="mt-4 font-extrabold text-lg text-texto">
                  {p.titulo}
                </h3>
                <p className="mt-2 text-sm text-texto-2 leading-relaxed">
                  {p.texto}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={urlApp("/cadastro")}
            className="group inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
          >
            Criar minha conta grátis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <PlayBadge />
        </Reveal>
      </div>
    </section>
  );
}

/* =========================================================
   PREÇOS — plano único, por pátio
   ========================================================= */
const RECURSOS_PLANO = [
  "App operacional offline-first",
  "Cobrança automática por tempo",
  "Leitura de placa por câmera",
  "Impressão Bluetooth com QR Code",
  "Painel web em tempo real",
  "Vários pátios na mesma conta",
  "Mensalistas e livre passagem",
  "Operadores e caixa por sessão",
  "Relatórios de faturamento",
  "Suporte no WhatsApp",
  "Atualizações incluídas",
  "Sem fidelidade — cancele quando quiser",
];

export function Precos() {
  return (
    <section id="precos" className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">
            Preço
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-texto">
            Teste 15 dias grátis.
            <br className="hidden sm:block" /> Depois, R$ 129,90 por pátio.
          </h2>
          <p className="mt-4 text-texto-2 leading-relaxed">
            Comece hoje sem pagar nada e sem cartão. Só vira mensalidade se você
            decidir ficar — e aí é um preço só: sem taxa de instalação, sem
            cobrança por operador, sem surpresa no boleto. Um carro por dia paga
            o sistema.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-14 max-w-3xl mx-auto">
          <div className="relative rounded-3xl bg-white border border-borda shadow-[var(--shadow-card-hover)] overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-600 via-ceu to-violeta" />
            <div className="grid md:grid-cols-2">
              {/* Preço */}
              <div className="p-8 sm:p-10 flex flex-col justify-center">
                <span className="inline-flex w-fit items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-full">
                  15 dias grátis, depois:
                </span>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-5xl sm:text-6xl font-black tabular-nums text-texto">
                    R$ 129<span className="text-3xl sm:text-4xl">,90</span>
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-texto-3">
                  por mês, por pátio — tudo incluso
                </p>
                <p className="mt-5 text-sm text-texto-2 leading-relaxed">
                  Menos do que um único cliente deixa no seu caixa por dia.
                  Adicione ou remova pátios quando quiser — o valor acompanha.
                </p>
                <a
                  href={urlApp("/cadastro")}
                  className="mt-7 inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
                >
                  Começar grátis agora
                  <ArrowRight className="w-4 h-4" />
                </a>
                <p className="mt-3 text-[11px] text-texto-3">
                  Sem cartão para testar. Só cobramos se você decidir continuar —
                  e cancela quando quiser, sem multa.
                </p>
              </div>

              {/* Recursos */}
              <div className="p-8 sm:p-10 border-t md:border-t-0 md:border-l border-borda bg-fundo/60">
                <p className="text-[11px] font-black uppercase tracking-wider text-texto-3 mb-4">
                  Tudo incluso
                </p>
                <ul className="grid gap-2.5">
                  {RECURSOS_PLANO.map((r) => (
                    <li key={r} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 inline-grid place-items-center w-4 h-4 rounded-full shrink-0 bg-brand-50 text-brand-600 border border-brand-200">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                      <span className="text-texto-2">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =========================================================
   FAIXA DE GARANTIAS (tira o medo do clique, antes do CTA)
   ========================================================= */
export function Garantias() {
  const itens = [
    { Icone: Smartphone, t: "Você mesmo cria a conta", d: "Sem vendedor, sem espera. Em 1 minuto está dentro do painel." },
    { Icone: ShieldCheck, t: "Sem cartão para testar", d: "15 dias completos, todos os recursos. Só paga se decidir ficar." },
    { Icone: RefreshCw, t: "Cancele quando quiser", d: "Sem fidelidade e sem multa. Seus dados são seus." },
  ];
  return (
    <section className="py-16 bg-fundo border-y border-borda">
      <div className="mx-auto max-w-5xl px-5 grid sm:grid-cols-3 gap-6">
        {itens.map((g, i) => (
          <Reveal key={g.t} delay={i * 0.1} className="text-center sm:text-left">
            <span className="inline-grid place-items-center w-11 h-11 rounded-xl bg-brand-50 text-brand-600 mb-3">
              <g.Icone className="w-5 h-5" />
            </span>
            <h3 className="font-extrabold text-texto">{g.t}</h3>
            <p className="mt-1 text-sm text-texto-2 leading-relaxed">{g.d}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   CTA FINAL
   ========================================================= */
export function CtaFinal() {
  return (
    <section id="cta" className="py-24 bg-white">
      <div className="mx-auto max-w-5xl px-5">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-borda fundo-mesh p-10 sm:p-16 text-center shadow-[var(--shadow-card-hover)]">
            <div className="pointer-events-none absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-600 via-ceu to-violeta" />
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-texto">
              Quanto o seu pátio
              <br className="hidden sm:block" />{" "}
              <span className="texto-brand-gradiente">faturou hoje?</span>
            </h2>
            <p className="mt-4 text-texto-2 max-w-xl mx-auto leading-relaxed">
              Se a resposta foi &ldquo;preciso perguntar ao operador&rdquo;, você
              já tem um bom motivo para testar. Crie sua conta agora e comece a
              enxergar o faturamento em tempo real{" "}
              <b className="text-texto">hoje mesmo</b> — grátis por 15 dias, sem
              cartão.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={urlApp("/cadastro")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
              >
                Criar minha conta grátis
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-xl border border-borda bg-white text-texto font-bold hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all"
              >
                Tirar dúvidas no WhatsApp
              </a>
            </div>
            <p className="mt-4 text-xs text-texto-3">
              Leva 1 minuto. Você mesmo cria a conta — sem espera, sem vendedor.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =========================================================
   FOOTER
   ========================================================= */
export function SiteFooter() {
  const colunas: {
    titulo: string;
    links: { href: string; label: string; externo?: boolean; app?: boolean }[];
  }[] = [
    {
      titulo: "Produto",
      links: [
        { href: "/recursos", label: "Recursos" },
        { href: "/novidades", label: "Novidades" },
        { href: "/precos", label: "Preços" },
      ],
    },
    {
      titulo: "Empresa",
      links: [
        { href: "/sobre", label: "Sobre nós" },
        { href: "/contato", label: "Contato" },
      ],
    },
    {
      titulo: "Acesso",
      links: [
        { href: urlApp("/cadastro"), label: "Começar grátis", app: true },
        { href: urlApp("/login"), label: "Painel do gestor", app: true },
        { href: WHATSAPP, label: "Falar no WhatsApp", externo: true },
      ],
    },
  ];

  return (
    <footer className="bg-white border-t border-borda">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-acento-teal grid place-items-center shadow-[var(--shadow-brand)]">
                <CloudPWhite />
              </span>
              <span className="font-extrabold text-texto tracking-tight">
                Nuvem<span className="text-brand-600">Park</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-texto-3 max-w-xs leading-relaxed">
              O sistema que cabe no bolso do operador — e coloca o faturamento
              do pátio na sua mão.
            </p>
            <div className="mt-4">
              <PlayBadge />
            </div>
          </div>

          {colunas.map((c) => (
            <div key={c.titulo}>
              <p className="text-xs font-black uppercase tracking-wider text-texto-3 mb-3">
                {c.titulo}
              </p>
              <ul className="space-y-2.5">
                {c.links.map((l) =>
                  l.externo ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-texto-2 hover:text-brand-700 transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : l.app ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-sm text-texto-2 hover:text-brand-700 transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-texto-2 hover:text-brand-700 transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-borda flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-texto-3">
          <span>© 2026 NuvemPark. Todos os direitos reservados.</span>
          <span>nuvempark.com</span>
        </div>
      </div>
    </footer>
  );
}

function CloudPWhite() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
      <path
        d="M7 18a4 4 0 0 1-.6-7.96 5.5 5.5 0 0 1 10.83-1.02A4.5 4.5 0 0 1 16.5 18H7Z"
        fill="white"
      />
      <path
        d="M10.6 15.5v-5h2.2a1.7 1.7 0 1 1 0 3.4h-2.2"
        stroke="#059669"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
