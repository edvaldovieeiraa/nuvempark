import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/secoes";
import { GoogleAnalytics } from "@/components/site/google-analytics";

/**
 * Toda página do site revalida em 1 hora.
 *
 * ⚠️ Isto NÃO é sobre frescor de conteúdo — é sobre o cache de borda. Sem
 * `revalidate`, uma página estática do Next responde `s-maxage=31536000`, e a
 * Cloudflare na nossa frente guarda o HTML por UM ANO. A Cache Rule deveria
 * fixar o TTL em 1 hora, mas na prática ela vem respeitando a origem: em
 * 11/08/2026 a home estava sendo servida com `age` de 8 DIAS — HTML anterior ao
 * deploy do silo, sem o `<link rel="canonical">`. O Google leu justamente essa
 * cópia e abriu "Cópia sem página canônica selecionada pelo usuário" no Search
 * Console (ver SEO.md 9.2 e DEPLOY-PRODUCAO.md 5.2).
 *
 * Com 1 hora aqui, a origem passa a mandar `s-maxage=3600` e a borda não
 * consegue congelar, mesmo que a regra da Cloudflare esteja errada.
 *
 * O menor `revalidate` da árvore vence: as rotas do blog que declaram 300
 * continuam em 5 minutos.
 */
export const revalidate = 3600;

/** Layout do site institucional: header + footer em todas as páginas. */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <GoogleAnalytics />
    </>
  );
}
