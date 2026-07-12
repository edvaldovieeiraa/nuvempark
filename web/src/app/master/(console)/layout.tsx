import { redirect } from "next/navigation";
import { sessaoMasterAtiva, fecharSessaoMaster } from "@/lib/master-auth";
import { MasterNav } from "@/components/master/master-nav";
import { LogOut, ShieldCheck } from "lucide-react";

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await sessaoMasterAtiva())) redirect("/master/login");

  async function sair() {
    "use server";
    await fecharSessaoMaster();
    redirect("/master/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 bg-noite flex flex-col relative overflow-hidden h-screen sticky top-0">
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand-500/15 blur-3xl" />

        <div className="relative p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-acento grid place-items-center shadow-[var(--shadow-brand)]">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-white leading-tight tracking-tight">
                Nuvem<span className="text-brand-400">Park</span>
              </div>
              <div className="text-[11px] text-white/40 leading-tight font-bold uppercase tracking-wider">
                Console Master
              </div>
            </div>
          </div>
        </div>

        <MasterNav />

        <div className="relative p-3 border-t border-white/8">
          <form action={sair}>
            <button className="w-full h-10 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all inline-flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
              Encerrar sessão
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-8 fundo-aurora">{children}</main>
    </div>
  );
}
