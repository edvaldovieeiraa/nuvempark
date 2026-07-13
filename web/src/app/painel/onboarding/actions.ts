"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

export type DadosOnboarding = {
  patio: { nome: string; qtdVagas: number };
  /** Tarifa simplificada (opcional — o gestor pode pular e criar depois). */
  tarifa?: {
    primeiraHora: number;
    horaAdicional: number;
    toleranciaMinutos: number;
  };
  /** Cupom do ticket impresso (opcional — default: nome do pátio no cabeçalho). */
  impressao?: { cabecalho: string[]; rodape: string[] };
  /** Primeiro operador do app (opcional). */
  operador?: { nome: string; usuario: string; senha: string };
};

export type ResultadoOnboarding =
  | {
      ok: true;
      codigo: string;
      patioNome: string;
      operadorUsuario: string | null;
      /** Etapas opcionais que falharam sem impedir o pátio. */
      avisos: string[];
    }
  | { ok: false; msg: string };

/**
 * Conclui o onboarding do gestor recém-cadastrado: cria o primeiro pátio
 * (+ config default com tipos de veículo e formas de pagamento), uma tarifa
 * simplificada e o primeiro operador do app — tudo numa chamada, no fim do
 * wizard. O pátio é obrigatório; tarifa e operador são opcionais e, se
 * falharem, não desfazem o pátio (viram avisos).
 */
export async function concluirOnboarding(
  dados: DadosOnboarding,
): Promise<ResultadoOnboarding> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const nome = dados.patio.nome.trim();
  if (nome.length < 2)
    return { ok: false, msg: "Informe o nome do seu estacionamento." };
  const qtdVagas = Math.max(0, Math.floor(dados.patio.qtdVagas || 0));

  // 1) Pátio (o código de acesso de 4 dígitos nasce por trigger no banco)
  const { data: patio, error: erroPatio } = await sb
    .from("patios")
    .insert({ tenant_id: tenantId, nome, qtd_vagas: qtdVagas })
    .select("id, codigo_acesso")
    .single();
  if (erroPatio || !patio)
    return { ok: false, msg: "Não foi possível criar o pátio. Tente de novo." };

  // Config default do pátio (tipos de veículo e formas de pagamento de fábrica)
  // + cupom do ticket: usa o que o gestor escreveu no wizard, ou o nome do pátio.
  const linhas = (arr: string[] | undefined, fallback: string[]) => {
    const limpas = (arr ?? [])
      .map((l) => l.trim().slice(0, 48))
      .filter(Boolean)
      .slice(0, 4);
    return limpas.length ? limpas : fallback;
  };
  await sb.from("patio_config").insert({
    patio_id: patio.id,
    tenant_id: tenantId,
    patio_ativo: true,
    ticket_cabecalho: linhas(dados.impressao?.cabecalho, [nome]),
    ticket_rodape: linhas(dados.impressao?.rodape, []),
  });

  const avisos: string[] = [];

  // 2) Tarifa simplificada (vale para todos os tipos; refina depois)
  if (dados.tarifa) {
    const t = dados.tarifa;
    if (t.primeiraHora > 0) {
      const { error } = await sb.from("tarifas").insert({
        tenant_id: tenantId,
        patio_id: patio.id,
        nome: "Tabela padrão",
        tipo_veiculo: "ambos",
        fracao_inicial_minutos: 60,
        fracao_inicial_valor: t.primeiraHora,
        fracao_adicional_minutos: 60,
        fracao_adicional_valor: t.horaAdicional > 0 ? t.horaAdicional : t.primeiraHora,
        tolerancia_minutos: Math.max(0, Math.floor(t.toleranciaMinutos || 0)),
        teto_diaria: 0, // desligado — o gestor liga depois se quiser
        pernoite_valor: 0, // desligado
        pernoite_hora_inicio: 22,
        pernoite_hora_fim: 8,
      });
      if (error) avisos.push("A tarifa não pôde ser criada — crie em Cadastros → Tarifas.");
    }
  }

  // 3) Primeiro operador do app
  let operadorUsuario: string | null = null;
  if (dados.operador) {
    const op = dados.operador;
    const usuario = op.usuario.trim().toUpperCase();
    if (op.nome.trim() && usuario && op.senha.length >= 6) {
      const { data: novoOp, error } = await sb
        .from("operadores")
        .insert({
          tenant_id: tenantId,
          nome: op.nome.trim(),
          usuario,
          senha_hash: bcrypt.hashSync(op.senha, 10),
        })
        .select("id")
        .single();
      if (error || !novoOp) {
        avisos.push(
          error?.code === "23505"
            ? `Já existe um operador "${usuario}" — crie outro em Cadastros → Operadores.`
            : "O operador não pôde ser criado — crie em Cadastros → Operadores.",
        );
      } else {
        const { error: erroVinculo } = await sb.from("operador_patios").insert({
          operador_id: novoOp.id,
          patio_id: patio.id,
          tenant_id: tenantId,
        });
        if (erroVinculo)
          avisos.push("Operador criado, mas o vínculo com o pátio falhou — confira em Operadores.");
        else operadorUsuario = usuario;
      }
    }
  }

  await registrarAuditoria({
    modulo: "patios",
    acao: "criou",
    patioId: null,
    descricao: `Onboarding: criou o pátio "${nome}"${dados.tarifa ? " + tarifa padrão" : ""}${operadorUsuario ? ` + operador ${operadorUsuario}` : ""}`,
    dados: { nome, qtd_vagas: qtdVagas, via: "onboarding" },
  });

  revalidatePath("/painel");
  revalidatePath("/painel/patios");
  revalidatePath("/painel/tarifas");
  revalidatePath("/painel/operadores");

  return {
    ok: true,
    codigo: String(patio.codigo_acesso ?? ""),
    patioNome: nome,
    operadorUsuario,
    avisos,
  };
}
