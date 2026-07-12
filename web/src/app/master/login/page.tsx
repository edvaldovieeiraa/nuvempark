import { redirect } from "next/navigation";
import {
  senhaMestraCorreta,
  abrirSessaoMaster,
  sessaoMasterAtiva,
} from "@/lib/master-auth";
import { MasterLoginForm } from "@/components/master/master-login-form";

export const dynamic = "force-dynamic";

export default async function MasterLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await sessaoMasterAtiva()) redirect("/master");
  const { erro } = await searchParams;

  async function entrar(formData: FormData) {
    "use server";
    const senha = String(formData.get("senha") || "");
    if (!senhaMestraCorreta(senha)) {
      redirect("/master/login?erro=1");
    }
    await abrirSessaoMaster();
    redirect("/master");
  }

  return <MasterLoginForm entrar={entrar} erro={erro === "1"} />;
}
