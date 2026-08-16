import { redirect } from "next/navigation";
import {
  tentarLoginMaster,
  abrirSessaoMaster,
  sessaoMasterAtiva,
  bloqueioLogin,
} from "@/lib/master-auth";
import { MasterLoginForm } from "@/components/master/master-login-form";

export const dynamic = "force-dynamic";

/** `?erro=1` = senha errada · `?erro=<segundos>` = bloqueado por tentativas. */
function mensagemErro(erro: string | undefined): string | null {
  if (!erro) return null;
  if (erro === "1") return "Senha incorreta.";
  const seg = Number(erro);
  if (!Number.isFinite(seg) || seg <= 0) return "Senha incorreta.";
  const min = Math.ceil(seg / 60);
  return `Tentativas demais. Tente de novo em ${min} ${min === 1 ? "minuto" : "minutos"}.`;
}

export default async function MasterLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await sessaoMasterAtiva()) redirect("/master");
  const { erro } = await searchParams;

  // Se o IP já está bloqueado, o aviso aparece antes mesmo de tentar de novo.
  const bloqueadoPor = await bloqueioLogin();

  async function entrar(formData: FormData) {
    "use server";
    const senha = String(formData.get("senha") || "");

    const r = await tentarLoginMaster(senha);
    if (!r.ok) {
      // Mesma tela para senha errada e para bloqueio; só muda o texto.
      redirect(
        `/master/login?erro=${r.motivo === "bloqueado" ? r.segundos : "1"}`,
      );
    }

    await abrirSessaoMaster();
    redirect("/master");
  }

  return (
    <MasterLoginForm
      entrar={entrar}
      erro={mensagemErro(erro)}
      bloqueadoPor={bloqueadoPor}
    />
  );
}
