import Link from "next/link";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Revelar } from "@/components/ui/revelar";
import { GraficoBarras } from "@/components/master/grafico-barras";
import { GerarFaturasBotao } from "@/components/master/gerar-faturas-botao";
import { moeda, competenciaCurta } from "@/lib/financeiro";
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Kpis = {
  recebido_mes: number;
  previsto_mes: number;
  total_vencido: number;
  redes_vencidas: number;
  recebido_total: number;
};

const KPIS_VAZIO: Kpis = {
  recebido_mes: 0,
  previsto_mes: 0,
  total_vencido: 0,
  redes_vencidas: 0,
  recebido_total: 0,
};

export default async function FinanceiroDashboard() {
  const sb = createAdminClient();

  // Manutenção oportunista DEPOIS da resposta.
  //
  // As três já rodam encadeadas no pg_cron todo dia às 03:00
  // (fn_rotina_diaria_faturamento, db/12-cron-faturamento.sql). No caminho de
  // render elas custavam três idas e voltas em série — e `fn_gerar_faturas_mes`
  // ESCREVE: percorre todos os tenants fazendo dois count() cada e insere
  // faturas. Era uma transação de escrita a cada visualização desta página.
  //
  // A ordem importa (expira trial → gera fatura → marca vencida), então aqui
  // continuam em série; só que fora do caminho crítico. Para forçar a geração
  // na hora existe o botão "Gerar faturas" no cabeçalho.
  after(async () => {
    const bg = createAdminClient();
    await bg.rpc("fn_expirar_trials");
    await bg.rpc("fn_gerar_faturas_mes");
    await bg.rpc("fn_marcar_faturas_vencidas");
  });

  // KPIs e série do gráfico agregados NO BANCO (db/37). Antes esta página
  // puxava `.limit(5000)` de faturas para o Node só para somar quatro números
  // e montar seis barras.
  const [{ data: kpisRaw }, { data: serieRaw }, { data: assinaturas }, { data: patios }] =
    await Promise.all([
      sb.rpc("fn_master_kpis_financeiro").maybeSingle(),
      sb.rpc("fn_master_receita_por_mes", { p_meses: 6 }),
      sb.from("assinaturas").select("tenant_id, valor_por_patio, estado"),
      sb.from("patios").select("tenant_id, ativo"),
    ]);

  const k = (kpisRaw as Kpis | null) ?? KPIS_VAZIO;
  const recebidoMes = Number(k.recebido_mes) || 0;
  const previstoMes = Number(k.previsto_mes) || 0;
  const totalVencido = Number(k.total_vencido) || 0;
  const redesVencidas = Number(k.redes_vencidas) || 0;
  const recebidoTotal = Number(k.recebido_total) || 0;
  const pct = previstoMes > 0 ? Math.round((recebidoMes / previstoMes) * 100) : 0;

  // MRR: soma valor_por_patio × pátios ativos das assinaturas ativas
  const patiosAtivosPorTenant: Record<string, number> = {};
  for (const p of patios ?? [])
    if (p.ativo)
      patiosAtivosPorTenant[p.tenant_id] =
        (patiosAtivosPorTenant[p.tenant_id] ?? 0) + 1;
  let mrr = 0;
  for (const a of assinaturas ?? [])
    if (a.estado === "ativa")
      mrr += (Number(a.valor_por_patio) || 0) * (patiosAtivosPorTenant[a.tenant_id] ?? 0);

  // A função já devolve os 6 meses sem buraco, em ordem — inclusive os zerados.
  const dadosGrafico = (
    (serieRaw as { competencia: string; valor: number }[] | null) ?? []
  ).map((linha) => ({
    rotulo: competenciaCurta(linha.competencia),
    valor: Number(linha.valor) || 0,
  }));

  return (
    <div className="space-y-6 max-w-6xl">
      <Revelar>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[26px] font-black tracking-tight">Financeiro</h1>
            <p className="text-sm text-texto-2">
              Faturamento, recebimentos e inadimplência da plataforma.
            </p>
          </div>
          <GerarFaturasBotao />
        </div>
      </Revelar>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          indice={0}
          destaque
          Icone={TrendingUp}
          rotulo="MRR ativo"
          valor={moeda.format(mrr)}
          detalhe="receita recorrente/mês"
        />
        <Kpi
          indice={1}
          Icone={CheckCircle2}
          rotulo="Recebido no mês"
          valor={moeda.format(recebidoMes)}
          detalhe={`${pct}% do previsto`}
        />
        <Kpi
          indice={2}
          Icone={AlertTriangle}
          rotulo="Em atraso"
          valor={moeda.format(totalVencido)}
          detalhe={`${redesVencidas} ${redesVencidas === 1 ? "rede" : "redes"}`}
          alerta={totalVencido > 0}
        />
        <Kpi
          indice={3}
          Icone={Wallet}
          rotulo="Recebido (total)"
          valor={moeda.format(recebidoTotal)}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Revelar atraso={0.12} className="lg:col-span-2">
          <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
                  <TrendingUp className="w-4 h-4 text-brand-600" />
                </span>
                <h2 className="font-bold text-sm">Receita recebida (6 meses)</h2>
              </div>
            </div>
            <GraficoBarras dados={dadosGrafico} />
          </div>
        </Revelar>

        <Revelar atraso={0.18}>
          <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5 h-full flex flex-col">
            <h2 className="font-bold text-sm mb-4">Este mês</h2>
            <ProgressoRecebimento pct={pct} />
            <div className="mt-4 space-y-2.5">
              <Linha rotulo="Previsto" valor={moeda.format(previstoMes)} />
              <Linha rotulo="Recebido" valor={moeda.format(recebidoMes)} forte />
              <Linha
                rotulo="A receber"
                valor={moeda.format(Math.max(0, previstoMes - recebidoMes))}
              />
            </div>
            <div className="mt-auto pt-4 flex flex-col gap-2">
              <AcaoLink
                href="/master/financeiro/faturas"
                Icone={Receipt}
                texto="Ver faturas"
              />
              <AcaoLink
                href="/master/financeiro/inadimplencia"
                Icone={Clock}
                texto="Inadimplência"
                alerta={redesVencidas > 0}
              />
            </div>
          </div>
        </Revelar>
      </div>
    </div>
  );
}

