import type { NextConfig } from "next";

/**
 * Host do Storage do Supabase — de onde vêm as capas dos posts do blog.
 * Sai da mesma env que o cliente já usa; ausente (build sem .env), a lista fica
 * vazia e o `next/image` simplesmente não recebe nenhum host remoto liberado.
 */
function hostSupabase(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
}

const host = hostSupabase();

const nextConfig: NextConfig = {
  /**
   * As páginas que viraram seção da home.
   *
   * 301 (permanente) e não 302: a mudança é definitiva e queremos que o Google
   * transfira a autoridade das URLs antigas para a home, em vez de manter as
   * duas concorrendo. Elas estiveram indexadas — sumir com 404 jogaria fora o
   * histórico e daria 404 para quem tem link salvo.
   *
   * O fragmento (`#recursos`) fica no Location e o navegador rola sozinho. Ele
   * NÃO chega ao servidor, então nada aqui depende disso funcionar — se o
   * cliente ignorar a âncora, cai na home, que é o destino certo de qualquer
   * forma.
   */
  async redirects() {
    // `statusCode: 301` e não `permanent: true`: este último emite 308, que
    // preserva o método HTTP. Aqui só chega GET, e 301 é o que toda ferramenta
    // de SEO e todo crawler antigo entende sem hesitar.
    const p301 = (source: string, destination: string) => ({
      source,
      destination,
      statusCode: 301 as const,
    });
    return [
      p301("/recursos", "/#recursos"),
      p301("/precos", "/#precos"),
      p301("/novidades", "/#novidades"),
      p301("/sobre", "/#sobre"),
      p301("/contato", "/#contato"),
      // As versões .md deixaram de existir junto com as páginas. Sem isto elas
      // cairiam no 404 do app em vez de levar ao documento que as substitui.
      p301("/recursos.md", "/index.md"),
      p301("/precos.md", "/index.md"),
      p301("/novidades.md", "/index.md"),
      p301("/sobre.md", "/index.md"),
      p301("/contato.md", "/index.md"),
    ];
  },


  experimental: {
    serverActions: {
      // O padrão é 1 MB, e o upload de capa do blog (Server Action com
      // multipart) vai até 5 MB — o mesmo limite do bucket `blog-assets`.
      // 6 MB deixa folga para o overhead do multipart.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    // Só os arquivos públicos do Storage. `next/image` recusa qualquer outro
    // host — é o que impede uma capa apontando para fora de virar proxy de
    // otimização de imagem para terceiros.
    remotePatterns: host
      ? [
          {
            protocol: "https",
            hostname: host,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
