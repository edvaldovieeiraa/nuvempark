import { env } from '../env.js';
import type {
  CobrancaPix,
  GatewayTenant,
  PagamentoAdapter,
  StatusPagamento,
} from './adapter.js';

/**
 * Implementação Asaas do [PagamentoAdapter].
 *
 * TRÊS DIVERGÊNCIAS entre a doc oficial e o desenho original — resolvidas aqui:
 *
 * 1. `customer` é OBRIGATÓRIO em POST /payments, mas quem paga o ticket é
 *    anônimo (não vamos pedir CPF a quem só quer sair do estacionamento). Usamos
 *    um cliente genérico por tenant ("Pagamento avulso"), criado uma vez e
 *    reutilizado — guardado em `tenant_gateways.customer_padrao_id` pelo
 *    callback que a factory injeta (ver [PersistirCustomerPadrao]).
 * 2. `dueDate` tem granularidade de DIA e o QR do Asaas vale meses. Não dá para
 *    expirar a cobrança em N minutos NO PSP. A janela curta é regra NOSSA
 *    (`pagamentos_online.expira_em`); o Asaas só recebe a data de hoje.
 * 3. `User-Agent` é obrigatório para contas criadas a partir de 13/06/2024.
 *    Mandamos sempre.
 *
 * A chave da subconta NUNCA é logada.
 */

interface RespostaPagamento {
  id: string;
  status?: string;
}

interface RespostaQrCode {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
}

interface RespostaCliente {
  id: string;
}

/**
 * Chamado quando um cliente padrão é criado no PSP, para que o id sobreviva ao
 * processo. O adapter não fala com o banco (é PSP-only); quem sabe persistir é a
 * factory, que injeta isto.
 */
export type PersistirCustomerPadrao = (customerId: string) => Promise<void>;

export class AsaasAdapter implements PagamentoAdapter {
  constructor(
    private readonly cfg: GatewayTenant,
    private readonly persistirCustomerPadrao?: PersistirCustomerPadrao,
  ) {}

  private async chamar<T>(
    caminho: string,
    init?: { method?: string; body?: unknown },
  ): Promise<T> {
    const resp = await fetch(`${env.ASAAS_BASE_URL}${caminho}`, {
      method: init?.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Asaas não usa Bearer: o header é literalmente `access_token`.
        access_token: this.cfg.apiKey,
        // Obrigatório para contas novas (>= 13/06/2024) — sem isto, 401.
        'User-Agent': `NuvemPark/1.0 (Node.js; ${env.NODE_ENV})`,
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });

    if (!resp.ok) {
      // Corpo pode trazer a causa; a chave NÃO aparece aqui.
      const corpo = await resp.text().catch(() => '');
      throw new Error(
        `Asaas ${init?.method ?? 'GET'} ${caminho} → HTTP ${resp.status}: ${corpo.slice(0, 300)}`,
      );
    }
    return (await resp.json()) as T;
  }

  /**
   * Cliente genérico da subconta. O Asaas exige um `customer` na cobrança, e o
   * pagador do ticket não tem cadastro — então um só, reutilizado, resolve.
   *
   * O id é persistido via [persistirCustomerPadrao] assim que nasce. Sem isso,
   * `customer_padrao_id` fica nulo para sempre e cada Pix cria um cliente novo
   * no PSP — lixo na conta do tenant e uma chamada de rede a mais no caminho de
   * quem está com o cliente na frente.
   */
  async garantirClientePadrao(): Promise<string> {
    if (this.cfg.customerPadraoId) return this.cfg.customerPadraoId;

    const criado = await this.chamar<RespostaCliente>('/customers', {
      method: 'POST',
      body: {
        name: 'Pagamento avulso (NuvemPark)',
        // CPF genérico de teste do próprio Asaas — o pagador real é anônimo.
        // Em produção, o gestor pode trocar por um CNPJ do estacionamento.
        cpfCnpj: env.ASAAS_CPFCNPJ_CLIENTE_PADRAO,
        notificationDisabled: true,
      },
    });

    // Vale para o resto da vida deste adapter, mesmo se o banco recusar abaixo.
    this.cfg.customerPadraoId = criado.id;

    try {
      await this.persistirCustomerPadrao?.(criado.id);
    } catch (erro) {
      // O cliente JÁ existe no PSP e a cobrança pode seguir com ele. Derrubar o
      // Pix aqui seria trocar um desperdício por um carro preso na cancela — o
      // pior lado do trade-off. Sem persistir, o próximo Pix recria: o
      // comportamento de antes desta correção, não uma regressão.
      // eslint-disable-next-line no-console
      console.warn(
        `[asaas] cliente padrão ${criado.id} criado mas não persistido: ${
          erro instanceof Error ? erro.message : String(erro)
        }`,
      );
    }

    return criado.id;
  }

