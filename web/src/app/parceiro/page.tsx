import { BuscaParceiro } from "@/components/vouchers/busca-parceiro";

export const dynamic = "force-dynamic";

export default async function ParceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  // `?codigo=` chega do scanner: a página resolve sozinha e mostra o ticket.
  const { codigo } = await searchParams;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-texto">Liberar ticket</h1>
        <p className="text-sm text-texto-2 mt-0.5">
          Busque pela placa do cliente ou leia o QR do cupom.
        </p>
      </div>
      <BuscaParceiro codigoInicial={codigo} />
    </div>
  );
}
