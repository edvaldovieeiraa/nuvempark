import { Hero } from "@/components/site/hero";
import {
  Numeros,
  Recursos,
  ComoFunciona,
  Roadmap,
  Precos,
  CtaFinal,
} from "@/components/site/secoes";
import { PixTicket } from "@/components/site/pix-ticket";
import { Avaria } from "@/components/site/avaria";
import { ProvaSocial } from "@/components/site/prova-social";
import { Faq } from "@/components/site/faq";
import { LandingStyle } from "@/components/site/landing-style";
import { POPPINS } from "@/components/site/tokens";

export const metadata = {
  title: "NuvemPark — Cada carro registrado. Cada real no seu bolso.",
  description:
    "Aposente o caderno e o sistema caro. Seus operadores registram tudo pelo celular — até sem internet — e você acompanha o faturamento ao vivo. 15 dias grátis, sem cartão.",
};

export default function HomePage() {
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
      <CtaFinal />
    </div>
  );
}
