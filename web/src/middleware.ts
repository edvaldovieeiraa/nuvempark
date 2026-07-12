import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Renova a sessão do gestor e protege as rotas do painel. */
export async function middleware(request: NextRequest) {
  // Rotas /master têm gate próprio (senha mestra) — não passam pelo auth do gestor.
  if (request.nextUrl.pathname.startsWith("/master")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith("/login");
  const isPainel = pathname === "/painel" || pathname.startsWith("/painel/");
  const isBloqueado = pathname === "/painel/bloqueado";

  // Só o painel do gestor exige sessão. A landing (/) e demais rotas são públicas.
  if (!user && isPainel) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  // Já logado tentando ver o login → manda pro painel.
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    return NextResponse.redirect(url);
  }

  // GATE DE ASSINATURA — regra de ouro: acesso só se 'ativa' ou trial vigente.
  // A /painel/bloqueado é sempre acessível (senão faz loop de redirect).
  if (user && isPainel && !isBloqueado) {
    const { data: assinatura } = await supabase
      .from("assinaturas")
      .select("estado, trial_expira_em")
      .maybeSingle(); // RLS garante que é a do próprio tenant

    const libera =
      assinatura?.estado === "ativa" ||
      (assinatura?.estado === "trial" &&
        !!assinatura.trial_expira_em &&
        new Date(assinatura.trial_expira_em).getTime() > Date.now());

    if (!libera) {
      const url = request.nextUrl.clone();
      url.pathname = "/painel/bloqueado";
      return NextResponse.redirect(url);
    }
  }

  // Se está liberado mas tenta abrir a tela de bloqueio, volta ao painel.
  if (user && isBloqueado) {
    const { data: assinatura } = await supabase
      .from("assinaturas")
      .select("estado, trial_expira_em")
      .maybeSingle();
    const libera =
      assinatura?.estado === "ativa" ||
      (assinatura?.estado === "trial" &&
        !!assinatura.trial_expira_em &&
        new Date(assinatura.trial_expira_em).getTime() > Date.now());
    if (libera) {
      const url = request.nextUrl.clone();
      url.pathname = "/painel";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
