import { CadastroForm } from "@/components/cadastro-form";
import { GoogleAnalytics } from "@/components/site/google-analytics";

export const metadata = {
  title: "Criar conta grátis · NuvemPark",
  description: "15 dias grátis para gerir seu estacionamento na nuvem.",
};

export default function CadastroPage() {
  return (
    <>
      <CadastroForm />
      <GoogleAnalytics />
    </>
  );
}
