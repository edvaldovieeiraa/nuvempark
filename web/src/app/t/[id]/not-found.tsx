import { Marca } from "@/components/marca";

/**
 * 404 do ticket público. NEUTRA de propósito: não distingue "não existe" de
 * "já saiu" nem de "pátio suspenso". A api devolve o mesmo 404 para todos os
 * casos, e a página não pode desfazer isso — senão vira um oráculo de "este
 * ticket existe" para quem varre UUIDs.
 */
export default function TicketNaoEncontrado() {
  return (
    <main className="min-h-dvh bg-fundo text-texto grid place-items-center px-6">
      <div className="text-center max-w-sm">
        <span className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-500 to-acento-teal grid place-items-center shadow-[var(--shadow-brand)]">
          <Marca className="w-7 h-7" />
        </span>
        <h1 className="mt-5 text-xl font-black tracking-tight">
          Ticket não encontrado
        </h1>
        <p className="mt-2 text-sm text-texto-2">
          Confira o QR do seu cupom. Se o veículo já saiu do pátio, o ticket
          deixa de ficar disponível aqui.
        </p>
      </div>
    </main>
  );
}
