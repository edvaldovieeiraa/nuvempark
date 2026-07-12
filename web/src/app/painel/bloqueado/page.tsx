// A tela de bloqueio é renderizada pelo painel/layout.tsx quando a assinatura
// não libera acesso (defesa em profundidade). Se chegou até aqui liberado, o
// middleware/layout já redirecionou; este page é só o alvo da rota.
export const dynamic = "force-dynamic";

export default function BloqueadoPage() {
  return null;
}
