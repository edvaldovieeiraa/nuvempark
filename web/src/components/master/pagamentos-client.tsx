"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Wallet,
  CreditCard,
  X,
  CheckCircle2,
  AlertTriangle,
  Power,
  Trash2,
  Settings2,
  Info,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import {
  configurarGateway,
  alternarGatewayAtivo,
  removerGateway,
  type Resultado,
} from "@/app/master/(console)/pagamentos/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/campos";
import { ResponsiveTable } from "@/components/ui/responsive-table";

export type GatewayRow = {
  tenantId: string;
  nome: string;
  codigo: string;
  tenantAtivo: boolean;
  configurado: boolean;
  gatewayAtivo: boolean;
  subcontaId: string | null;
  splitPercentual: number;
  splitValorFixo: number;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function PagamentosClient({
  linhas,
  ambiente,
  cryptoPronto,
}: {
  linhas: GatewayRow[];
  ambiente: "sandbox" | "producao";
  cryptoPronto: boolean;
}) {
  const [editar, setEditar] = useState<GatewayRow | null>(null);

  const ativos = linhas.filter((l) => l.configurado && l.gatewayAtivo).length;
  const semGateway = linhas.filter(
    (l) => l.tenantAtivo && !l.configurado,
  ).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <h1 className="text-[26px] font-black tracking-tight">
            Pagamentos (gateway)
          </h1>
          <AmbienteBadge ambiente={ambiente} />
        </div>
        <p className="text-sm text-texto-2">
          {ativos} {ativos === 1 ? "rede cobrando" : "redes cobrando"} Pix
          {semGateway > 0 && (
            <>
              {" · "}
              <b className="text-aviso">{semGateway}</b> sem gateway
            </>
          )}
        </p>
      </motion.header>

      {/* Documentação sempre visível — o "não esquecer" mora aqui. */}
      <Doc ambiente={ambiente} />

      {!cryptoPronto && (
        <div className="rounded-2xl border border-perigo/25 bg-perigo-bg p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-perigo shrink-0 mt-0.5" />
          <div className="text-sm text-texto">
            <b>Falta configurar a criptografia.</b> A variável{" "}
            <code className="font-mono text-xs bg-superficie px-1 py-0.5 rounded border border-borda">
              NUVEMPARK_CRYPTO_KEY
            </code>{" "}
            não está no ambiente do painel. Ela precisa ter o{" "}
            <b>mesmo valor da API</b> — sem isso, a chave gravada aqui não é
            decifrável lá e o Pix não gera. Salvar está desabilitado até então.
          </div>
        </div>
      )}

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        {linhas.length === 0 ? (
          <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
            <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
              <Wallet className="w-6 h-6 text-brand-600" />
            </span>
            <p className="text-sm text-texto-3">Nenhuma rede cadastrada ainda.</p>
          </div>
        ) : (
          <ResponsiveTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                  <th className="px-5 py-3 font-bold">Rede</th>
                  <th className="px-5 py-3 font-bold">Gateway</th>
                  <th className="px-5 py-3 font-bold hidden md:table-cell">
                    Split plataforma
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <LinhaGateway
                    key={l.tenantId}
                    linha={l}
                    onConfigurar={() => setEditar(l)}
                  />
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </motion.section>

      <AnimatePresence>
        {editar && (
          <ModalConfigurar
            linha={editar}
            ambiente={ambiente}
            podeSalvar={cryptoPronto}
            fechar={() => setEditar(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AmbienteBadge({ ambiente }: { ambiente: "sandbox" | "producao" }) {
  return ambiente === "sandbox" ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-info bg-info-bg border border-info/25 px-2 py-0.5 rounded-full">
      <FlaskConical className="w-3 h-3" />
      Sandbox
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
      <ShieldCheck className="w-3 h-3" />
      Produção
    </span>
  );
}

function Doc({ ambiente }: { ambiente: "sandbox" | "producao" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.04 }}
      className="rounded-2xl border border-info/20 bg-info-bg/50 p-4 sm:p-5 space-y-3"
    >
      <div className="flex items-center gap-2 text-texto font-extrabold">
        <Info className="w-4 h-4 text-info" />
        Como funciona (leia antes)
      </div>
      <ul className="text-sm text-texto-2 space-y-2 leading-relaxed">
        <li>
          <b className="text-texto">Cada rede que cobra Pix precisa da própria
          conta Asaas ligada aqui.</b>{" "}
          Sem esta linha, o app mostra “sem conexão” na hora de gerar o Pix — o
          servidor não acha o gateway do tenant e para antes de falar com o
          Asaas.
        </li>
        <li>
          <b className="text-texto">Faça isto ao ativar uma rede nova</b> que vá
          usar pagamento online. É um passo do onboarding, fácil de esquecer — a
          coluna <b>Gateway</b> abaixo mostra quem ainda está{" "}
          <span className="text-aviso font-bold">sem</span>.
        </li>
        <li>
          <b className="text-texto">A chave precisa ser do mesmo ambiente</b> que
          a API usa. Hoje a API está em{" "}
          <b>{ambiente === "sandbox" ? "sandbox (teste)" : "produção"}</b>. Colar
          uma chave de produção com a API em sandbox (ou o contrário) resulta em
          401. Ao salvar, a chave é <b>testada no Asaas</b> antes de gravar.
        </li>
        <li>
          A chave é <b>cifrada</b> antes de ir ao banco e nunca é exibida de
          volta. Para trocá-la, cole uma nova.
        </li>
      </ul>
    </motion.div>
  );
}

function LinhaGateway({
  linha,
  onConfigurar,
}: {
  linha: GatewayRow;
  onConfigurar: () => void;
}) {
  const toast = useToast();
  const [, comecar] = useTransition();

  function agir(fn: () => Promise<Resultado>) {
    comecar(async () => {
      const r = await fn();
      if (r?.ok) toast.sucesso(r.msg);
      else toast.erro(r?.msg ?? "Erro inesperado.");
    });
  }

  return (
    <tr className="border-t border-borda hover:bg-brand-50/40 transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white shrink-0">
            <CreditCard className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="font-bold truncate">{linha.nome}</div>
            <div className="text-[11px] font-mono font-bold tracking-[0.2em] text-texto-3">
              {linha.codigo}
            </div>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <StatusGateway linha={linha} />
      </td>
      <td className="px-5 py-3.5 hidden md:table-cell text-texto-2 tabular-nums whitespace-nowrap">
        {linha.configurado ? (
          linha.splitPercentual > 0 || linha.splitValorFixo > 0 ? (
            <>
              {linha.splitPercentual > 0 && <>{linha.splitPercentual}%</>}
              {linha.splitPercentual > 0 && linha.splitValorFixo > 0 && " + "}
              {linha.splitValorFixo > 0 && moeda.format(linha.splitValorFixo)}
            </>
          ) : (
            <span className="text-texto-3">sem split</span>
          )
        ) : (
          <span className="text-texto-3">—</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1.5">
          {linha.configurado && (
            <>
              <button
                onClick={() =>
                  agir(() =>
                    alternarGatewayAtivo(linha.tenantId, linha.gatewayAtivo),
                  )
                }
                title={linha.gatewayAtivo ? "Desativar" : "Ativar"}
                className="toque-44 w-9 h-9 rounded-lg grid place-items-center text-texto-3 hover:text-texto hover:bg-fundo transition-colors"
              >
                <Power className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Remover o gateway de "${linha.nome}"? A rede volta a não cobrar Pix.`,
                    )
                  )
                    agir(() => removerGateway(linha.tenantId));
                }}
                title="Remover"
                className="toque-44 w-9 h-9 rounded-lg grid place-items-center text-texto-3 hover:text-perigo hover:bg-perigo-bg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <Botao onClick={onConfigurar} type="button" variante="fantasma">
            <Settings2 className="w-4 h-4" />
            {linha.configurado ? "Editar" : "Configurar"}
          </Botao>
        </div>
      </td>
    </tr>
  );
}

function StatusGateway({ linha }: { linha: GatewayRow }) {
  if (!linha.configurado)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-aviso-bg text-aviso border-aviso/25">
        <AlertTriangle className="w-3.5 h-3.5" />
        Não configurado
      </span>
    );
  if (linha.gatewayAtivo)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-brand-50 text-brand-700 border-brand-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Ativo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-fundo text-texto-3 border-borda">
      Inativo
    </span>
  );
}

function ModalConfigurar({
  linha,
  ambiente,
  podeSalvar,
  fechar,
}: {
  linha: GatewayRow;
  ambiente: "sandbox" | "producao";
  podeSalvar: boolean;
  fechar: () => void;
}) {
  const toast = useToast();
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    configurarGateway,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso("Gateway salvo!", estado.msg);
      fechar();
    } else {
      toast.erro("Não deu certo", estado.msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
      onClick={fechar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6 max-h-[88dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-extrabold">
            {linha.configurado ? "Editar gateway" : "Configurar gateway"}
          </h3>
          <button
            onClick={fechar}
            aria-label="Fechar"
            className="toque-44 text-texto-3 hover:text-texto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-texto-2 mb-4">
          {linha.nome} · <AmbienteBadge ambiente={ambiente} />
        </p>

        <form action={agir} className="space-y-4">
          <input type="hidden" name="tenant_id" value={linha.tenantId} />

          <Campo label="Chave de API da subconta (Asaas)">
            <Input
              name="api_key"
              type="password"
              required
              autoComplete="off"
              placeholder={
                linha.configurado
                  ? "Cole uma nova chave para trocar"
                  : "$aact_..."
              }
            />
          </Campo>

          <Campo label="Wallet ID da subconta (opcional)">
            <Input
              name="subconta_id"
              defaultValue={linha.subcontaId ?? ""}
              placeholder="ex.: 1a2b3c..."
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Split plataforma (%)">
              <Input
                name="split_percentual"
                inputMode="decimal"
                defaultValue={String(linha.splitPercentual || 0)}
              />
            </Campo>
            <Campo label="Split fixo (R$)">
              <Input
                name="split_valor_fixo"
                inputMode="decimal"
                defaultValue={String(linha.splitValorFixo || 0)}
              />
            </Campo>
          </div>

          <label className="flex items-center gap-2.5 text-sm font-semibold text-texto-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="ativo"
              value="true"
              defaultChecked
              className="w-4 h-4 accent-brand-600"
            />
            Ativar o gateway agora
          </label>
          {/* Quando o checkbox some do FormData (desmarcado), o server lê "false". */}
          <input type="hidden" name="ativo" value="false" />

          <p className="text-xs text-texto-3 leading-relaxed">
            Ao salvar, a chave é testada no Asaas ({ambiente}) e cifrada antes de
            ir ao banco.
          </p>

          <Botao carregando={pendente} disabled={!podeSalvar} className="w-full">
            {podeSalvar
              ? "Testar e salvar"
              : "Indisponível (falta NUVEMPARK_CRYPTO_KEY)"}
          </Botao>
        </form>
      </motion.div>
    </motion.div>
  );
}
