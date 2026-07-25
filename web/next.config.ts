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
