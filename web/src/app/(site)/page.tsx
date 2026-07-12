import { Hero } from "@/components/site/hero";
import {
  Numeros,
  Recursos,
  ComoFunciona,
  RoadmapTeaser,
  Precos,
  CtaFinal,
} from "@/components/site/secoes";

export const metadata = {
  title: "NuvemPark — Gestão de estacionamento na nuvem",
  description:
    "Plataforma completa para gerir estacionamentos: app offline-first, cobrança automática, leitura de placa, impressão Bluetooth e painel em tempo real de toda a sua rede.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Numeros />
      <Recursos resumido />
      <ComoFunciona />
      <RoadmapTeaser />
      <Precos />
      <CtaFinal />
    </>
  );
}
