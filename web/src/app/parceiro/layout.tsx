import Link from "next/link";
import { Ticket, History, LogOut, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sairParceiro } from "./login/actions";
import { ToastProvider } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

export default async function ParceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A tela de login usa este layout e não tem sessão. Sem o `user`, renderiza
  // só o conteúdo — sem cabeçalho, que ali não teria o que mostrar.
  if (!user) return <ToastProvider>{children}</ToastProvider>;

  // RLS de db/33: o parceiro só enxerga a si mesmo, então o `select` sem filtro
  // devolve exatamente a linha dele.
  const [{ data: parceiro }, { data: cota }] = await Promise.all([
    supabase.from("parceiros").select("nome").maybeSingle(),
    supabase.rpc("consumo_cota_parceiro"),
  ]);

  const consumo = Array.isArray(cota) ? cota[0] : null;

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-fundo">
        <header className="sticky top-0 z-30 bg-superficie/90 backdrop-blur border-b border-borda">
          <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-3">
            <Link href="/parceiro" className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 grid place-items-center shrink-0">
                <Ticket className="w-4 h-4 text-white" />
              </span>
              <span className="font-extrabold text-texto truncate">
                {parceiro?.nome ?? "Parceiro"}
              </span>
            </Link>

            <div className="flex-1" />

            {/* O consumo fica no cabeçalho de propósito: é a informação que
                decide se o balconista pode liberar, e ele precisa dela ANTES
                de procurar a placa, não depois de tentar. */}
            {consumo?.limite_quantidade != null && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  consumo.usadas >= consumo.limite_quantidade
                    ? "bg-perigo/10 text-perigo"
                    : "bg-fundo text-texto-2"
                }`}
              >
                {consumo.usadas}/{consumo.limite_quantidade}
              </span>
            )}

            <Link
              href="/parceiro/historico"
              className="w-9 h-9 grid place-items-center rounded-xl text-texto-2 hover:bg-fundo"
              title="Histórico"
            >
              <History className="w-4 h-4" />
            </Link>

            <form action={sairParceiro}>
              <button
                type="submit"
                className="w-9 h-9 grid place-items-center rounded-xl text-texto-2 hover:bg-fundo"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>

        <nav className="sticky bottom-0 bg-superficie/90 backdrop-blur border-t border-borda sm:hidden">
          <div className="mx-auto max-w-2xl px-4 h-14 grid grid-cols-2">
            <Link
              href="/parceiro"
              className="flex items-center justify-center gap-2 text-sm font-bold text-texto-2"
            >
              <Search className="w-4 h-4" /> Buscar
            </Link>
            <Link
              href="/parceiro/historico"
              className="flex items-center justify-center gap-2 text-sm font-bold text-texto-2"
            >
              <History className="w-4 h-4" /> Histórico
            </Link>
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
}
