import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { assinarFotosEntrada } from "@/lib/fotos";
import { mapaOperadores } from "@/lib/operadores";
import { Revelar } from "@/components/ui/revelar";
import { SemPatio } from "@/components/sem-patio";
import { SyncBadge } from "@/components/sync-badge";
import { ultimaSincronizacao } from "@/lib/patio-scope";
import { LimpezaPatio } from "@/components/patio/limpeza-patio";
import { PatioLista } from "@/components/patio/patio-lista";
import { Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PatioAgoraPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const [{ data: abertos }, { data: patioInfo }, sincronizadoEm] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("id, placa, tipo_veiculo, entrada, origem, foto_entrada_path, operador_id")
        .eq("patio_id", patioId)
        .eq("status", "aberto")
        .order("entrada", { ascending: false }),
      supabase
        .from("patios")
        .select("qtd_vagas")
        .eq("id", patioId)
        .maybeSingle(),
      ultimaSincronizacao(patioId),
    ]);

  const veiculos = abertos ?? [];
  const vagas = patioInfo?.qtd_vagas ?? 0;
  const pct = vagas > 0 ? Math.min(100, (veiculos.length / vagas) * 100) : 0;

  // Uma única chamada ao Storage para as miniaturas desta página.
  const [fotos, operadores] = await Promise.all([
    assinarFotosEntrada(veiculos),
    mapaOperadores(),
  ]);

  return (
    <div className="space-y-5 max-w-5xl">
      <Revelar>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[26px] font-black tracking-tight">Pátio</h1>
            <p className="text-sm text-texto-2">
              <b className="text-texto">{patioNome}</b> · veículos dentro do
              pátio agora
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LimpezaPatio patioId={patioId} patioNome={patioNome ?? "este pátio"} />
            <SyncBadge iso={sincronizadoEm} />
          </div>
        </div>
      </Revelar>

      {/* Ocupação */}
      <Revelar atraso={0.06}>
        <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-bold">Ocupação</span>
            <span className="text-2xl font-black tabular-nums">
              {veiculos.length}
              {vagas > 0 && (
                <span className="text-base text-texto-3 font-bold"> / {vagas}</span>
              )}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-fundo overflow-hidden">
            <div
              className={`h-full rounded-full ${
                pct >= 90
                  ? "bg-gradient-to-r from-saida to-perigo"
                  : "bg-gradient-to-r from-brand-500 to-acento-teal"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Revelar>

      {/* Lista — clicar no veículo (ou na miniatura) abre a foto de entrada. */}
      <Revelar atraso={0.1}>
        <PatioLista
          veiculos={veiculos}
          fotos={fotos}
          operadores={operadores}
        />
      </Revelar>

      {veiculos.length > 0 && (
        <Revelar atraso={0.15}>
          <div className="flex items-center gap-2 text-xs text-texto-3">
            <Inbox className="w-4 h-4" />
            Atualize a página para recalcular as permanências.
          </div>
        </Revelar>
      )}
    </div>
  );
}

