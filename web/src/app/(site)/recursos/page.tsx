import { PageHero } from "@/components/site/page-hero";
import { Recursos, ComoFunciona, CtaFinal } from "@/components/site/secoes";

export const metadata = {
  title: "Recursos — NuvemPark",
  description:
    "Conheça tudo que o NuvemPark oferece: app offline-first, leitura de placa, cobrança automática, impressão Bluetooth, painel em tempo real e mais.",
};

export default function RecursosPage() {
  return (
    <>
      <PageHero
        chip="Recursos"
        titulo={
          <>
            Tudo que acontece no pátio,
            <br className="hidden sm:block" />{" "}
            <span className="texto-brand-gradiente">sob o seu controle</span>
          </>
        }
        descricao="O operador trabalha mais rápido com o app. Você enxerga cada movimento pelo painel. E o dinheiro para de escapar pelas frestas."
      />
      <Recursos />
      <ComoFunciona />
      <CtaFinal />
    </>
  );
}
