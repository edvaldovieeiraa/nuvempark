import Link from "next/link";
import { resolverPatio } from "@/lib/patio-scope";
import { NovoOperadorForm } from "@/components/operadores/novo-operador-form";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function NovoOperadorPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <Link
          href={`/painel/operadores?patio=${patioId}`}
          style={{
            fontSize: 12,
            color: "#6B7280",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            textDecoration: "none",
          }}
        >
          ‹ Operadores
        </Link>
        <h2
          style={{
            margin: "2px 0 0",
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "-.02em",
          }}
        >
          Novo operador
        </h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          <b style={{ color: "#1F2937" }}>{patioNome}</b> · a conta que acessa o
          app no pátio.
        </div>
      </header>
      <NovoOperadorForm patioId={patioId} />
    </div>
  );
}
