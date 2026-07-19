import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ultimaSincronizacaoPorPatio } from "@/lib/patio-scope";
import { TelaBloqueio } from "@/components/painel-bloqueio";
import { PainelShell } from "@/components/painel-shell";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: tenant },
    { data: patios },
    { data: assinatura },
    { count: faturasVencidas },
  ] = await Promise.all([
    supabase.from("tenants").select("nome, codigo").single(),
    supabase
      .from("patios")
      .select("id, nome, codigo_acesso")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("assinaturas").select("estado, trial_expira_em").maybeSingle(),
    supabase
      .from("faturas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "vencida"),
  ]);

  // Badge de alerta no menu "Assinatura": fatura vencida OU assinatura pendente.
  const assinaturaAlerta =
    (faturasVencidas ?? 0) > 0 ||
    assinatura?.estado === "atrasada" ||
    assinatura?.estado === "suspensa";

  async function sair() {
    "use server";
    const sb = await createClient();
    await sb.auth.signOut();
    redirect("/login");
  }

  // GATE DE ASSINATURA (defesa em profundidade, além do middleware).
  const libera =
    assinatura?.estado === "ativa" ||
    (assinatura?.estado === "trial" &&
      !!assinatura.trial_expira_em &&
      new Date(assinatura.trial_expira_em).getTime() > Date.now());

  if (!libera) {
    return (
      <TelaBloqueio
        estado={assinatura?.estado ?? "sem-assinatura"}
        rede={tenant?.nome ?? "sua conta"}
        sair={sair}
      />
    );
  }

  // Só depois do gate de assinatura: quem está bloqueado não vê sidebar.
  const sincronizacoes = await ultimaSincronizacaoPorPatio(
    (patios ?? []).map((p) => p.id),
  );

  return (
    <PainelShell
      userEmail={user.email ?? ""}
      tenantNome={tenant?.nome ?? "Minha conta"}
      sincronizacoes={sincronizacoes}
      assinaturaAlerta={assinaturaAlerta}
      sair={sair}
    >
      {children}
    </PainelShell>
  );
}

