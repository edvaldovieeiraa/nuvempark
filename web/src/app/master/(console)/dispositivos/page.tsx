import { createAdminClient } from "@/lib/supabase/admin";
import {
  DispositivosClient,
  type TenantGrupo,
  type FilaItem,
} from "@/components/master/dispositivos-client";

export const dynamic = "force-dynamic";

type DispRow = {
  id: string;
  tenant_id: string;
  patio_id: string;
  device_uuid: string;
  codigo_pareamento: string | null;
  apelido: string | null;
  fabricante: string | null;
  modelo: string | null;
  so_versao: string | null;
  app_versao: string | null;
  status: string;
  licenca: string;
  ultimo_acesso: string | null;
};

type NegadoRow = {
  tenant_id: string;
  patio_id: string;
  device_uuid: string;
  motivo: string | null;
  criado_em: string;
};

export default async function DispositivosPage() {
  const sb = createAdminClient();
  const cutoffData = new Date();
  cutoffData.setDate(cutoffData.getDate() - 30);
  const cutoff = cutoffData.toISOString();

  const [
    { data: tenants },
    { data: patios },
    { data: assinaturas },
    { data: dispositivos },
    { data: negados },
  ] = await Promise.all([
    sb.from("tenants").select("id, nome, codigo, ativo").order("nome"),
    sb.from("patios").select("id, nome, tenant_id, ativo"),
    sb.from("assinaturas").select("tenant_id, valor_dispositivo_extra"),
    sb
      .from("dispositivos")
      .select(
        "id, tenant_id, patio_id, device_uuid, codigo_pareamento, apelido, fabricante, modelo, so_versao, app_versao, status, licenca, ultimo_acesso",
      )
      .order("ultimo_acesso", { ascending: false, nullsFirst: false }),
    sb
      .from("dispositivo_acessos")
      .select("tenant_id, patio_id, device_uuid, motivo, criado_em")
      .eq("evento", "login_negado")
      .gte("criado_em", cutoff),
  ]);

  const disps = (dispositivos as DispRow[] | null) ?? [];
  const valorExtraPorTenant = new Map<string, number>();
  for (const a of (assinaturas as { tenant_id: string; valor_dispositivo_extra: number | null }[] | null) ?? []) {
    valorExtraPorTenant.set(a.tenant_id, Number(a.valor_dispositivo_extra ?? 39));
  }

  // Extras cobráveis: regra de negócio no banco (fn_contar_dispositivos_cobraveis).
  const tenantIds = [...new Set(disps.map((d) => d.tenant_id))];
  const cobraveisPorTenant = new Map<string, number>();
  await Promise.all(
    tenantIds.map(async (tid) => {
      const { data } = await sb.rpc("fn_contar_dispositivos_cobraveis", { p_tenant: tid });
      cobraveisPorTenant.set(tid, typeof data === "number" ? data : 0);
    }),
  );

  // codigo_pareamento por (patio, device) para enriquecer a fila comercial.
  const codigoPorDispositivo = new Map<string, string | null>();
  for (const d of disps) {
    codigoPorDispositivo.set(`${d.patio_id}|${d.device_uuid}`, d.codigo_pareamento);
  }

  // ── Agrupamento tenant → pátio → dispositivos ──────────────────────────────
  const patiosPorTenant = new Map<string, { id: string; nome: string; ativo: boolean }[]>();
  for (const p of (patios as { id: string; nome: string; tenant_id: string; ativo: boolean }[] | null) ?? []) {
    const arr = patiosPorTenant.get(p.tenant_id) ?? [];
    arr.push({ id: p.id, nome: p.nome, ativo: p.ativo });
    patiosPorTenant.set(p.tenant_id, arr);
  }

  const dispsPorPatio = new Map<string, DispRow[]>();
  for (const d of disps) {
    const arr = dispsPorPatio.get(d.patio_id) ?? [];
    arr.push(d);
    dispsPorPatio.set(d.patio_id, arr);
  }

  const grupos: TenantGrupo[] = ((tenants as { id: string; nome: string; codigo: string; ativo: boolean }[] | null) ?? [])
    .map((t) => {
      const listaPatios = (patiosPorTenant.get(t.id) ?? [])
        .map((p) => {
          const ds = dispsPorPatio.get(p.id) ?? [];
          const temIncluso = ds.some((d) => d.licenca === "incluso" && d.status !== "revogado");
          const temCandidatoSlot = ds.some((d) => d.status === "pendente" || d.status === "bloqueado");
          return {
            id: p.id,
            nome: p.nome,
            ativo: p.ativo,
            temIncluso,
            slotLivre: !temIncluso,
            slotLivreComCandidato: !temIncluso && temCandidatoSlot,
            dispositivos: ds.map((d) => ({
              id: d.id,
              patioId: d.patio_id,
              codigoPareamento: d.codigo_pareamento,
              apelido: d.apelido,
              fabricante: d.fabricante,
              modelo: d.modelo,
              soVersao: d.so_versao,
              appVersao: d.app_versao,
              status: d.status,
              licenca: d.licenca,
              ultimoAcesso: d.ultimo_acesso,
            })),
          };
        })
        .filter((p) => p.dispositivos.length > 0);

      const dispositivosAtivos = listaPatios.reduce(
        (s, p) => s + p.dispositivos.filter((d) => d.status === "ativo").length,
        0,
      );
      const valorExtra = valorExtraPorTenant.get(t.id) ?? 39;
      const extrasCobraveis = cobraveisPorTenant.get(t.id) ?? 0;

      return {
        id: t.id,
        nome: t.nome,
        codigo: t.codigo,
        ativo: t.ativo,
        valorExtra,
        extrasCobraveis,
        mensalidadeExtra: extrasCobraveis * valorExtra,
        patiosComDispositivo: listaPatios.length,
        dispositivosAtivos,
        patios: listaPatios,
      };
    })
    .filter((g) => g.patios.length > 0);

  // ── Fila comercial: login_negado agregado por (tenant, pátio) ──────────────
  const nomePatio = new Map<string, string>();
  for (const arr of patiosPorTenant.values()) {
    for (const p of arr) nomePatio.set(p.id, p.nome);
  }
  const nomeTenant = new Map<string, string>(
    ((tenants as { id: string; nome: string }[] | null) ?? []).map((t) => [t.id, t.nome]),
  );

  const agregado = new Map<string, FilaItem>();
  for (const n of (negados as NegadoRow[] | null) ?? []) {
    const chave = `${n.tenant_id}|${n.patio_id}`;
    const existente = agregado.get(chave);
    if (existente) {
      existente.tentativas += 1;
      if (n.criado_em > existente.ultimaTentativa) {
        existente.ultimaTentativa = n.criado_em;
        existente.ultimoMotivo = n.motivo ?? "—";
      }
    } else {
      agregado.set(chave, {
        tenantId: n.tenant_id,
        tenantNome: nomeTenant.get(n.tenant_id) ?? "—",
        patioId: n.patio_id,
        patioNome: nomePatio.get(n.patio_id) ?? "—",
        tentativas: 1,
        ultimoMotivo: n.motivo ?? "—",
        ultimaTentativa: n.criado_em,
        codigoPareamento: codigoPorDispositivo.get(`${n.patio_id}|${n.device_uuid}`) ?? null,
      });
    }
  }
  const fila = [...agregado.values()].sort((a, b) => b.tentativas - a.tentativas);

  return <DispositivosClient grupos={grupos} fila={fila} />;
}
