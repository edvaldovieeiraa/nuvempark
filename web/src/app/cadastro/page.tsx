import { CadastroForm } from "@/components/cadastro-form";
import { GoogleAnalytics } from "@/components/site/google-analytics";
import { OrigemPrimeiroToque } from "@/components/site/origem-primeiro-toque";

export const metadata = {
  title: "Criar conta grátis · NuvemPark",
  description: "15 dias grátis para gerir seu estacionamento na nuvem.",
};

export default function CadastroPage() {
  return (
    <>
      <CadastroForm />
      <GoogleAnalytics />
      {/* quem chega por anúncio pode cair direto aqui, sem passar pelo site */}
      <OrigemPrimeiroToque />
    </>
  );
}
