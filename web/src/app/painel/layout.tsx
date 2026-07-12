import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";
import { PatioSeletor } from "@/components/patio-seletor";
import { TelaBloqueio } from "@/components/painel-bloqueio";

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

  const [{ data: tenant }, { data: patios }, { data: assinatura }] =
    await Promise.all([
      supabase.from("tenants").select("nome, codigo").single(),
      supabase
        .from("patios")
        .select("id, nome, codigo_acesso")
        .eq("ativo", true)
        .order("nome"),
      supabase.from("assinaturas").select("estado, trial_expira_em").maybeSingle(),
    ]);

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

  return (
    <div className="flex-1 flex">
      {/* Sidebar dark premium */}
      <aside className="w-64 shrink-0 bg-gradient-to-b from-noite via-noite-2 to-noite flex flex-col relative overflow-hidden">
        {/* brilho decorativo */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-20 w-52 h-52 rounded-full bg-acento/10 blur-3xl" />

        <div className="relative p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-acento-teal grid place-items-center shadow-[var(--shadow-brand)]">
              <CloudP />
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

        {/* Seletor de pátio — cada pátio é um espaço nas telas por-pátio */}
        <Suspense fallback={<div className="mx-3 mb-2 h-14 rounded-xl bg-white/5" />}>
          <PatioSeletor patios={patios ?? []} patioIdAtivo={null} />
        </Suspense>

        <SidebarNav />

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
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0 p-8 fundo-aurora">{children}</main>
    </div>
  );
}

function CloudP() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
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
