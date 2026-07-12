import { Lock, LogOut, CreditCard, MessageCircle } from "lucide-react";

const MENSAGENS: Record<string, { titulo: string; texto: string }> = {
  trial: {
    titulo: "Seu teste grátis chegou ao fim",
    texto:
      "Esperamos que tenha gostado! Para continuar usando o NuvemPark e manter seus dados e operação ativos, é só ativar sua assinatura.",
  },
  atrasada: {
    titulo: "Pagamento pendente",
    texto:
      "Identificamos uma fatura em aberto. Regularize o pagamento para reativar o acesso ao painel e ao app dos operadores.",
  },
  suspensa: {
    titulo: "Acesso suspenso",
    texto:
      "Sua conta está temporariamente suspensa. Entre em contato para regularizar e reativar o acesso.",
  },
  cancelada: {
    titulo: "Assinatura cancelada",
    texto:
      "Sua assinatura foi cancelada. Quer voltar? Fale com a gente para reativar sua conta.",
  },
  "sem-assinatura": {
    titulo: "Conta sem assinatura ativa",
    texto:
      "Não encontramos uma assinatura ativa para sua conta. Fale com o suporte para regularizar.",
  },
};

const WHATS = "5581996142120"; // suporte NuvemPark

export function TelaBloqueio({
  estado,
  rede,
  sair,
}: {
  estado: string;
  rede: string;
  sair: () => Promise<void>;
}) {
  const m = MENSAGENS[estado] ?? MENSAGENS["sem-assinatura"];

  return (
    <main className="flex-1 flex items-center justify-center p-6 fundo-aurora relative overflow-hidden">
      <div className="pointer-events-none absolute top-[10%] left-[10%] w-72 h-72 rounded-full bg-perigo/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[8%] right-[8%] w-80 h-80 rounded-full bg-acento/10 blur-3xl" />

      <div className="w-full max-w-lg relative bg-superficie/85 backdrop-blur-xl border border-borda rounded-3xl p-8 shadow-[var(--shadow-card-hover)] text-center">
        <div className="w-16 h-16 rounded-2xl bg-aviso-bg grid place-items-center mx-auto">
          <Lock className="w-8 h-8 text-aviso" />
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight">{m.titulo}</h1>
        <p className="mt-2 text-sm text-texto-2 leading-relaxed max-w-md mx-auto">
          {m.texto}
        </p>

        <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-texto-3 bg-fundo border border-borda rounded-full px-3 py-1.5">
          Conta: <span className="text-texto">{rede}</span>
        </div>

        {/* Planos / valor */}
        <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50/60 p-5 text-left">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-brand-800">
              Plano NuvemPark
            </span>
            <span className="text-2xl font-black text-brand-700">
              R$ 199
              <span className="text-sm font-bold text-texto-3">/pátio/mês</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-texto-2">
            Todos os recursos, pátios ilimitados, suporte incluso.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <a
            href={`https://wa.me/${WHATS}?text=${encodeURIComponent(
              `Olá! Quero ativar minha assinatura do NuvemPark (conta: ${rede}).`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4.5 h-4.5" />
            Ativar minha assinatura
          </a>
          <a
            href={`https://wa.me/${WHATS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-xl border border-borda bg-superficie text-texto-2 font-bold hover:border-brand-300 hover:text-brand-700 transition-all inline-flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com o suporte
          </a>
        </div>

        <form action={sair} className="mt-4">
          <button className="text-sm font-semibold text-texto-3 hover:text-texto inline-flex items-center gap-1.5">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
