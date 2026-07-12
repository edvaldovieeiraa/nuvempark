import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { SemPatio } from "@/components/sem-patio";
import { PrestacaoClient } from "@/components/prestacao/prestacao-client";
import { listarOperadores } from "./actions";

export const dynamic = "force-dynamic";

export default async function PrestacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const [{ data: userData }, operadores] = await Promise.all([
    supabase.auth.getUser(),
    listarOperadores(patioId),
  ]);

  return (
    <PrestacaoClient
      patioId={patioId}
      patioNome={patioNome ?? ""}
      geradoPor={userData.user?.email ?? "gestor"}
      operadores={operadores}
    />
  );
}
