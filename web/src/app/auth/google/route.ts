import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Retorno do login com Google (OAuth/PKCE).
 *
 * Rota SEPARADA do `/auth/callback` de propósito: aquele confirma e-mail e lê
 * os tokens do FRAGMENTO (`#access_token=…`), que nem chega ao servidor; o
 * OAuth volta com `?code=` e precisa ser trocado por sessão aqui, no servidor,
 * onde está o cookie com o code verifier. (Também não caberia no mesmo
 * segmento: o Next proíbe `route.ts` e `page.tsx` na mesma rota.)
 *
 * Depois da troca, decide para onde mandar o usuário:
 *   já tem tenant           → /painel
 *   e-mail casa com conta   → vincula o tenant e vai pro /painel
 *   ninguém conhece         → /cadastro/completar (nome do negócio + telefone)
 */
export const dynamic = "force-dynamic";

function paraLogin(origin: string, erro: string) {
  return NextResponse.redirect(new URL(`/login?erro=${erro}`, origin));
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // O Google/Supabase devolve erro na query quando o usuário cancela ou o
  // provider recusa (`access_denied`, `server_error`…).
  if (searchParams.get("error") || searchParams.get("error_description")) {
    return paraLogin(origin, "google");
  }

  const code = searchParams.get("code");
  if (!code) return paraLogin(origin, "google");

  const sb = await createClient();
  const { error: erroTroca } = await sb.auth.exchangeCodeForSession(code);
  if (erroTroca) return paraLogin(origin, "google");

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return paraLogin(origin, "google");

  const tenantAtual = (user.app_metadata as { tenant_id?: string })?.tenant_id;
  if (tenantAtual) return NextResponse.redirect(new URL("/painel", origin));

  // Sem tenant: ou é uma conta antiga entrando pelo Google pela primeira vez,
  // ou é gente nova. Só aceitamos casar por e-mail se o provedor VERIFICOU
  // esse e-mail — casar por e-mail não verificado é caminho de account takeover.
  const identidadeGoogle = user.identities?.find((i) => i.provider === "google");
  const emailVerificado =
    identidadeGoogle?.identity_data?.email_verified === true ||
    user.user_metadata?.email_verified === true;
  const email = user.email?.toLowerCase() ?? "";

  if (email && emailVerificado) {
    const admin = createAdminClient();
    const { data: assinatura } = await admin
      .from("assinaturas")
      .select("tenant_id")
      .eq("email_cobranca", email)
      .maybeSingle();

    if (assinatura?.tenant_id) {
      const { error: erroVinculo } = await admin.auth.admin.updateUserById(
        user.id,
        { app_metadata: { tenant_id: assinatura.tenant_id } },
      );
      if (erroVinculo) return paraLogin(origin, "google");

      // O `app_metadata` só entra no JWT no próximo token. Sem este refresh o
      // middleware ainda leria uma sessão sem tenant e mandaria pro bloqueado.
      await sb.auth.refreshSession();
      return NextResponse.redirect(new URL("/painel", origin));
    }
  }

  return NextResponse.redirect(new URL("/cadastro/completar", origin));
}
