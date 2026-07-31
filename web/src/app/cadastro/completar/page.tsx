import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompletarCadastroForm } from "@/components/completar-cadastro-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Complete seu cadastro · NuvemPark",
};

/**
 * Último passo de quem entrou pelo Google: nome do negócio + telefone.
 * Quem chega aqui já tem sessão mas ainda NÃO tem tenant — por isso a página
 * mora fora de /painel, que é justamente o que o gate de assinatura barra.
 */
export default async function CompletarCadastroPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect("/login");
  if ((user.app_metadata as { tenant_id?: string })?.tenant_id) redirect("/painel");

  const meta = user.user_metadata as {
    nome?: string;
    full_name?: string;
    name?: string;
  };

  return (
    <CompletarCadastroForm
      nomeSugerido={meta?.nome || meta?.full_name || meta?.name || ""}
      email={user.email ?? ""}
    />
  );
}
