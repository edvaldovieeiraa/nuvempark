/**
 * Estado de carregamento de TODO o console master.
 *
 * Por que existe: todas as páginas de `/master` são `force-dynamic` e montam a
 * resposta inteira no servidor antes do primeiro byte. Sem um limite de
 * Suspense, clicar num item da barra lateral não mudava nada na tela até o
 * servidor terminar — a aba nem ficava ativa. Uma página de 800ms parecia
 * travada, e era esse o sintoma relatado ("as abas demoram para carregar").
 *
 * Com este arquivo o App Router troca a área de conteúdo por este esqueleto
 * IMEDIATAMENTE (ele é pré-buscado junto com o link), mantém a barra lateral
 * viva e interativa, e faz o streaming do conteúdo real por cima quando fica
 * pronto. Não deixa nada mais rápido — deixa honesto, que é o que faltava.
 *
 * Vale para as rotas filhas também (financeiro/faturas, assinaturas/[tenantId],
 * blog/…): o limite mais próximo é este até que alguma delas declare o seu.
 *
 * A forma imita o miolo comum das telas — cabeçalho, faixa de KPIs, bloco
 * grande — em vez de um spinner centralizado. Um esqueleto com a silhueta certa
 * some sem solavanco quando o conteúdo chega; um spinner sempre dá um pulo.
 */
export default function CarregandoConsole() {
  return (
    <div className="space-y-6 max-w-6xl" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>

      {/* Cabeçalho: título + linha de apoio */}
      <div className="space-y-2">
        <Bloco className="h-8 w-64" />
        <Bloco className="h-4 w-96 max-w-full" />
      </div>

      {/* Faixa de KPIs — 4 cards, como em /master e /master/financeiro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Cartao key={i}>
            <div className="flex items-center justify-between">
              <Bloco className="h-3 w-20" />
              <Bloco className="h-8 w-8 rounded-lg" />
            </div>
            <Bloco className="mt-3 h-7 w-28" />
            <Bloco className="mt-2 h-3 w-16" />
          </Cartao>
        ))}
      </div>

      {/* Bloco grande: tabela/lista das telas de gestão */}
      <Cartao>
        <div className="flex items-center justify-between">
          <Bloco className="h-4 w-40" />
          <Bloco className="h-9 w-32 rounded-xl" />
        </div>
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Bloco className="h-10 w-10 rounded-xl shrink-0" />
              <Bloco className="h-4 flex-1" />
              <Bloco className="h-4 w-20 shrink-0 hidden sm:block" />
              <Bloco className="h-4 w-24 shrink-0 hidden md:block" />
            </div>
          ))}
        </div>
      </Cartao>
    </div>
  );
}

function Cartao({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5 h-full">
      {children}
    </div>
  );
}

/** Retângulo cinza pulsante. `animate-pulse` do Tailwind, sem CSS próprio. */
function Bloco({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-fundo ${className}`} />;
}
