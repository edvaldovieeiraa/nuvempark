import type { Metadata } from "next";
import { urlSite } from "@/lib/urls";
import { APP_STORE, PLAY_STORE } from "@/lib/app-links";
import { SelosLojas } from "@/components/site/selos-lojas";
import { POPPINS } from "@/components/site/tokens";

/**
 * Link único do app: nuvempark.com/app. É o destino do QR code do onboarding e
 * da mensagem que o gestor manda ao operador — quem gera o link não sabe se ele
 * vai ser aberto num iPhone ou num Android.
 *
 * O desvio para a loja é feito por um script NA PÁGINA, não por redirect no
 * servidor: a Cloudflare guarda o HTML do site por 1 hora com o mesmo conteúdo
 * para todo mundo, e um 302 decidido pelo User-Agent ficaria em cache e
 * mandaria o próximo visitante para a loja errada. O HTML em cache é igual para
 * todos e cada navegador decide sozinho.
 *
 * No computador não há loja para onde ir: a página fica e mostra os dois selos.
 */
export const metadata: Metadata = {
  title: "Baixar o app NuvemPark",
  description:
    "Baixe o app NuvemPark do operador na Google Play (Android) ou na App Store (iPhone).",
  alternates: { canonical: urlSite("/app") },
  // Página de passagem: não tem conteúdo para disputar busca.
  robots: { index: false, follow: true },
};

const desvio = `(function(){try{
var ua=navigator.userAgent||"";
var ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
var android=/Android/i.test(ua);
var destino=ios?${JSON.stringify(APP_STORE.url)}:android?${JSON.stringify(PLAY_STORE.url)}:null;
if(destino){location.replace(destino);}
}catch(e){}})();`;

export default function BaixarAppPage() {
  return (
    <section
      style={{
        maxWidth: 640,
        margin: "0 auto",
        // 128px no topo: o header do site é `fixed`.
        padding: "128px 20px 96px",
        textAlign: "center",
        fontFamily: POPPINS,
      }}
    >
      <script dangerouslySetInnerHTML={{ __html: desvio }} />
      <h1 style={{ margin: 0, fontSize: "clamp(1.75rem,5vw,2.5rem)", fontWeight: 800, letterSpacing: "-.02em", color: "#1F2937" }}>
        Baixe o app NuvemPark
      </h1>
      <p style={{ margin: "16px auto 0", maxWidth: 480, fontSize: 17, lineHeight: 1.6, color: "#4B5563" }}>
        O app do operador está na loja oficial do celular. No Android, baixe pela
        Google Play; no iPhone, pela App Store. Depois é só entrar com o código
        do estacionamento, o usuário e a senha que o gestor passou.
      </p>
      <div style={{ marginTop: 32 }}>
        <SelosLojas altura={48} />
      </div>
    </section>
  );
}
