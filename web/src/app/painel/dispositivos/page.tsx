import { createClient } from "@/lib/supabase/server";
import { JANELA_PENDENTE_MS, competenciaSeguinte } from "@/lib/dispositivos-gestor";
import {
  DispositivosGestorClient,
  type PatioAtivo,
  type Pendente,
  type HistItem,
} from "@/components/painel/dispositivos-gestor-client";

export const dynamic = "force-dynamic";

type DispRow = {
  id: string;
  patio_id: string;
  device_uuid: string;
  codigo_pareamento: string | null;
  apelido: string | null;
  fabricante: string | null;
  modelo: string | null;
  app_versao: string | null;
  status: string;
  licenca: string;
  ultimo_acesso: string | null;
  criado_em: string;
};

type AcessoRow = {
  id: string;
  patio_id: string;
  dispositivo_id: string | null;
  device_uuid: string;
  operador_id: string | null;
  evento: string;
  motivo: string | null;
  criado_em: string;
};

export default async function DispositivosGestorPage() {
  const sb = await createClient();
  const cutoffHist = new Date();
  cutoffHist.setDate(cutoffHist.getDate() - 90);

  const [
    { data: patios },
    { data: dispositivos },
    { data: licencas },
    { data: assinatura },
    { data: acessos },
    { data: operadores },
  ] = await Promise.all([
    sb.from("patios").select("id, nome, qtd_vagas").eq("ativo", true).order("nome"),
    sb
      .from("dispositivos")
      .select(
        "id, patio_id, device_uuid, codigo_pareamento, apelido, fabricante, modelo, app_versao, status, licenca, ultimo_acesso, criado_em",
      )
      .order("ultimo_acesso", { ascending: false, nullsFirst: false }),
    sb
      .from("dispositivo_licencas")
      .select("dispositivo_id, valor_mensal")
      .is("vigencia_fim", null),
    sb.from("assinaturas").select("valor_dispositivo_extra").maybeSingle(),
    sb
      .from("dispositivo_acessos")
      .select("id, patio_id, dispositivo_id, device_uuid, operador_id, evento, motivo, criado_em")
      .gte("criado_em", cutoffHist.toISOString())
      .order("criado_em", { ascending: false })
      .limit(300),
    sb.from("operadores").select("id, nome"),
  ]);

  const disps = (dispositivos as DispRow[] | null) ?? [];
  const valorExtra = Number(
    (assinatura as { valor_dispositivo_extra?: number } | null)?.valor_dispositivo_extra ?? 39,
  );

  const valorLicencaPorDisp = new Map<string, number>();
  for (const l of (licencas as { dispositivo_id: string; valor_mensal: number }[] | null) ?? []) {
    valorLicencaPorDisp.set(l.dispositivo_id, Number(l.valor_mensal));
  }

  const nomePatio = new Map<string, string>();
  for (const p of (patios as { id: string; nome: string; qtd_vagas: number }[] | null) ?? []) {
    nomePatio.set(p.id, p.nome);
  }
  const nomeOperador = new Map<string, string>();
  for (const o of (operadores as { id: string; nome: string }[] | null) ?? []) {
    nomeOperador.set(o.id, o.nome);
  }

  // Código por dispositivo (via id) e por (pátio|device_uuid), p/ o histórico.
  const codigoPorId = new Map<string, string | null>();
  const codigoPorChave = new Map<string, string | null>();
  for (const d of disps) {
    codigoPorId.set(d.id, d.codigo_pareamento);
    codigoPorChave.set(`${d.patio_id}|${d.device_uuid}`, d.codigo_pareamento);
  }

  // Última tentativa (login_negado) por dispositivo pendente.
  const ultimaTentativa = new Map<string, string>();
  for (const a of (acessos as AcessoRow[] | null) ?? []) {
    if (a.evento !== "login_negado") continue;
    const chave = `${a.patio_id}|${a.device_uuid}`;
    const atual = ultimaTentativa.get(chave);
    if (!atual || a.criado_em > atual) ultimaTentativa.set(chave, a.criado_em);
  }

  // ── Seção A: ativos agrupados por pátio ────────────────────────────────────
  const ativosPorPatio = new Map<string, DispRow[]>();
  for (const d of disps) {
    if (d.status !== "ativo") continue;
    const arr = ativosPorPatio.get(d.patio_id) ?? [];
    arr.push(d);
    ativosPorPatio.set(d.patio_id, arr);
  }
  // Também precisamos saber se o pátio tem incluso não-revogado (para slot livre).
  const temIncluso = new Map<string, boolean>();
  for (const d of disps) {
    if (d.licenca === "incluso" && d.status !== "revogado") temIncluso.set(d.patio_id, true);
  }

  const patiosAtivos: PatioAtivo[] = ((patios as { id: string; nome: string }[] | null) ?? [])
    .map((p) => {
      const ds = ativosPorPatio.get(p.id) ?? [];
      const extrasPagos = ds.filter((d) => d.licenca === "licenciado").length;
      return {
        id: p.id,
        nome: p.nome,
        temIncluso: temIncluso.get(p.id) ?? false,
        ativos: ds.length,
        extrasPagos,
        valorExtra,
        dispositivos: ds.map((d) => ({
          id: d.id,
          apelido: d.apelido,
          fabricante: d.fabricante,
          modelo: d.modelo,
          codigoPareamento: d.codigo_pareamento,
          appVersao: d.app_versao,
          ultimoAcesso: d.ultimo_acesso,
          licenca: d.licenca,
          valorMensal: valorLicencaPorDisp.get(d.id) ?? valorExtra,
        })),
      };
    })
    .filter((p) => p.dispositivos.length > 0);

  // ── Seção B: pendentes ─────────────────────────────────────────────────────
  const limiteAtivoMs = new Date().getTime() - JANELA_PENDENTE_MS;
  const pendentes: Pendente[] = disps
    .filter((d) => d.status === "pendente")
    .map((d) => {
      const tent = ultimaTentativa.get(`${d.patio_id}|${d.device_uuid}`) ?? d.criado_em;
      return {
        id: d.id,
        patioId: d.patio_id,
        patioNome: nomePatio.get(d.patio_id) ?? "—",
        codigoPareamento: d.codigo_pareamento,
        apelido: d.apelido,
        fabricante: d.fabricante,
        modelo: d.modelo,
        temIncluso: temIncluso.get(d.patio_id) ?? false,
        ultimaTentativa: tent,
        expirado: new Date(tent).getTime() < limiteAtivoMs,
      };
    })
    .sort((a, b) => b.ultimaTentativa.localeCompare(a.ultimaTentativa));

  // ── Seção C: histórico ─────────────────────────────────────────────────────
  const historico: HistItem[] = ((acessos as AcessoRow[] | null) ?? []).map((a) => ({
    id: a.id,
    criadoEm: a.criado_em,
    evento: a.evento,
    motivo: a.motivo,
    patioNome: nomePatio.get(a.patio_id) ?? "—",
    codigoPareamento:
      (a.dispositivo_id ? codigoPorId.get(a.dispositivo_id) : undefined) ??
      codigoPorChave.get(`${a.patio_id}|${a.device_uuid}`) ??
      null,
    operador: a.operador_id ? nomeOperador.get(a.operador_id) ?? null : null,
  }));

  const patiosLista = ((patios as { id: string; nome: string }[] | null) ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
  }));

  return (
    <DispositivosGestorClient
      patiosAtivos={patiosAtivos}
      pendentes={pendentes}
      historico={historico}
      patiosLista={patiosLista}
      valorExtra={valorExtra}
      competenciaSeguinte={competenciaSeguinte()}
    />
  );
}
