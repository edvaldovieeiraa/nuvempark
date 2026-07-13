import Link from "next/link";
import { ParkingSquare } from "lucide-react";

/** Estado exibido quando a rede ainda não tem nenhum pátio ativo. */
export function SemPatio() {
  return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <span className="w-14 h-14 rounded-2xl bg-brand-50 grid place-items-center mx-auto">
        <ParkingSquare className="w-7 h-7 text-brand-600" />
      </span>
      <h1 className="mt-4 text-xl font-black tracking-tight">
        Nenhum pátio ainda
      </h1>
      <p className="mt-1.5 text-sm text-texto-2">
        Configure o primeiro pátio da sua rede — o assistente te guia em 4
        passos rápidos: pátio, tabela de preço, ticket e operador do app.
      </p>
      <Link
        href="/painel"
        className="inline-flex items-center gap-2 mt-5 h-11 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
      >
        Configurar meu pátio
      </Link>
    </div>
  );
}
