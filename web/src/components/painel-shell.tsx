"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ParkingSquare,
  ArrowLeftRight,
  Gauge,
  Ban,
  Landmark,
  Banknote,
  FileCheck2,
  QrCode,
  CalendarRange,
  BadgeCheck,
  Users,
  Layers,
  FolderCog,
  CircleDollarSign,
  CarFront,
  BarChart3,
  CreditCard,
  Settings,
  SlidersHorizontal,
  Settings2,
  Building2,
  Printer,
  History,
  PanelLeftClose,
  ChevronDown,
  Check,
  LogOut,
  Menu as MenuIcon,
  X,
  type LucideIcon,
} from "lucide-react";

type Filho = { href: string; label: string; Icone: LucideIcon };
type Item = {
  label: string;
  Icone: LucideIcon;
  href?: string;
  porPatio?: boolean;
  filhos?: Filho[];
};

const NAV: Item[] = [
  { label: "Dashboard", Icone: LayoutDashboard, href: "/painel", porPatio: true },
  {
    label: "Operação",
    Icone: ClipboardList,
    filhos: [
      { href: "/painel/patio", label: "Pátio", Icone: ParkingSquare },
      { href: "/painel/movimentos", label: "Movimentos", Icone: ArrowLeftRight },
      { href: "/painel/ocupacao", label: "Ocupação", Icone: Gauge },
      { href: "/painel/removidos", label: "Tickets removidos", Icone: Ban },
    ],
  },
  {
    label: "Financeiro",
    Icone: Landmark,
    filhos: [
      { href: "/painel/caixa", label: "Caixa", Icone: Banknote },
      { href: "/painel/financeiro/prestacao", label: "Prestação de contas", Icone: FileCheck2 },
      { href: "/painel/financeiro/pix-online", label: "Pix Online", Icone: QrCode },
      { href: "/painel/financeiro/resultados", label: "Resultados", Icone: CalendarRange },
    ],
  },
  {
    label: "Mensalistas/Credenciados",
    Icone: BadgeCheck,
    filhos: [
      { href: "/painel/mensalistas", label: "Clientes", Icone: Users },
      { href: "/painel/mensalistas/planos", label: "Planos", Icone: Layers },
      { href: "/painel/mensalistas/credenciados", label: "Credenciados", Icone: BadgeCheck },
    ],
  },
  {
    label: "Cadastros",
    Icone: FolderCog,
    filhos: [
      { href: "/painel/tarifas", label: "Tarifas", Icone: CircleDollarSign },
      { href: "/painel/tipos-veiculo", label: "Tipos de veículo", Icone: CarFront },
      { href: "/painel/pagamentos", label: "Formas de pagamento", Icone: CreditCard },
      { href: "/painel/operadores", label: "Operadores", Icone: Users },
    ],
  },
  { label: "Relatórios", Icone: BarChart3, href: "/painel/relatorios", porPatio: true },
  { label: "Assinatura", Icone: CreditCard, href: "/painel/assinatura" },
  {
    label: "Configurações",
    Icone: Settings,
    filhos: [
      { href: "/painel/configuracoes", label: "Geral", Icone: SlidersHorizontal },
      { href: "/painel/parametrizacao", label: "Parametrização", Icone: Settings2 },
      { href: "/painel/patios", label: "Pátios", Icone: Building2 },
      { href: "/painel/impressao", label: "Impressão", Icone: Printer },
      { href: "/painel/historico", label: "Histórico de alterações", Icone: History },
    ],
  },
];

// Todos os hrefs navegáveis, para desempatar por "match mais específico".
const TODOS_HREF = NAV.flatMap((i) =>
  i.filhos ? i.filhos.map((f) => f.href) : i.href ? [i.href] : [],
);

