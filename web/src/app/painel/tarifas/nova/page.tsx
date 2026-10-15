import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { NovaTarifaForm, type ConversaoTarifa } from "@/components/tarifas/nova-tarifa-form";
import { SemPatio } from "@/components/sem-patio";
import { contratoDeTarifa, contratoParaJson } from "@/lib/contrato-painel";

export const dynamic = "force-dynamic";

export default async function NovaTarifaPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string; de?: string }>;
}) {
  const { patio, de } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const { data: config } = await supabase
    .from("patio_config")
    .select("tipos_veiculo")
    .eq("patio_id", patioId)
    .maybeSingle();

  const tipos = Array.isArray(config?.tipos_veiculo)
    ? (config.tipos_veiculo as string[])
    : ["carro", "moto", "caminhonete", "van"];

  // Candidatas a "tabela do atraso" de uma tarifa de hóspede: as avulsas ativas.
  // Banco sem db/42 não tem `modalidade` — aí todas são avulsas.
  const { data: tarifas, error: erroTarifas } = await supabase
    .from("tarifas")
    .select("id, nome, tipo_veiculo, tolerancia_minutos, modalidade")
    .eq("patio_id", patioId)
    .eq("ativo", true)
    .order("ordem");
  const avulsas = erroTarifas
    ? []
    : (tarifas ?? [])
        // Lista positiva: hóspede e contrato (motor v2) não servem de tabela do
        // atraso, que é cobrada pelas colunas de fração.
        .filter((t) => (t.modalidade ?? "avulso") === "avulso")
        .map((t) => ({
          id: t.id as string,
          nome: t.nome as string,
          tipo_veiculo: t.tipo_veiculo as string,
          tolerancia_minutos: Number(t.tolerancia_minutos),
        }));

  // "Criar contrato a partir desta tarifa": só avulsa ativa deste pátio. A
  // tarifa original não muda; nada é gravado até o gestor salvar.
  let conversao: ConversaoTarifa | undefined;
  if (de) {
    const { data: origem } = await supabase
      .from("tarifas")
      .select(
        "nome, tipo_veiculo, modalidade, tolerancia_minutos, fracao_inicial_minutos, fracao_inicial_valor, fracao_adicional_minutos, fracao_adicional_valor, teto_diaria, pernoite_valor, pernoite_hora_inicio, pernoite_hora_fim",
      )
      .eq("id", de)
      .eq("patio_id", patioId)
      .eq("ativo", true)
      .maybeSingle();
    if (origem && (origem.modalidade ?? "avulso") === "avulso") {
      const n = (k: keyof typeof origem) => Number(origem[k]) || 0;
      const r = contratoDeTarifa({
        tolerancia_minutos: n("tolerancia_minutos"),
        fracao_inicial_minutos: n("fracao_inicial_minutos"),
        fracao_inicial_valor: n("fracao_inicial_valor"),
        fracao_adicional_minutos: n("fracao_adicional_minutos"),
        fracao_adicional_valor: n("fracao_adicional_valor"),
        teto_diaria: n("teto_diaria"),
        pernoite_valor: n("pernoite_valor"),
        pernoite_hora_inicio: n("pernoite_hora_inicio"),
        pernoite_hora_fim: n("pernoite_hora_fim"),
      });
      conversao = {
        tarifaNome: String(origem.nome),
        nome: `${origem.nome} (contrato)`.slice(0, 80),
        tipoVeiculo: String(origem.tipo_veiculo),
        json: contratoParaJson(r.contrato),
        avisos: r.avisos,
        origem: r.origem,
      };
    }
  }

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
          {conversao
            ? `Novo contrato a partir da tarifa avulsa “${conversao.tarifaNome}”`
            : "Nova tarifa"}
        </h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          <b style={{ color: "#1F2937" }}>{patioNome}</b> · a tabela de preço
          que o app usa na cobrança.
        </div>
      </div>
      <NovaTarifaForm
        key={conversao ? `de-${de}` : "nova"}
        patioId={patioId}
        tipos={tipos}
        avulsas={avulsas}
        conversao={conversao}
      />
    </div>
  );
}
