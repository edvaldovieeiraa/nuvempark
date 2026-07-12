import { createAdminClient } from "@/lib/supabase/admin";
import { Revelar } from "@/components/ui/revelar";
import {
  DollarSign,
  Building2,
  ParkingSquare,
  Users,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function MasterDashboard() {
  const sb = createAdminClient();

  const [
    { data: tenants },
    { count: totalPatios },
    { count: patiosAtivos },
    { data: assinaturas },
    { count: totalOperadores },
    hoje,
  ] = await Promise.all([
    sb.from("tenants").select("id, ativo"),
    sb.from("patios").select("id", { count: "exact", head: true }),
    sb
      .from("patios")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true),
    sb.from("assinaturas").select("valor_por_patio, estado, tenant_id"),
    sb.from("operadores").select("id", { count: "exact", head: true }),
    diaHoje(sb),
  ]);

  const totalTenants = tenants?.length ?? 0;
  const tenantsAtivos = (tenants ?? []).filter((t) => t.ativo).length;

  // MRR = soma de (valor_por_patio × pátios ativos do tenant) das assinaturas ativas.
  // Aproximação: valor_por_patio × total de pátios ativos da plataforma quando
  // a assinatura está ativa. Como o valor é por tenant, computamos por tenant.
  const patiosPorTenant = await contarPatiosAtivosPorTenant(sb);
  let mrr = 0;
  let atrasadas = 0;
  for (const a of assinaturas ?? []) {
    if (a.estado === "ativa") {
      mrr += (Number(a.valor_por_patio) || 0) * (patiosPorTenant[a.tenant_id] ?? 0);
    }
    if (a.estado === "atrasada" || a.estado === "suspensa") atrasadas++;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <Revelar>
        <h1 className="text-[26px] font-black tracking-tight">
          Visão da plataforma
        </h1>
        <p className="text-sm text-texto-2">
          Todas as redes NuvemPark · console do administrador.
        </p>
      </Revelar>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card destaque indice={0} Icone={DollarSign} rotulo="MRR estimado" valor={moeda.format(mrr)} />
        <Card
          indice={1}
          Icone={Building2}
          rotulo="Redes (tenants)"
          valor={String(totalTenants)}
          detalhe={`${tenantsAtivos} ativas`}
        />
        <Card
          indice={2}
          Icone={ParkingSquare}
          rotulo="Pátios"
          valor={String(patiosAtivos ?? 0)}
          detalhe={`de ${totalPatios ?? 0} no total`}
        />
        <Card
          indice={3}
          Icone={Users}
          rotulo="Operadores"
          valor={String(totalOperadores ?? 0)}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Revelar atraso={0.15} className="lg:col-span-1">
          <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
                <TrendingUp className="w-4 h-4 text-brand-600" />
              </span>
              <h2 className="font-bold text-sm">Saúde da carteira</h2>
            </div>
            <Linha rotulo="Movimentos hoje (rede)" valor={String(hoje.tickets)} />
            <Linha
              rotulo="Faturamento hoje (rede)"
              valor={moeda.format(hoje.faturamento)}
            />
            <Linha
              rotulo="Assinaturas com pendência"
              valor={String(atrasadas)}
              alerta={atrasadas > 0}
            />
          </div>
        </Revelar>

        <Revelar atraso={0.2} className="lg:col-span-2">
          <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-acento-teal rounded-2xl shadow-[var(--shadow-brand)] p-6 text-white h-full flex flex-col justify-center">
            <h2 className="text-lg font-black">Gerencie suas redes</h2>
            <p className="text-sm text-white/80 mt-1 max-w-md">
              Crie um novo cliente, defina o valor da assinatura e acompanhe o
              estado de cada rede em <b>Redes (tenants)</b>.
            </p>
            {atrasadas > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold bg-white/15 rounded-xl px-3.5 py-2 w-fit">
                <AlertTriangle className="w-4 h-4" />
                {atrasadas} {atrasadas === 1 ? "rede precisa" : "redes precisam"} de
                atenção
              </div>
            )}
          </div>
        </Revelar>
      </div>
    </div>
  );
}

async function contarPatiosAtivosPorTenant(
  sb: ReturnType<typeof createAdminClient>,
): Promise<Record<string, number>> {
  const { data } = await sb
    .from("patios")
    .select("tenant_id")
    .eq("ativo", true);
  const mapa: Record<string, number> = {};
  for (const p of data ?? []) {
    mapa[p.tenant_id] = (mapa[p.tenant_id] ?? 0) + 1;
  }
  return mapa;
}

async function diaHoje(sb: ReturnType<typeof createAdminClient>) {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const { data } = await sb
    .from("tickets")
    .select("valor_cobrado, status")
    .gte("entrada", inicio.toISOString())
    .limit(10000);
  const tickets = data?.length ?? 0;
  const faturamento = (data ?? [])
    .filter((t) => t.status === "fechado")
    .reduce((s, t) => s + (Number(t.valor_cobrado) || 0), 0);
  return { tickets, faturamento };
}

function Card({
  rotulo,
  valor,
  detalhe,
  Icone,
  destaque = false,
  indice,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  Icone: React.ComponentType<{ className?: string }>;
  destaque?: boolean;
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
            className={`w-8 h-8 rounded-lg grid place-items-center ${destaque ? "bg-white/15" : "bg-brand-50 text-brand-600"}`}
          >
            <Icone className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 text-[26px] font-black tabular-nums leading-none">
          {valor}
        </div>
        {detalhe && (
          <div
            className={`mt-1 text-xs font-semibold ${destaque ? "text-white/70" : "text-texto-3"}`}
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
  alerta = false,
}: {
  rotulo: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-texto-2">{rotulo}</span>
      <span
        className={`text-sm font-bold tabular-nums ${alerta ? "text-aviso" : ""}`}
      >
        {valor}
      </span>
    </div>
  );
}