function casa(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
// Ativo só se casar E nenhum href mais específico também casar. Sem isso o
// Dashboard ("/painel") acenderia em toda rota, e "Clientes"
// ("/painel/mensalistas") roubaria o destaque de "/painel/mensalistas/planos".
function ativa(pathname: string, href: string) {
  if (!casa(pathname, href)) return false;
  return !TODOS_HREF.some(
    (o) => o.length > href.length && casa(pathname, o),
  );
}
function grupoAtivo(pathname: string, item: Item) {
  return item.filhos?.some((f) => ativa(pathname, f.href)) ?? false;
}

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Logo do design: nuvem com "P". */
function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size }} fill="none">
      <path
        d="M7 18a4 4 0 0 1-.6-7.96 5.5 5.5 0 0 1 10.83-1.02A4.5 4.5 0 0 1 16.5 18H7Z"
        fill="#fff"
      />
      <path
        d="M10.6 15.5v-5h2.2a1.7 1.7 0 1 1 0 3.4h-2.2"
        stroke="#166534"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type PatioOpcao = { id: string; nome: string; codigo: string | null; vagas: number };

export function PainelShell({
  children,
  userEmail,
  tenantNome,
  sincronizacoes,
  patios,
  patioAtivoId,
  assinaturaAlerta = false,
  sair,
}: {
  children: React.ReactNode;
  userEmail: string;
  tenantNome: string;
  sincronizacoes: Record<string, string>;
  patios: PatioOpcao[];
  patioAtivoId: string;
  assinaturaAlerta?: boolean;
  sair: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const alerta = (label: string) => label === "Assinatura" && assinaturaAlerta;

  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [patioOpen, setPatioOpen] = useState(false);

  // Seletor de pátio: pátio ativo (cookie np_patio, escopado no servidor).
  const patioAtivo = patios.find((p) => p.id === patioAtivoId) ?? patios[0];
  const selecionarPatio = (id: string) => {
    document.cookie = `np_patio=${id}; path=/; max-age=31536000; samesite=lax`;
    setPatioOpen(false);
    router.refresh();
  };

  useEffect(() => {
    const v = localStorage.getItem("painel_collapsed");
    if (v) setCollapsed(v === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("painel_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);
  useEffect(() => setMenuOpen(false), [pathname]);

  // Status do app (última sincronização, do card do design).
  const ultimaSync = useMemo(() => {
    const isos = Object.values(sincronizacoes);
    if (isos.length === 0) return null;
    return isos.sort().at(-1) ?? null;
  }, [sincronizacoes]);
  const online = ultimaSync
    ? Date.now() - new Date(ultimaSync).getTime() < 3 * 60 * 1000
    : false;

  // ── Realce do menu ──────────────────────────────────────────────────────
  // O item ATIVO é destacado por CSS (atributo data-active) — confiável, sem
  // depender de medição de DOM. O "slider" abaixo é SÓ o realce que desliza sob
  // o CURSOR no hover; ao sair do menu, ele some. Antes o slider também tentava
  // "descansar" no ativo via getBoundingClientRect, e perdia a corrida de
  // layout no load (vinha com opacity:0) — o destaque sumia de forma
  // intermitente.
  const navRef = useRef<HTMLDivElement>(null);
  const [slider, setSlider] = useState({ top: 0, height: 40, show: false });
  const posEm = (el: HTMLElement | null) => {
    const nav = navRef.current;
    if (!nav || !el) return;
    const r = el.getBoundingClientRect();
    const nr = nav.getBoundingClientRect();
    setSlider({ top: r.top - nr.top + nav.scrollTop, height: r.height, show: true });
  };
  // Só esconde o slider — o item ativo é marcado por CSS, não por ele.
  const resetSlider = () => setSlider((s) => ({ ...s, show: false }));
  // Ao trocar de rota, esconde o slider de hover (o novo ativo já vem do CSS).
  useEffect(() => {
    resetSlider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, collapsed, abertos]);

  const inicial = (userEmail || "?").charAt(0).toUpperCase();

  return (
    <div className={`pshell relative flex min-h-dvh ${collapsed ? "pcollapsed" : ""}`}>
      {/* ══ SIDEBAR DESKTOP ══ */}
      <aside
        className={`gnav liquid ${collapsed ? "collapsed" : ""} hidden lg:flex`}
        style={{
          position: "absolute",
          top: 22,
          left: 22,
          bottom: 22,
          borderRadius: 26,
          padding: "14px 12px",
          flexDirection: "column",
          gap: 6,
          zIndex: 5,
          color: "#fff",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {/* Marca + recolher */}
        <div className="navitem" style={{ gap: 10, padding: "2px 4px 10px" }}>
          <div
            className="grid place-items-center shrink-0"
            // Recolhida, o botão de expandir (.cbtn) fica oculto/sem clique (só
            // no hover) — o operador ficava sem como reabrir. O logo está SEMPRE
            // visível no topo, então ele vira o alvo de expandir quando recolhida.
            onClick={collapsed ? () => setCollapsed(false) : undefined}
            title={collapsed ? "Expandir menu" : undefined}
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: "linear-gradient(135deg,#166534,#22C55E)",
              boxShadow: "0 8px 20px -8px rgba(22,101,52,.55)",
              cursor: collapsed ? "pointer" : "default",
            }}
          >
            <Logo />
          </div>
          <span
            className="lbl brand"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 17,
              color: "#fff",
              letterSpacing: "-.01em",
            }}
          >
            <span style={{ fontWeight: 300 }}>Nuvem</span>
            <span style={{ fontWeight: 800, color: "#22C55E" }}>Park</span>
          </span>
          <button
            className="cbtn hidec"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expandir" : "Recolher"}
            style={{
              marginLeft: "auto",
              width: 30,
              height: 30,
              borderRadius: 9,
              display: "grid",
              placeItems: "center",
              color: "rgba(255,255,255,.45)",
            }}
          >
            <PanelLeftClose className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Seletor de pátio ativo (some quando recolhido) */}
        {patioAtivo && (
          <div className="patiosel hidec" style={{ position: "relative", padding: "0 2px 8px" }}>
            <div
              onClick={() => setPatioOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 11px",
                borderRadius: 13,
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.12)",
                cursor: "pointer",
              }}
            >
              <span
                className="grid place-items-center shrink-0"
                style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(34,197,94,.16)", color: "#4ADE80" }}
              >
                <Building2 className="w-4 h-4" />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: "rgba(255,255,255,.42)" }}>
                  Pátio ativo
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {patioAtivo.nome}
                </div>
              </div>
              <ChevronDown
                className="chev w-[15px] h-[15px] shrink-0"
                data-open={patioOpen}
                style={{ color: "rgba(255,255,255,.5)" }}
              />
            </div>
            {patioOpen && (
              <>
                <div
                  onClick={() => setPatioOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 35 }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% - 2px)",
                    left: 2,
                    right: 2,
                    zIndex: 40,
                    borderRadius: 14,
                    padding: 6,
                    background: "linear-gradient(160deg,#14203A,#0B1220)",
                    border: "1px solid rgba(255,255,255,.14)",
                    boxShadow: "0 24px 50px -14px rgba(0,0,0,.7)",
                  }}
                >
                  {patios.map((p) => {
                    const sel = p.id === patioAtivo.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => selecionarPatio(p.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 10px",
                          borderRadius: 10,
                          cursor: "pointer",
                          background: sel ? "rgba(34,197,94,.12)" : "transparent",
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: 999, flexShrink: 0, background: "#22C55E", opacity: 0.9 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.nome}
                          </div>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.45)" }}>
                            {p.codigo ? `#${p.codigo} · ` : ""}{p.vagas} vagas
                          </div>
                        </div>
                        {sel && <Check className="w-[15px] h-[15px] shrink-0" style={{ color: "#4ADE80" }} />}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Navegação */}
        <div
          ref={navRef}
          className="navscroll"
          onMouseLeave={resetSlider}
        >
          <div
            className="hoverslider"
            style={{
              transform: `translateY(${slider.top}px)`,
              height: slider.height,
              opacity: slider.show ? 1 : 0,
            }}
          />
          {NAV.map((item) => {
            if (!item.filhos) {
              const act = ativa(pathname, item.href!);
              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  className="pitem navitem"
                  data-active={act}
                  onMouseEnter={(e) => posEm(e.currentTarget)}
                  style={{
                    gap: 11,
                    padding: "10px 12px",
                    borderRadius: 13,
                    color: act ? "#fff" : "rgba(255,255,255,.72)",
                    fontWeight: act ? 700 : 600,
                    fontSize: 13,
                  }}
                >
                  <item.Icone className="w-[18px] h-[18px] shrink-0" />
                  <span className="lbl">{item.label}</span>
                  {alerta(item.label) && (
                    <span
                      className="lbl"
                      style={{
                        marginLeft: "auto",
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: "#F97316",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Link>
              );
            }
            const gAtivo = grupoAtivo(pathname, item);
            const aberto = item.label in abertos ? abertos[item.label] : gAtivo;
            return (
              <div key={item.label}>
                <div
                  className="gitem navitem"
                  // Recolhida, os filhos ficam display:none (subwrap oculto), então
                  // o destaque vai no ÍCONE-PAI do grupo. Expandida e aberta, quem
                  // carrega o destaque é o filho ativo (subitem).
                  data-active={gAtivo && (collapsed || !aberto)}
                  onMouseEnter={(e) => posEm(e.currentTarget)}
                  onClick={() =>
                    setAbertos((a) => ({
                      ...a,
                      [item.label]: !(item.label in a ? a[item.label] : gAtivo),
                    }))
                  }
                  style={{
                    gap: 11,
                    padding: "10px 12px",
                    borderRadius: 13,
                    cursor: "pointer",
                    color: gAtivo ? "#fff" : "rgba(255,255,255,.72)",
                    fontWeight: gAtivo ? 700 : 600,
                    fontSize: 13,
                  }}
                >
                  <item.Icone className="w-[18px] h-[18px] shrink-0" />
                  <span className="lbl" style={{ flex: 1 }}>
                    {item.label}
                  </span>
                  <ChevronDown
                    className="chev hidec w-4 h-4"
                    data-open={aberto}
                    style={{ color: "rgba(255,255,255,.4)" }}
                  />
                </div>
                {aberto && (
                  <div className="subwrap">
                    {item.filhos.map((f) => {
                      const act = ativa(pathname, f.href);
                      return (
                        <Link
                          key={f.href}
                          href={f.href}
                          className="subitem"
                          data-active={act}
                          onMouseEnter={(e) => posEm(e.currentTarget)}
                        >
                          <f.Icone className="w-4 h-4 shrink-0" />
                          <span className="lbl">{f.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Card de status do app (última sincronização) */}
        <div className="navitem" style={{ marginTop: "auto", padding: "6px 2px 8px" }}>
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 11px",
              borderRadius: 13,
              background: online ? "rgba(34,197,94,.1)" : "rgba(248,113,113,.1)",
              border: `1px solid ${online ? "rgba(34,197,94,.28)" : "rgba(248,113,113,.28)"}`,
            }}
          >
            <span className="relative flex shrink-0" style={{ width: 9, height: 9 }}>
              {online && (
                <span
                  className="absolute animate-ping-slow"
                  style={{ width: "100%", height: "100%", borderRadius: 999, background: "#22C55E" }}
                />
              )}
              <span
                className="relative"
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background: online ? "#22C55E" : "#F87171",
                  boxShadow: online ? "0 0 0 3px rgba(34,197,94,.18)" : "0 0 0 3px rgba(248,113,113,.18)",
                }}
              />
            </span>
            <div className="lbl hidec" style={{ minWidth: 0, lineHeight: 1.25 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: online ? "#fff" : "#FCA5A5", whiteSpace: "nowrap" }}>
                {online ? "App conectado" : "App offline"}
              </div>
              <div className="mono" style={{ fontSize: 10, color: "rgba(255,255,255,.5)", whiteSpace: "nowrap" }}>
                {ultimaSync ? `Atualizado ${dataHora.format(new Date(ultimaSync))}` : "Nunca sincronizou"}
              </div>
            </div>
          </div>
        </div>

        {/* Conta */}
        <div style={{ padding: "12px 6px 2px", borderTop: "1px solid rgba(255,255,255,.12)" }}>
          <Link
            href="/painel/perfil"
            className="navitem"
            style={{ gap: 10, padding: 0, borderRadius: 12 }}
          >
            <span
              className="grid place-items-center shrink-0"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: "linear-gradient(135deg,#22C55E,#0EA5E9)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {inicial}
            </span>
            <span className="lbl" style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#fff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {tenantNome}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: 10,
                  color: "rgba(255,255,255,.5)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userEmail}
              </span>
            </span>
            <form action={sair} className="hidec" style={{ marginLeft: "auto" }}>
              <button
                title="Sair"
                className="grid place-items-center"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,.1)",
                  background: "rgba(255,255,255,.04)",
                  color: "rgba(255,255,255,.55)",
                  cursor: "pointer",
                }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </Link>
        </div>
      </aside>

      {/* ══ CONTEÚDO ══ */}
      <main
        className="pmain flex-1 min-w-0"
        style={{ paddingTop: 22, paddingRight: 22, paddingBottom: 40, overflowY: "auto" }}
      >
        {children}
      </main>

      {/* ══ MOBILE: barra inferior flutuante ══ */}
      <div
        className="lg:hidden"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 25,
          padding: "8px 16px 22px",
          background:
            "linear-gradient(180deg,rgba(243,245,247,0),rgba(243,245,247,.92) 32%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <div
          className="flex items-end justify-around"
          style={{
            background: "rgba(255,255,255,.75)",
            border: "1px solid rgba(255,255,255,.9)",
            borderRadius: 24,
            padding: "9px 8px",
            boxShadow:
              "0 16px 40px -14px rgba(16,27,20,.35),inset 0 1px 0 rgba(255,255,255,.9)",
          }}
        >
          <TabBottom href="/painel" label="Início" Icone={LayoutDashboard} ativo={pathname === "/painel"} />
          <TabBottom
            href="/painel/movimentos"
            label="Operação"
            Icone={ClipboardList}
            ativo={["/painel/patio", "/painel/movimentos", "/painel/ocupacao", "/painel/removidos"].some((r) => pathname.startsWith(r))}
          />
          <div style={{ flex: "0 0 auto", padding: "0 6px" }}>
            <button
              onClick={() => setMenuOpen(true)}
              className="grid place-items-center"
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                border: "none",
                background: "linear-gradient(135deg,#166534,#22C55E)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 12px 26px -8px rgba(22,101,52,.6)",
                transform: "translateY(-8px)",
              }}
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
          <TabBottom
            href="/painel/caixa"
            label="Financeiro"
            Icone={Landmark}
            ativo={pathname.startsWith("/painel/caixa") || pathname.startsWith("/painel/financeiro")}
          />
          <TabBottom
            href="/painel/mensalistas"
            label="Mensalistas"
            Icone={BadgeCheck}
            ativo={pathname.startsWith("/painel/mensalistas")}
          />
        </div>
      </div>

      {/* ══ MOBILE: folha do menu ══ */}
      {menuOpen && (
        <div className="lg:hidden" style={{ position: "fixed", inset: 0, zIndex: 40 }}>
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(20,29,40,.4)",
              animation: "pfadein .2s ease both",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              top: 44,
              background: "#F3F5F7",
              borderRadius: "28px 28px 0 0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 -20px 60px -20px rgba(20,29,40,.5)",
              animation: "psheetup .34s cubic-bezier(.22,1,.36,1) both",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: "16px 18px 10px", borderBottom: "1px solid #E4E8EC" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid place-items-center"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    background: "linear-gradient(135deg,#166534,#22C55E)",
                    boxShadow: "0 8px 20px -8px rgba(22,101,52,.55)",
                  }}
                >
                  <Logo />
                </div>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 17 }}>
                  Menu
                </span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="grid place-items-center"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: "1px solid #E4E8EC",
                  background: "#fff",
                  color: "#46545E",
                  cursor: "pointer",
                }}
              >
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 24px", display: "flex", flexDirection: "column", gap: 3 }}>
              {NAV.map((item) => {
                if (!item.filhos) {
                  const act = ativa(pathname, item.href!);
                  return (
                    <Link
                      key={item.label}
                      href={item.href!}
                      className="flex items-center gap-3"
                      style={{
                        padding: 13,
                        borderRadius: 14,
                        background: act ? "rgba(22,163,74,.12)" : "transparent",
                        color: act ? "#16A34A" : "#1F2A33",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      <item.Icone className="w-[19px] h-[19px] shrink-0" />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {alerta(item.label) && (
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: "#F97316" }} />
                      )}
                    </Link>
                  );
                }
                const gAtivo = grupoAtivo(pathname, item);
                const aberto = item.label in abertos ? abertos[item.label] : gAtivo;
                return (
                  <div key={item.label}>
                    <div
                      onClick={() =>
                        setAbertos((a) => ({
                          ...a,
                          [item.label]: !(item.label in a ? a[item.label] : gAtivo),
                        }))
                      }
                      className="flex items-center gap-3"
                      style={{
                        padding: 13,
                        borderRadius: 14,
                        cursor: "pointer",
                        background: gAtivo && !aberto ? "rgba(22,163,74,.1)" : "transparent",
                        color: gAtivo ? "#16A34A" : "#1F2A33",
                      }}
                    >
                      <item.Icone className="w-[19px] h-[19px] shrink-0" />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{item.label}</span>
                      <ChevronDown
                        className="w-[17px] h-[17px]"
                        style={{
                          color: "#8695A0",
                          transition: "transform .22s cubic-bezier(.22,1,.36,1)",
                          transform: aberto ? "rotate(180deg)" : "none",
                        }}
                      />
                    </div>
                    {aberto && (
                      <div style={{ padding: "2px 0 4px", marginLeft: 10, borderLeft: "1.5px solid #DDE3E8" }}>
                        {item.filhos.map((f) => {
                          const act = ativa(pathname, f.href);
                          return (
                            <Link
                              key={f.href}
                              href={f.href}
                              className="flex items-center gap-3"
                              style={{
                                padding: "10px 12px 10px 16px",
                                borderRadius: 11,
                                color: act ? "#16A34A" : "#46545E",
                                background: act ? "#DCFCE7" : "transparent",
                              }}
                            >
                              <f.Icone
                                className="w-4 h-4 shrink-0"
                                style={{ color: act ? "#16A34A" : "#8695A0" }}
                              />
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div
                className="flex items-center gap-3"
                style={{
                  marginTop: 10,
                  padding: "14px 13px",
                  borderRadius: 14,
                  background: "#fff",
                  border: "1px solid #E4E8EC",
                }}
              >
                <div
                  className="grid place-items-center shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: "linear-gradient(135deg,#22C55E,#0EA5E9)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {inicial}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{tenantNome}</div>
                  <div style={{ fontSize: 11, color: "#8695A0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {userEmail}
                  </div>
                </div>
                <form action={sair}>
                  <button
                    className="inline-flex items-center gap-1.5"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 11,
                      border: "1px solid #E4E8EC",
                      background: "#FAFBFC",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#5A6B78",
                      cursor: "pointer",
                    }}
                  >
                    <LogOut className="w-[15px] h-[15px]" />
                    Sair
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBottom({
  href,
  label,
  Icone,
  ativo,
}: {
  href: string;
  label: string;
  Icone: LucideIcon;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1"
      style={{ flex: 1, color: ativo ? "#1F2A33" : "#9AA6B0" }}
    >
      <Icone className="w-[22px] h-[22px]" />
      <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
    </Link>
  );
}
