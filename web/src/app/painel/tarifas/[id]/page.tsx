import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import {
  NovaTarifaForm,
  type TarifaEdicao,
} from "@/components/tarifas/nova-tarifa-form";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

/**
 * Edição de tarifa em página (antes era um modal na lista). O mesmo
 * formulário da criação, com "Como cobra" travado. Página e não modal porque
 * as regras de horário (mapa da semana + cartões) não cabem num modal.
 */
export default async function EditarTarifaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ patio?: string }>;
}) {
  const [{ id }, { patio }] = await Promise.all([params, searchParams]);
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const [{ data: tarifa }, { data: config }, { data: outras, error: erroOutras }] =
    await Promise.all([
      // Escopo pelo pátio resolvido: um id de outro pátio não abre aqui.
      supabase
        .from("tarifas")
        .select("*")
        .eq("id", id)
        .eq("patio_id", patioId)
        .eq("ativo", true)
        .maybeSingle(),
      supabase
        .from("patio_config")
        .select("tipos_veiculo")
        .eq("patio_id", patioId)
        .maybeSingle(),
      // Candidatas a "tabela do atraso" de uma tarifa de hóspede: as avulsas
      // ativas. Banco sem db/42 não tem `modalidade` — aí todas são avulsas.
      supabase
        .from("tarifas")
        .select("id, nome, tipo_veiculo, tolerancia_minutos, modalidade")
        .eq("patio_id", patioId)
        .eq("ativo", true)
        .order("ordem"),
    ]);
  if (!tarifa) notFound();

  const tipos = Array.isArray(config?.tipos_veiculo)
    ? (config.tipos_veiculo as string[])
    : ["carro", "moto", "caminhonete", "van"];

  const avulsas = erroOutras
    ? []
    : (outras ?? [])
        .filter((t) => t.modalidade !== "hospede" && t.id !== id)
        .map((t) => ({
          id: t.id as string,
          nome: t.nome as string,
          tipo_veiculo: t.tipo_veiculo as string,
          tolerancia_minutos: Number(t.tolerancia_minutos),
        }));

  // numeric do Postgres pode chegar como string.
  const n = (v: unknown) => Number(v ?? 0);
  const edicao: TarifaEdicao = {
    id: tarifa.id as string,
    nome: tarifa.nome as string,
    tipo_veiculo: tarifa.tipo_veiculo as string,
    fracao_inicial_minutos: n(tarifa.fracao_inicial_minutos),
    fracao_inicial_valor: n(tarifa.fracao_inicial_valor),
    fracao_adicional_minutos: n(tarifa.fracao_adicional_minutos),
    fracao_adicional_valor: n(tarifa.fracao_adicional_valor),
    teto_diaria: n(tarifa.teto_diaria),
    tolerancia_minutos: n(tarifa.tolerancia_minutos),
    pernoite_valor: n(tarifa.pernoite_valor),
    pernoite_hora_inicio: n(tarifa.pernoite_hora_inicio),
    pernoite_hora_fim: n(tarifa.pernoite_hora_fim),
    modalidade: (tarifa.modalidade as string | undefined) ?? "avulso",
    diaria_valor: tarifa.diaria_valor == null ? null : n(tarifa.diaria_valor),
    diaria_horas: tarifa.diaria_horas == null ? null : n(tarifa.diaria_horas),
    tarifa_atraso_id: (tarifa.tarifa_atraso_id as string | null | undefined) ?? null,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Link
          href={`/painel/tarifas?patio=${patioId}`}
          style={{
            cursor: "pointer",
            fontSize: 12,
            color: "#6B7280",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          ‹ Tarifas
        </Link>
        <h2
          style={{
            margin: "2px 0 0",
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "-.02em",
          }}
        >
          Editar tarifa
        </h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          <b style={{ color: "#1F2937" }}>{patioNome}</b> · {edicao.nome}
        </div>
      </div>
      <NovaTarifaForm
        patioId={patioId}
        tipos={tipos}
        avulsas={avulsas}
        tarifa={edicao}
      />
    </div>
  );
}