  async gerarCobrancaPix(params: {
    valor: number;
    descricao: string;
    referenciaExterna: string;
    expiracaoMinutos: number;
  }): Promise<CobrancaPix> {
    const customer = await this.garantirClientePadrao();

    // dueDate é DIA (não minuto). Hoje, em ISO curto.
    const hoje = new Date().toISOString().slice(0, 10);

    const split = this.montarSplit();

    const cobranca = await this.chamar<RespostaPagamento>('/payments', {
      method: 'POST',
      body: {
        customer,
        billingType: 'PIX',
        value: params.valor,
        dueDate: hoje,
        description: params.descricao,
        externalReference: params.referenciaExterna,
        ...(split.length > 0 ? { split } : {}),
      },
    });

    const qr = await this.chamar<RespostaQrCode>(
      `/payments/${cobranca.id}/pixQrCode`,
    );

    return {
      gatewayCobrancaId: cobranca.id,
      pixCopiaCola: qr.payload,
      pixQrcodeBase64: qr.encodedImage,
      // Janela NOSSA, não a do Asaas (ver divergência 2 no topo).
      expiraEm: new Date(Date.now() + params.expiracaoMinutos * 60_000),
    };
  }

  async consultarStatus(gatewayCobrancaId: string): Promise<StatusPagamento> {
    const p = await this.chamar<RespostaPagamento>(
      `/payments/${gatewayCobrancaId}`,
    );
    return mapearStatus(p.status);
  }

  /**
   * Split: a plataforma retém sua parte na wallet dela; o resto fica na subconta
   * do tenant, que é a dona da cobrança. Sem wallet configurada, sem split — a
   * cobrança segue inteira para o tenant (não bloqueia o pagamento).
   */
  private montarSplit(): Array<Record<string, string | number>> {
    const wallet = env.ASAAS_WALLET_PLATAFORMA;
    if (!wallet) return [];

    const { splitPercentual, splitValorFixo } = this.cfg;
    if (splitPercentual <= 0 && splitValorFixo <= 0) return [];

    const item: Record<string, string | number> = { walletId: wallet };
    if (splitPercentual > 0) item.percentualValue = splitPercentual;
    if (splitValorFixo > 0) item.fixedValue = splitValorFixo;
    return [item];
  }
}

/**
 * Status do Asaas → união do adapter. EXPLÍCITO de propósito: um status novo do
 * PSP não pode ser confundido com "pago" — na dúvida é 'pendente', e o webhook
 * (fonte da verdade) confirma depois.
 *
 * Exportado para teste.
 */
export function mapearStatus(status: string | undefined): StatusPagamento {
  switch (status) {
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
      return 'pago';
    case 'OVERDUE':
      return 'expirado';
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
    case 'AWAITING_CHARGEBACK_REVERSAL':
      return 'cancelado';
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return 'pendente';
    default:
      // Status desconhecido nunca vira "pago" por acidente.
      // eslint-disable-next-line no-console
      console.warn(`[asaas] status desconhecido: ${status ?? '(vazio)'} → pendente`);
      return 'pendente';
  }
}
