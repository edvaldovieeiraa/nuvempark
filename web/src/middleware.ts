import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ── Separação de domínios ────────────────────────────────────────────────────
// dashboard.nuvempark.com = painel (app)  ·  nuvempark.com = site institucional.
// Um único app Next serve os dois; o roteamento acontece aqui pelo Host.
// Prefixos que pertencem ao APP (só no host dashboard):
const PREFIXOS_APP = ["/painel", "/master", "/login", "/cadastro", "/auth"];
// Config vem de env: só ativa a separação quando AMBOS os hosts existem.
// Enquanto o DNS/nginx do dashboard não estão prontos, fica passivo (não quebra).
const HOST_APP = process.env.NEXT_PUBLIC_APP_HOST || ""; // ex.: dashboard.nuvempark.com
const HOST_SITE = process.env.NEXT_PUBLIC_SITE_HOST || ""; // ex.: nuvempark.com

// Subdomínio dedicado do console master. Neste host o app serve SÓ /master:
// qualquer outro caminho vai para o console, que por sua vez manda pro
// /master/login se não houver sessão mestra. Inerte nos demais hosts.
const HOST_MASTER = process.env.NEXT_PUBLIC_MASTER_HOST || "painel.nuvempark.com";

function ehRotaApp(pathname: string) {
  return PREFIXOS_APP.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/** Redireciona painel↔site pro host correto. null = nada a fazer. */
function redirecionaPorHost(request: NextRequest): NextResponse | null {
  if (!HOST_APP || !HOST_SITE) return null; // separação desligada
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  // Ignora hosts que não são os dois oficiais (localhost, IP, preview).
  if (host !== HOST_APP && host !== HOST_SITE) return null;

  const { pathname, search } = request.nextUrl;
  const rotaApp = ehRotaApp(pathname);

  // rota de app fora do host de app → manda pro dashboard
  if (rotaApp && host !== HOST_APP) {
    return NextResponse.redirect(`https://${HOST_APP}${pathname}${search}`);
  }
  // rota de site no host de app → manda pro site
  if (!rotaApp && host === HOST_APP) {
    return NextResponse.redirect(`https://${HOST_SITE}${pathname}${search}`);
  }
  return null;
}

/** Renova a sessão do gestor e protege as rotas do painel. */
export async function middleware(request: NextRequest) {
  // 0) Separação de domínios (painel vs site) antes de tudo.
  const desvio = redirecionaPorHost(request);
  if (desvio) return desvio;

  // 0.1) Host dedicado do master: painel.nuvempark.com abre só o console.
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (
    host === HOST_MASTER &&
    !request.nextUrl.pathname.startsWith("/master")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/master";
    return NextResponse.redirect(url);
  }

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