function ProgressoRecebimento({ pct }: { pct: number }) {
  return (
    <div>
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-3xl font-black tabular-nums text-brand-700">{pct}%</span>
        <span className="text-xs text-texto-3 font-semibold mb-1">recebido</span>
      </div>
      <div className="h-2.5 rounded-full bg-fundo overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function AcaoLink({
  href,
  Icone,
  texto,
  alerta = false,
}: {
  href: string;
  Icone: React.ComponentType<{ className?: string }>;
  texto: string;
  alerta?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
        alerta
          ? "border-perigo/25 bg-perigo-bg text-perigo hover:bg-perigo/10"
          : "border-borda bg-fundo hover:bg-brand-50 hover:border-brand-200 text-texto-2 hover:text-brand-700"
      }`}
    >
      <Icone className="w-4 h-4" />
      {texto}
      <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

function Kpi({
  rotulo,
  valor,
  detalhe,
  Icone,
  destaque = false,
  alerta = false,
  indice,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  Icone: React.ComponentType<{ className?: string }>;
  destaque?: boolean;
  alerta?: boolean;
  indice: number;
}) {
  return (
    <Revelar atraso={indice * 0.06}>
      <div
        className={`relative overflow-hidden rounded-2xl p-5 h-full ${
          destaque
            ? "bg-gradient-to-br from-brand-700 via-brand-600 to-acento-teal text-white shadow-[var(--shadow-brand)]"
            : "bg-superficie border border-borda shadow-[var(--shadow-card)]"
        }`}
      >
        {destaque && (
          <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        )}
        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider ${destaque ? "text-white/75" : "text-texto-3"}`}
          >
            {rotulo}
          </span>
          <span
            className={`w-8 h-8 rounded-lg grid place-items-center ${
              destaque
                ? "bg-white/15"
                : alerta
                  ? "bg-perigo-bg text-perigo"
                  : "bg-brand-50 text-brand-600"
            }`}
          >
            <Icone className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 text-[24px] font-black tabular-nums leading-none">
          {valor}
        </div>
        {detalhe && (
          <div
            className={`mt-1 text-xs font-semibold ${
              destaque ? "text-white/70" : alerta ? "text-perigo" : "text-texto-3"
            }`}
          >
            {detalhe}
          </div>
        )}
      </div>
    </Revelar>
  );
}

function Linha({
  rotulo,
  valor,
  forte = false,
}: {
  rotulo: string;
  valor: string;
  forte?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-texto-2">{rotulo}</span>
      <span
        className={`text-sm tabular-nums ${forte ? "font-black text-brand-700" : "font-bold"}`}
      >
        {valor}
      </span>
    </div>
  );
}
