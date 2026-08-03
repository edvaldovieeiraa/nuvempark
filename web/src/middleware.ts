import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ── Separação de domínios ────────────────────────────────────────────────────
// dashboard.nuvempark.com = painel (app)  ·  nuvempark.com = site institucional.
// Um único app Next serve os dois; o roteamento acontece aqui pelo Host.
// Prefixos que pertencem ao APP (só no host dashboard):
// `/recibo` mora aqui (e não sob /painel) por dois motivos: fora do layout do
// painel ele imprime sem a sidebar, e fora do gate de assinatura um cliente
// suspenso ainda consegue baixar o comprovante do que já pagou — que é
// exatamente quando ele precisa dele.
const PREFIXOS_APP = ["/painel", "/master", "/login", "/cadastro", "/auth", "/recibo"];
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
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;
  const ehMaster = pathname === "/master" || pathname.startsWith("/master/");

  // 0) Master é EXCLUSIVO do host painel.nuvempark.com: /master em qualquer
  // outro host vai pra lá. Só em produção (separação de domínios ativa); em dev
  // local, sem os hosts configurados, fica inerte e /master funciona normal.
  if (HOST_APP && HOST_SITE && host !== HOST_MASTER && ehMaster) {
    return NextResponse.redirect(`https://${HOST_MASTER}${pathname}${search}`);
  }

  // 0.1) Separação de domínios (painel vs site).
  const desvio = redirecionaPorHost(request);
  if (desvio) return desvio;

  // 0.2) No host do master, tudo que não é /master vai para o console (que
  // manda pro /master/login se não houver sessão mestra).
  if (host === HOST_MASTER && !ehMaster) {
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

/**
 * Escopo do middleware — só quais rotas ele PROCESSA. A lógica de autorização
 * (gate de sessão do /painel, senha mestra do /master) está na função acima e
 * não muda: nada que exija sessão sai desta lista.
 *
 * O que sai daqui e por quê:
 * - `_next/static`, `_next/image` e qualquer arquivo com extensão de imagem
 *   (inclui `/og-image.png`, `/icon.png`, `/apple-icon.png`) — assets públicos.
 *   Um crawler de rede social que recebe 307 numa og:image simplesmente desiste
 *   e mostra o cartão sem miniatura.
 * - `robots.txt` e `sitemap.xml` — arquivos de bot. Passavam por aqui e faziam
 *   um `supabase.auth.getUser()` (round-trip de rede) a cada visita de crawler,
 *   sem nenhum efeito útil.
 * - `blog/<slug>/og` — a imagem social gerada por post. É rota de IMAGEM sem
 *   extensão no caminho, então era a única que continuava caindo no middleware.
 * - `opengraph-image` / `twitter-image` / `icon` / `apple-icon` — convenções de
 *   arquivo do Next. Hoje não usamos as três primeiras (a social do site é o
 *   PNG estático), mas se alguém adicionar um `opengraph-image.tsx` amanhã ele
 *   já nasce fora do middleware — que é onde precisa estar.
 * - `fonts/` e qualquer .woff2/.woff/.ttf/.otf — CRÍTICO, e estava quebrado.
 *   Fonte NÃO é um asset qualquer: o navegador sempre a busca em modo CORS.
 *   Como `/fonts/x.woff2` não é rota de app, no host do painel o
 *   `redirecionaPorHost` mandava um 307 para nuvempark.com — outra origem, sem
 *   `Access-Control-Allow-Origin` — e o carregamento MORRIA. Resultado:
 *   /cadastro, /login e todo o /painel renderizavam na fonte do sistema, em
 *   silêncio (`document.fonts` acusava status "error"). Servindo do próprio
 *   host o problema some, sem precisar de header de CORS em lugar nenhum.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|opengraph-image|twitter-image|apple-icon|icon|fonts/|blog/[^/]+/og$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|woff2|woff|ttf|otf)$).*)',
  ],
};
