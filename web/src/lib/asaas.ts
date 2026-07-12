import "server-only";

/**
 * Cliente do gateway Asaas (cobrança PIX/boleto). API REST via fetch.
 *
 * Config no .env:
 *   ASAAS_API_KEY   — chave da conta Asaas
 *   ASAAS_BASE_URL  — https://api.asaas.com/v3 (produção) ou
 *                     https://api-sandbox.asaas.com/v3 (sandbox)
 *
 * Tudo fica DESLIGADO enquanto ASAAS_API_KEY não existir: asaasConfigurado()
 * = false e o painel opera em modo manual (você marca "pago" na mão). No dia
 * que a chave entrar, o botão "Emitir cobrança" passa a gerar PIX/boleto real
 * e o webhook baixa a fatura sozinho.
 */

export function asaasConfigurado(): boolean {
  return !!process.env.ASAAS_API_KEY;
}

function base(): string {
  return process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";
}

async function req<T>(caminho: string, init: RequestInit): Promise<T> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new Error("ASAAS_API_KEY ausente — gateway desligado.");
  const resp = await fetch(`${base()}${caminho}`, {
    ...init,
    headers: {
      access_token: chave,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Asaas ${resp.status}: ${t.slice(0, 300)}`);
  }
  return resp.json() as Promise<T>;
}

/** Garante um cliente no Asaas (cria se não houver id). Retorna o id. */
export async function garantirCliente(params: {
  clienteIdExistente?: string | null;
  nome: string;
  email?: string | null;
  cpfCnpj?: string | null;
}): Promise<string> {
  if (params.clienteIdExistente) return params.clienteIdExistente;
  const criado = await req<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: params.nome,
      email: params.email || undefined,
      cpfCnpj: params.cpfCnpj || undefined,
    }),
  });
  return criado.id;
}

export type CobrancaAsaas = {
  id: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  status: string;
};

/** Cria uma cobrança PIX+boleto (BOLETO aceita pix no Asaas). */
export async function criarCobranca(params: {
  clienteId: string;
  valor: number;
  vencimento: string; // yyyy-mm-dd
  descricao: string;
  referenciaExterna: string; // id da fatura no nosso banco
}): Promise<CobrancaAsaas> {
  return req<CobrancaAsaas>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: params.clienteId,
      billingType: "UNDEFINED", // cliente escolhe PIX/boleto/cartão
      value: params.valor,
      dueDate: params.vencimento,
      description: params.descricao,
      externalReference: params.referenciaExterna,
    }),
  });
}

/** Busca o PIX copia-e-cola de uma cobrança (endpoint separado no Asaas). */
export async function obterPixCopiaECola(cobrancaId: string): Promise<string | null> {
  try {
    const r = await req<{ payload?: string }>(`/payments/${cobrancaId}/pixQrCode`, {
      method: "GET",
    });
    return r.payload ?? null;
  } catch {
    return null;
  }
}
