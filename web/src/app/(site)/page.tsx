import { JsonLd } from "@/components/jsonld";
import { Hero } from "@/components/site/hero";
import {
  Numeros,
  Recursos,
  ComoFunciona,
  Roadmap,
  Precos,
  Sobre,
  Contato,
  CtaFinal,
} from "@/components/site/secoes";
import { PixTicket } from "@/components/site/pix-ticket";
import { Avaria } from "@/components/site/avaria";
import { ProvaSocial } from "@/components/site/prova-social";
import { FAQ_HOME, Faq } from "@/components/site/faq";
import { LandingStyle } from "@/components/site/landing-style";
import { POPPINS } from "@/components/site/tokens";
import { schemaFaq } from "@/lib/blog-seo";
import {
  schemaOrganizacaoSite,
  schemaSoftware,
  schemaWebSite,
} from "@/lib/site-seo";
import { SITE_URL } from "@/lib/urls";

/**
 * A home é a página de MARCA. O termo de categoria ("sistema para
 * estacionamento") é disputado pela página dedicada
 * `/sistema-para-estacionamento`, que trata só daquele assunto — duas páginas
 * do mesmo site competindo pela mesma consulta é o jeito mais fácil de as duas
 * ficarem em segundo lugar.
 *
 * Por isso o título continua sendo a promessa da marca, e a descrição é que
 * situa a categoria para quem lê o resultado da busca.
 */
export const metadata = {
  title: "NuvemPark — Cada carro registrado. Cada real no seu bolso.",
  description:
    "Sistema de estacionamento na nuvem, sem cancela e sem obra: sua equipe registra tudo pelo celular, até sem internet, e você vê o faturamento ao vivo. 15 dias grátis.",
  alternates: { canonical: SITE_URL },
};

export default function HomePage() {
  // Mesma lista que o acordeão renderiza — ver o comentário em `faq.tsx`.
  const faq = schemaFaq(FAQ_HOME);

  return (
    <div style={{ overflowX: "hidden", fontFamily: POPPINS }}>
      <LandingStyle />
      <Hero />
      <Numeros />
      <Recursos />
      <ComoFunciona />
      <PixTicket />
      <Avaria />
      <ProvaSocial />
      <Roadmap />
      <Precos />
      <Faq />
      <Sobre />
      <Contato />
      <CtaFinal />

      {/* ── Dados estruturados ──────────────────────────────────────────────
          A home não publicava nenhum. Sem isto o Google precisava inferir do
          HTML o que a NuvemPark é, o que vende e por quanto — e nada disso
          ficava disponível para o painel de conhecimento nem para os
          buscadores com IA, que leem JSON-LD antes de ler o texto.

          Os quatro blocos se referenciam por `@id` (organização ← site ←
          produto), então são lidos como uma entidade só descrita em partes,
          não como quatro coisas soltas. */}
      <JsonLd dados={schemaOrganizacaoSite()} />
      <JsonLd dados={schemaWebSite()} />
      <JsonLd dados={schemaSoftware()} />
      {faq ? <JsonLd dados={faq} /> : null}
    </div>
  );
}
