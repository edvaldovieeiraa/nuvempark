"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    ],
  },
  {
    label: "Cadastros",
    Icone: FolderCog,
    filhos: [
      { href: "/painel/tarifas", label: "Tarifas", Icone: CircleDollarSign },
      { href: "/painel/tipos-veiculo", label: "Tipos de veículo", Icone: CarFront },
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

function ativa(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
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
        stroke="#0E7C74"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PainelShell({
  children,
  userEmail,
  tenantNome,
  sincronizacoes,
  assinaturaAlerta = false,
  sair,
}: {
  children: React.ReactNode;
  userEmail: string;
  tenantNome: string;
  sincronizacoes: Record<string, string>;
  assinaturaAlerta?: boolean;
  sair: () => void;
}) {
  const pathname = usePathname();
  const alerta = (label: string) => label === "Assinatura" && assinaturaAlerta;

  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

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

  // ── Hoverslider: descansa no item ATIVO e desliza pro item sob o cursor ──
  const navRef = useRef<HTMLDivElement>(null);
  const [slider, setSlider] = useState({ top: 0, height: 40, show: false });
  const posEm = (el: HTMLElement | null) => {
    const nav = navRef.current;
    if (!nav || !el) return;
    const r = el.getBoundingClientRect();
    const nr = nav.getBoundingClientRect();
    setSlider({ top: r.top - nr.top + nav.scrollTop, height: r.height, show: true });
  };
  const resetSlider = () => {
    const alvo = navRef.current?.querySelector<HTMLElement>('[data-slidertarget="true"]');
    if (alvo) posEm(alvo);
    else setSlider((s) => ({ ...s, show: false }));
  };
  // Reposiciona no item ativo quando a rota/abertura muda.
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
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        {/* Marca + recolher */}
        <div className="navitem" style={{ gap: 10, padding: "2px 6px 12px" }}>
          <div
            className="grid place-items-center shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: "linear-gradient(135deg,#0E7C74,#2DD4BF)",
              boxShadow: "0 8px 20px -8px rgba(14,124,116,.45)",
            }}
          >
            <Logo />
          </div>
          <span
            className="lbl brand"
            style={{
              fontFamily: "'Libre Franklin', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: "#fff",
              letterSpacing: "-.01em",
            }}
          >
            NuvemPark
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
                  data-slidertarget={act}
                  onMouseEnter={(e) => posEm(e.currentTarget)}
                  style={{
                    gap: 12,
                    padding: "11px 12px",
                    borderRadius: 13,
                    color: act ? "#fff" : "rgba(255,255,255,.72)",
                    fontWeight: act ? 700 : 500,
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
                  data-slidertarget={gAtivo && !aberto}
                  onMouseEnter={(e) => posEm(e.currentTarget)}
                  onClick={() =>
                    setAbertos((a) => ({
                      ...a,
                      [item.label]: !(item.label in a ? a[item.label] : gAtivo),
                    }))
                  }
                  style={{
                    gap: 12,
                    padding: "11px 12px",
                    borderRadius: 13,
                    cursor: "pointer",
                    color: gAtivo ? "#fff" : "rgba(255,255,255,.72)",
                    fontWeight: gAtivo ? 700 : 500,
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
                          data-slidertarget={act}
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
        <div
          className="hidec"
          style={{
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "12px 14px",
            borderRadius: 14,
            background: online ? "rgba(45,212,191,.12)" : "rgba(239,68,68,.12)",
            border: `1px solid ${online ? "rgba(45,212,191,.28)" : "rgba(239,68,68,.28)"}`,
          }}
        >
          <span className="relative flex shrink-0" style={{ width: 9, height: 9 }}>
            {online && (
              <span
                className="absolute animate-ping-slow"
                style={{ width: "100%", height: "100%", borderRadius: 999, background: "#2DD4BF" }}
              />
            )}
            <span
              className="relative"
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: online ? "#2DD4BF" : "#EF4444",
              }}
            />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
              {online ? "App conectado" : "App offline"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>
              {ultimaSync ? `Atualizado ${dataHora.format(new Date(ultimaSync))}` : "Nunca sincronizou"}
            </div>
          </div>
        </div>

        {/* Conta */}
        <div style={{ paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <Link
            href="/painel/perfil"
            className="navitem"
            style={{ gap: 11, padding: "6px 6px", borderRadius: 12 }}
          >
            <span
              className="grid place-items-center shrink-0"
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                background: "linear-gradient(135deg,#14B8A6,#0EA5E9)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {inicial}
            </span>
            <span className="lbl" style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: 13,
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
                  fontSize: 11,
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
                background: "linear-gradient(135deg,#0E7C74,#14B8A6)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 12px 26px -8px rgba(14,124,116,.6)",
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
              fontFamily: "'IBM Plex Sans', sans-serif",
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
                    background: "linear-gradient(135deg,#0E7C74,#2DD4BF)",
                    boxShadow: "0 8px 20px -8px rgba(14,124,116,.45)",
                  }}
                >
                  <Logo />
                </div>
                <span style={{ fontFamily: "'Libre Franklin', sans-serif", fontWeight: 700, fontSize: 17 }}>
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
                        background: act ? "rgba(14,124,116,.12)" : "transparent",
                        color: act ? "#0E7C74" : "#1F2A33",
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
                        background: gAtivo && !aberto ? "rgba(14,124,116,.1)" : "transparent",
                        color: gAtivo ? "#0E7C74" : "#1F2A33",
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
                                color: act ? "#0E7C74" : "#46545E",
                                background: act ? "#E6F4F2" : "transparent",
                              }}
                            >
                              <f.Icone
                                className="w-4 h-4 shrink-0"
                                style={{ color: act ? "#0E7C74" : "#8695A0" }}
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
                    background: "linear-gradient(135deg,#14B8A6,#0EA5E9)",
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
