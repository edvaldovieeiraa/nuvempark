import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ultimaSincronizacaoPorPatio } from "@/lib/patio-scope";
import { SidebarNav } from "@/components/sidebar-nav";
import { PatioSeletor } from "@/components/patio-seletor";
import { TelaBloqueio } from "@/components/painel-bloqueio";
import { Marca } from "@/components/marca";
import { AppShell } from "@/components/app-shell";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: tenant },
    { data: patios },
    { data: assinatura },
    { count: faturasVencidas },
  ] = await Promise.all([
    supabase.from("tenants").select("nome, codigo").single(),
    supabase
      .from("patios")
      .select("id, nome, codigo_acesso")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("assinaturas").select("estado, trial_expira_em").maybeSingle(),
    supabase
      .from("faturas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "vencida"),
  ]);

  // Badge de alerta no menu "Assinatura": fatura vencida OU assinatura pendente.
  const assinaturaAlerta =
    (faturasVencidas ?? 0) > 0 ||
    assinatura?.estado === "atrasada" ||
    assinatura?.estado === "suspensa";

  async function sair() {
    "use server";
    const sb = await createClient();
    await sb.auth.signOut();
    redirect("/login");
  }

  // GATE DE ASSINATURA (defesa em profundidade, além do middleware).
  const libera =
    assinatura?.estado === "ativa" ||
    (assinatura?.estado === "trial" &&
      !!assinatura.trial_expira_em &&
      new Date(assinatura.trial_expira_em).getTime() > Date.now());

  if (!libera) {
    return (
      <TelaBloqueio
        estado={assinatura?.estado ?? "sem-assinatura"}
        rede={tenant?.nome ?? "sua conta"}
        sair={sair}
      />
    );
  }

  const inicial = (user.email ?? "?").charAt(0).toUpperCase();

  // Só depois do gate de assinatura: quem está bloqueado não vê sidebar.
  const sincronizacoes = await ultimaSincronizacaoPorPatio(
    (patios ?? []).map((p) => p.id),
  );

  return (
    <AppShell
      asideClassName="bg-gradient-to-b from-noite via-noite-2 to-noite"
      titulo="Painel"
      sidebar={
        <>
          {/* brilho decorativo */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand-500/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 -left-20 w-52 h-52 rounded-full bg-acento/10 blur-3xl" />

          <div className="relative p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-acento-teal grid place-items-center shadow-[var(--shadow-brand)]">
              <Marca className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-white leading-tight tracking-tight">
                Nuvem<span className="text-brand-400">Park</span>
              </div>
              <div className="text-[11px] text-white/55 leading-tight">
                Painel do gestor
              </div>
            </div>
          </div>
        </div>

        {/* Seletor de pátio — cada pátio é um espaço nas telas por-pátio.
            A data de sync vai de TODOS os pátios: a sidebar é server component
            e não recebe searchParams, então quem escolhe a do ativo é o seletor. */}
        <Suspense fallback={<div className="mx-3 mb-2 h-14 rounded-xl bg-white/5" />}>
          <PatioSeletor
            patios={patios ?? []}
            sincronizacoes={sincronizacoes}
            patioIdAtivo={null}
          />
        </Suspense>

        <SidebarNav assinaturaAlerta={assinaturaAlerta} />

        <div className="relative p-3 border-t border-white/8">
          {/* Perfil: dados da conta e da rede moram lá */}
          <Link
            href="/painel/perfil"
            className="group flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white text-xs font-black shrink-0">
              {inicial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-white/60 group-hover:text-white truncate transition-colors">
                {user.email}
              </div>
              <div className="text-[10px] text-white/55 truncate">
                {tenant?.nome ?? "Minha conta"} · ver perfil
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
          </Link>
          <form action={sair} className="mt-1">
            <button className="w-full h-10 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all inline-flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
        </>
      }
    >
      {children}
    </AppShell>
  );
}

