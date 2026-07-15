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

/**
 * Garante um cliente no Asaas e que ele tenha CPF/CNPJ.
 *
 * O Asaas EXIGE cpfCnpj para emitir cobrança. Um cliente criado antes (sem
 * cpfCnpj) precisa ser ATUALIZADO — por isso, havendo id existente e cpfCnpj,
 * fazemos um update no cliente antes de devolver o id. Retorna o id do cliente.
 */
export async function garantirCliente(params: {
  clienteIdExistente?: string | null;
  nome: string;
  email?: string | null;
  cpfCnpj?: string | null;
}): Promise<string> {
  const cpf = params.cpfCnpj ? params.cpfCnpj.replace(/\D/g, "") : undefined;

  if (params.clienteIdExistente) {
    // Sincroniza cpfCnpj/e-mail no cliente já existente (se veio cpfCnpj).
    // Se o cpfCnpj for inválido, o Asaas devolve 400 e o erro sobe — melhor
    // do que falhar depois, na criação da cobrança.
    if (cpf) {
      await req(`/customers/${params.clienteIdExistente}`, {
        method: "POST",
        body: JSON.stringify({
          cpfCnpj: cpf,
          email: params.email || undefined,
        }),
      });
    }
    return params.clienteIdExistente;
  }

  const criado = await req<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: params.nome,
      email: params.email || undefined,
      cpfCnpj: cpf,
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

export type PixCobranca = {
  copiaCola: string | null;
  /** base64 do PNG do QR (sem o prefixo data:). */
  qrcodeBase64: string | null;
};

/**
 * Busca o PIX de uma cobrança (endpoint separado no Asaas): o copia-e-cola
 * (`payload`) E a imagem do QR (`encodedImage`, base64 PNG). Assim a tela do
 * cliente mostra o QR sem depender do link externo do gateway.
 */
export async function obterPix(cobrancaId: string): Promise<PixCobranca> {
  try {
    const r = await req<{ payload?: string; encodedImage?: string }>(
      `/payments/${cobrancaId}/pixQrCode`,
      { method: "GET" },
    );
    return { copiaCola: r.payload ?? null, qrcodeBase64: r.encodedImage ?? null };
  } catch {
    return { copiaCola: null, qrcodeBase64: null };
  }
}
