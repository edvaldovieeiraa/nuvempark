import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { listarGestoresDoTenant } from "@/lib/gestores";
import { localizacaoPorTelefone } from "@/lib/ddd";
import {
  TenantDetalheClient,
  type Evento,
  type FichaDispositivo,
  type FichaOperador,
  type FichaPatio,
} from "@/components/master/tenant-detalhe-client";

export const dynamic = "force-dynamic";

/**
 * Ficha da rede — a tela que o comercial/suporte abre antes de ligar para o
 * cliente. Junta cadastro, praça, quem entra no painel, se o app foi instalado,
 * se a operação tem movimento e como está o financeiro.
 *
 * Tudo o que é agregação (tickets) vem pronto do banco via db/38 — a página não
 * traz linha de ticket para o Node.
 */

type LinhaUso = {
  tickets_total: number;
  tickets_30d: number;
  tickets_abertos: number;
  faturamento_total: number;
  faturamento_30d: number;
  primeiro_ticket: string | null;
  ultimo_ticket: string | null;
  patios_com_movimento: number;
};

type LinhaPatioUso = {
  patio_id: string;
  tickets: number;
  tickets_30d: number;
  faturamento: number;
  ultimo_ticket: string | null;
};

export default async function TenantDetalhePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const sb = createAdminClient();

  const { data: tenant } = await sb
    .from("tenants")
    .select("id, nome, codigo, ativo, criado_em, atualizado_em, telefone, cnpj, razao_social")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant) notFound();

  const [
    { data: assinatura },
    { data: patios },
    { data: operadores },
    { data: dispositivos },
    { data: acessos },
    { data: primeiroAcesso },
    { data: ultimoIp },
    { data: faturas },
    { data: uso, error: erroUso },
    { data: patioUso },
    gestores,
  ] = await Promise.all([
    sb
      .from("assinaturas")
      .select(
        "estado, origem, valor_por_patio, valor_dispositivo_extra, dia_vencimento, vencimento, trial_expira_em, email_cobranca, cpf_cnpj, gateway_cliente_id, criado_em",
      )
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    sb
      .from("patios")
      .select("id, nome, codigo, qtd_vagas, ativo, criado_em")
      .eq("tenant_id", tenantId)
      .order("criado_em", { ascending: true }),
    sb
      .from("operadores")
      .select("id, nome, usuario, ativo, criado_em")
      .eq("tenant_id", tenantId)
      .order("criado_em", { ascending: true }),
    sb
      .from("dispositivos")
      .select(
        "id, patio_id, device_uuid, codigo_pareamento, apelido, fabricante, modelo, so_versao, app_versao, status, licenca, ultimo_acesso, vinculado_em, criado_em",
      )
      .eq("tenant_id", tenantId)
      .order("ultimo_acesso", { ascending: false, nullsFirst: false }),
    // Últimos eventos do app — alimenta a lista de acessos e a linha do tempo.
    sb
      .from("dispositivo_acessos")
      .select("evento, motivo, fabricante, modelo, app_versao, ip, criado_em, patio_id")
      .eq("tenant_id", tenantId)
      .order("criado_em", { ascending: false })
      .limit(40),
    // O primeiro evento de todos: quando o app entrou em cena nesta rede.
    sb
      .from("dispositivo_acessos")
      .select("evento, criado_em")
      .eq("tenant_id", tenantId)
      .order("criado_em", { ascending: true })
      .limit(1),
    // IP mais recente COM valor — pode não ser o evento mais recente.
    sb
      .from("dispositivo_acessos")
      .select("ip, criado_em")
      .eq("tenant_id", tenantId)
      .not("ip", "is", null)
      .order("criado_em", { ascending: false })
      .limit(1),
    sb
      .from("faturas")
      .select("id, competencia, vencimento, valor, estado, pago_em, forma_pagamento")
      .eq("tenant_id", tenantId)
      .order("competencia", { ascending: false })
      .limit(400),
    sb.rpc("fn_master_tenant_uso", { p_tenant: tenantId }),
    sb.rpc("fn_master_tenant_patio_uso", { p_tenant: tenantId }),
    listarGestoresDoTenant(sb, tenantId),
  ]);

  // ── Uso (db/38 devolve sempre 1 linha; zeros quando não há ticket) ─────────
  //
  // Se a migration db/38 ainda não foi aplicada, o RPC não existe e o erro vem
  // pelo `error` — `data` fica null. Zerar tudo em silêncio aqui seria pior que
  // não mostrar nada: "0 tickets" é uma AFIRMAÇÃO sobre o cliente, e ela estaria
  // errada. Por isso a falha vira uma flag que a tela mostra como aviso.
  const usoIndisponivel = !!erroUso;
  if (erroUso) {
    console.error("[master/tenants] fn_master_tenant_uso:", erroUso.message);
  }
  const u = ((uso as LinhaUso[] | null) ?? [])[0];
  const usoRede = {
    ticketsTotal: Number(u?.tickets_total ?? 0),
    tickets30d: Number(u?.tickets_30d ?? 0),
    ticketsAbertos: Number(u?.tickets_abertos ?? 0),
    faturamentoTotal: Number(u?.faturamento_total ?? 0),
    faturamento30d: Number(u?.faturamento_30d ?? 0),
    primeiroTicket: u?.primeiro_ticket ?? null,
    ultimoTicket: u?.ultimo_ticket ?? null,
    patiosComMovimento: Number(u?.patios_com_movimento ?? 0),
  };

  const usoPorPatio = new Map<string, LinhaPatioUso>();
  for (const l of (patioUso as LinhaPatioUso[] | null) ?? []) {
    usoPorPatio.set(l.patio_id, l);
  }

  // ── Dispositivos por pátio ────────────────────────────────────────────────
  type DispRow = {
    id: string;
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
    vinculado_em: string | null;
    criado_em: string;
  };

  const disps = (dispositivos as DispRow[] | null) ?? [];
  const dispsPorPatio = new Map<string, FichaDispositivo[]>();
  for (const d of disps) {
    const item: FichaDispositivo = {
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
      vinculadoEm: d.vinculado_em ?? d.criado_em,
    };
    const arr = dispsPorPatio.get(d.patio_id) ?? [];
    arr.push(item);
    dispsPorPatio.set(d.patio_id, arr);
  }

  // ── Pátios + uso + dispositivos ───────────────────────────────────────────
  type PatioRow = {
    id: string;
    nome: string;
    codigo: string | null;
    qtd_vagas: number;
    ativo: boolean;
    criado_em: string;
  };

  const listaPatios: FichaPatio[] = ((patios as PatioRow[] | null) ?? []).map(
    (p) => {
      const pu = usoPorPatio.get(p.id);
      return {
        id: p.id,
        nome: p.nome,
        codigo: p.codigo,
        qtdVagas: p.qtd_vagas,
        ativo: p.ativo,
        criadoEm: p.criado_em,
        tickets: Number(pu?.tickets ?? 0),
        tickets30d: Number(pu?.tickets_30d ?? 0),
        faturamento: Number(pu?.faturamento ?? 0),
        ultimoTicket: pu?.ultimo_ticket ?? null,
        dispositivos: dispsPorPatio.get(p.id) ?? [],
      };
    },
  );

  const nomePatio = new Map(listaPatios.map((p) => [p.id, p.nome]));

  // ── Operadores ────────────────────────────────────────────────────────────
  type OperadorRow = {
    id: string;
    nome: string;
    usuario: string;
    ativo: boolean;
    criado_em: string;
  };
  const listaOperadores: FichaOperador[] = (
    (operadores as OperadorRow[] | null) ?? []
  ).map((o) => ({
    id: o.id,
    nome: o.nome,
    usuario: o.usuario,
    ativo: o.ativo,
    criadoEm: o.criado_em,
  }));

  // ── Financeiro resumido ───────────────────────────────────────────────────
  type FaturaRow = {
    id: string;
    competencia: string;
    vencimento: string;
    valor: number;
    estado: string;
    pago_em: string | null;
    forma_pagamento: string | null;
  };
  const listaFaturas = (faturas as FaturaRow[] | null) ?? [];

  let emAberto = 0;
  let vencido = 0;
  let pago = 0;
  let qtdVencidas = 0;
  let qtdAbertas = 0;
  let qtdPagas = 0;
  let primeiraPagaEm: string | null = null;
  let proximoVencimento: string | null = null;

  for (const f of listaFaturas) {
    const valor = Number(f.valor) || 0;
    if (f.estado === "aberta") {
      emAberto += valor;
      qtdAbertas++;
      if (!proximoVencimento || f.vencimento < proximoVencimento) {
        proximoVencimento = f.vencimento;
      }
    } else if (f.estado === "vencida") {
      vencido += valor;
      qtdVencidas++;
    } else if (f.estado === "paga") {
      pago += valor;
      qtdPagas++;
      if (f.pago_em && (!primeiraPagaEm || f.pago_em < primeiraPagaEm)) {
        primeiraPagaEm = f.pago_em;
      }
    }
  }

  // ── Acessos do app ────────────────────────────────────────────────────────
  type AcessoRow = {
    evento: string;
    motivo: string | null;
    fabricante: string | null;
    modelo: string | null;
    app_versao: string | null;
    ip: string | null;
    criado_em: string;
    patio_id: string;
  };
  const listaAcessos = ((acessos as AcessoRow[] | null) ?? []).map((a) => ({
    evento: a.evento,
    motivo: a.motivo,
    aparelho: [a.fabricante, a.modelo].filter(Boolean).join(" ") || null,
    appVersao: a.app_versao,
    ip: a.ip,
    em: a.criado_em,
    patio: nomePatio.get(a.patio_id) ?? "—",
  }));

  const ipRow = ((ultimoIp as { ip: string; criado_em: string }[] | null) ?? [])[0];
  const primeiroEventoApp = (
    (primeiroAcesso as { evento: string; criado_em: string }[] | null) ?? []
  )[0];

  // ── Linha do tempo ────────────────────────────────────────────────────────
  //
  // Marcos de ATIVAÇÃO, na ordem em que a rede os atravessou. O que não
  // aconteceu não vira linha vazia: some, e a ausência é a informação.
  const eventos: Evento[] = [];
  const primeiroGestor = [...gestores].sort((a, b) =>
    (a.criadoEm ?? "").localeCompare(b.criadoEm ?? ""),
  )[0];
  const confirmacao = gestores
    .map((g) => g.emailConfirmadoEm)
    .filter((v): v is string => !!v)
    .sort()[0];
  const ultimoLoginPainel = gestores
    .map((g) => g.ultimoLogin)
    .filter((v): v is string => !!v)
    .sort()
    .at(-1);
  const primeiroVinculo = disps
    .map((d) => d.vinculado_em ?? d.criado_em)
    .filter(Boolean)
    .sort()[0];

  eventos.push({
    em: tenant.criado_em,
    titulo: "Rede criada",
    detalhe:
      assinatura?.origem === "signup"
        ? "Cadastro pelo site (self-signup, trial de 15 dias)"
        : "Criada no console master",
    tipo: "cadastro",
  });
  if (primeiroGestor?.criadoEm) {
    eventos.push({
      em: primeiroGestor.criadoEm,
      titulo: "Gestor cadastrado",
      detalhe: primeiroGestor.email ?? "—",
      tipo: "painel",
    });
  }
  if (confirmacao) {
    eventos.push({
      em: confirmacao,
      titulo: "E-mail confirmado",
      detalhe: "Painel liberado para o gestor",
      tipo: "painel",
    });
  }
  if (primeiroEventoApp) {
    eventos.push({
      em: primeiroEventoApp.criado_em,
      titulo: "Primeiro contato do app",
      detalhe: `Evento "${primeiroEventoApp.evento}" registrado`,
      tipo: "app",
    });
  }
  if (primeiroVinculo) {
    eventos.push({
      em: primeiroVinculo,
      titulo: "Primeiro aparelho pareado",
      detalhe: "App instalado e vinculado a um pátio",
      tipo: "app",
    });
  }
  if (usoRede.primeiroTicket) {
    eventos.push({
      em: usoRede.primeiroTicket,
      titulo: "Primeiro ticket emitido",
      detalhe: "A operação começou de verdade",
      tipo: "uso",
    });
  }
  if (primeiraPagaEm) {
    eventos.push({
      em: primeiraPagaEm,
      titulo: "Primeira fatura paga",
      detalhe: "Virou cliente pagante",
      tipo: "financeiro",
    });
  }
  if (usoRede.ultimoTicket && usoRede.ultimoTicket !== usoRede.primeiroTicket) {
    eventos.push({
      em: usoRede.ultimoTicket,
      titulo: "Último ticket",
      detalhe: "Movimento mais recente da rede",
      tipo: "uso",
    });
  }
  if (ultimoLoginPainel) {
    eventos.push({
      em: ultimoLoginPainel,
      titulo: "Último acesso ao painel",
      detalhe: "Entrada mais recente de um gestor",
      tipo: "painel",
    });
  }
  eventos.sort((a, b) => a.em.localeCompare(b.em));

  return (
    <TenantDetalheClient
      tenant={{
        id: tenant.id,
        nome: tenant.nome,
        codigo: tenant.codigo,
        ativo: tenant.ativo,
        criadoEm: tenant.criado_em,
        atualizadoEm: tenant.atualizado_em,
        telefone: tenant.telefone ?? null,
        cnpj: tenant.cnpj ?? null,
        razaoSocial: tenant.razao_social ?? null,
      }}
      assinatura={{
        estado: assinatura?.estado ?? null,
        origem: assinatura?.origem ?? "master",
        valorPorPatio: Number(assinatura?.valor_por_patio ?? 0),
        valorDispositivoExtra: Number(assinatura?.valor_dispositivo_extra ?? 0),
        diaVencimento: assinatura?.dia_vencimento ?? null,
        trialExpiraEm: assinatura?.trial_expira_em ?? null,
        emailCobranca: assinatura?.email_cobranca ?? null,
        cpfCnpj: assinatura?.cpf_cnpj ?? null,
        temGateway: !!assinatura?.gateway_cliente_id,
      }}
      local={{
        ...(localizacaoPorTelefone(tenant.telefone) ?? {
          ddd: null,
          uf: null,
          estado: null,
          regiao: null,
          praca: null,
        }),
        ultimoIp: ipRow?.ip ?? null,
        ultimoIpEm: ipRow?.criado_em ?? null,
      }}
      gestores={gestores}
      patios={listaPatios}
      operadores={listaOperadores}
      acessos={listaAcessos}
      uso={usoRede}
      usoIndisponivel={usoIndisponivel}
      financeiro={{
        emAberto,
        vencido,
        pago,
        qtdAbertas,
        qtdVencidas,
        qtdPagas,
        proximoVencimento,
      }}
      eventos={eventos}
    />
  );
}
