"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleDollarSign,
  Plus,
  Trash2,
  Pencil,
  X,
  Calculator,
  Save,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { ModalSimulador } from "./simulador-modal";
import {
  atualizarTarifa,
  desativarTarifa,
  reordenarTarifas,
  type Resultado,
} from "@/app/painel/tarifas/actions";
import { nomeAmigavel } from "@/lib/nome-amigavel";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo, Input, Select } from "@/components/ui/campos";
import { Confirmar } from "@/components/ui/confirmar";
import { SecaoOpcional } from "@/components/ui/secao-opcional";

type Tarifa = {
  id: string;
  nome: string;
  patio_id: string;
  tipo_veiculo: string;
  fracao_inicial_minutos: number;
  fracao_inicial_valor: number;
  fracao_adicional_minutos: number;
  fracao_adicional_valor: number;
  teto_diaria: number;
  tolerancia_minutos: number;
  pernoite_valor: number;
  pernoite_hora_inicio: number;
  pernoite_hora_fim: number;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function TarifasClient({
  tarifas,
  patioId,
  patioNome,
  tipos,
}: {
  tarifas: Tarifa[];
  patioId: string;
  patioNome: string;
  tipos: string[];
}) {
  const [editando, setEditando] = useState<Tarifa | null>(null);
  const [simulando, setSimulando] = useState<Tarifa | null>(null);
  const [ordem, setOrdem] = useState<Tarifa[]>(tarifas);
  const [sujo, setSujo] = useState(false);
  const [salvandoOrdem, comecarOrdem] = useTransition();

  // Re-sincroniza quando a lista do server muda (após criar/desativar).
  const idsServidor = tarifas.map((t) => t.id).join();
  const [idsAnterior, setIdsAnterior] = useState(idsServidor);
  if (idsServidor !== idsAnterior) {
    setIdsAnterior(idsServidor);
    setOrdem(tarifas);
    setSujo(false);
  }

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= ordem.length) return;
    const copia = [...ordem];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setOrdem(copia);
    setSujo(true);
  }

  function salvarOrdem() {
    comecarOrdem(async () => {
      const r = await reordenarTarifas(ordem.map((t) => t.id));
      if (r?.ok) {
        toastRef.sucesso(r.msg);
        setSujo(false);
      } else toastRef.erro(r?.msg ?? "Erro inesperado.");
    });
  }

  const toastRef = useToast();

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Tarifas</h1>
          <p className="text-sm text-texto-2">
            Tabelas de preço do <b className="text-texto">{patioNome}</b> usadas
            pelo app na cobrança · <b>a ordem importa</b>: o app pré-seleciona a
            primeira.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sujo && (
            <button
              onClick={salvarOrdem}
              disabled={salvandoOrdem}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-brand-300 bg-brand-50 text-brand-700 font-bold text-sm hover:bg-brand-100 transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              Salvar ordem
            </button>
          )}
          <Link
            href={`/painel/tarifas/nova?patio=${patioId}`}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-sm shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova tarifa
          </Link>
        </div>
      </motion.header>

      {/* Lista */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        {tarifas.length === 0 ? (
          <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
            <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
              <CircleDollarSign className="w-6 h-6 text-brand-600" />
            </span>
            <p className="text-sm text-texto-3">
              Nenhuma tarifa neste pátio ainda.
            </p>
            <Link
              href={`/painel/tarifas/nova?patio=${patioId}`}
              className="text-sm font-bold text-brand-700 hover:underline"
            >
              Criar a primeira tarifa
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                  <th className="px-3 py-3 font-bold w-16">Ordem</th>
                  <th className="px-5 py-3 font-bold">Nome</th>
                  <th className="px-5 py-3 font-bold">Veículo</th>
                  <th className="px-5 py-3 font-bold text-right">Inicial</th>
                  <th className="px-5 py-3 font-bold text-right">Adicional</th>
                  <th className="px-5 py-3 font-bold text-right">Diária</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {ordem.map((t, i) => (
                    <motion.tr
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-t border-borda hover:bg-brand-50/40 transition-colors"
                    >
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1">
                          <div className="flex flex-col">
                            <button
                              onClick={() => mover(i, -1)}
                              disabled={i === 0}
                              aria-label="Subir"
                              className="w-6 h-5 grid place-items-center text-texto-3 hover:text-brand-700 disabled:opacity-25 disabled:pointer-events-none"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => mover(i, 1)}
                              disabled={i === ordem.length - 1}
                              aria-label="Descer"
                              className="w-6 h-5 grid place-items-center text-texto-3 hover:text-brand-700 disabled:opacity-25 disabled:pointer-events-none"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                          {i === 0 && (
                            <span
                              className="text-[10px] font-black uppercase text-brand-700 leading-tight"
                              title="Já vem selecionada no app"
                            >
                              padrão
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-bold">{t.nome}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-info-bg text-info">
                          {nomeAmigavel(t.tipo_veiculo)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        <b>{moeda.format(t.fracao_inicial_valor)}</b>
                        <span className="text-texto-3 text-xs">
                          {" "}
                          / {t.fracao_inicial_minutos}min
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        <b>{moeda.format(t.fracao_adicional_valor)}</b>
                        <span className="text-texto-3 text-xs">
                          {" "}
                          / {t.fracao_adicional_minutos}min
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums font-bold">
                        {t.teto_diaria > 0 ? (
                          moeda.format(t.teto_diaria)
                        ) : (
                          <span className="text-texto-3 font-normal text-xs">
                            sem teto
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSimulando(t)}
                          aria-label={`Simular cobrança da tarifa ${t.nome}`}
                          title="Simular cobrança"
                          className="w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                        >
                          <Calculator className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditando(t)}
                          aria-label={`Editar tarifa ${t.nome}`}
                          className="w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <BotaoDesativar tarifa={t} />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      <AnimatePresence>
        {editando && (
          <ModalEditarTarifa
            tarifa={editando}
            patioNome={patioNome}
            tipos={tipos}
            fechar={() => setEditando(null)}
          />
        )}
        {simulando && (
          <ModalSimulador
            nome={simulando.nome}
            tarifa={simulando}
            fechar={() => setSimulando(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ModalEditarTarifa({
  tarifa,
  patioNome,
  tipos,
  fechar,
}: {
  tarifa: Tarifa;
  patioNome: string;
  tipos: string[];
  fechar: () => void;
}) {
  const toast = useToast();
  const [comTeto, setComTeto] = useState(tarifa.teto_diaria > 0);
  const [comPernoite, setComPernoite] = useState(tarifa.pernoite_valor > 0);
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    atualizarTarifa,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.sucesso("Tarifa atualizada!", estado.msg);
      fechar();
    } else toast.erro("Não deu certo", estado.msg);
  }, [estado, toast, fechar]);

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
        className="w-full max-w-2xl rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-extrabold">Editar tarifa</h3>
          <button
            onClick={fechar}
            aria-label="Fechar"
            className="text-texto-3 hover:text-texto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-texto-2 mb-5">
          {patioNome} · a alteração vale já na próxima cobrança do app.
        </p>
        <form action={agir} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <input type="hidden" name="id" value={tarifa.id} />
          <Campo label="Nome">
            <Input name="nome" defaultValue={tarifa.nome} />
          </Campo>
          <Campo label="Tipo de veículo">
            <Select name="tipo_veiculo" defaultValue={tarifa.tipo_veiculo}>
              {/* tipo salvo que saiu do cadastro continua selecionável */}
              {!tipos.includes(tarifa.tipo_veiculo) &&
                tarifa.tipo_veiculo !== "ambos" && (
                  <option value={tarifa.tipo_veiculo}>
                    {nomeAmigavel(tarifa.tipo_veiculo)}
                  </option>
                )}
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {nomeAmigavel(t)}
                </option>
              ))}
              <option value="ambos">Todos os tipos</option>
            </Select>
          </Campo>
          <Campo label="Tolerância (min)">
            <Input
              name="tolerancia_minutos"
              type="number"
              defaultValue={String(tarifa.tolerancia_minutos)}
            />
          </Campo>
          <Campo label="Fração inicial (min)">
            <Input
              name="fracao_inicial_minutos"
              type="number"
              defaultValue={String(tarifa.fracao_inicial_minutos)}
            />
          </Campo>
          <Campo label="Valor inicial (R$)">
            <Input
              name="fracao_inicial_valor"
              defaultValue={String(tarifa.fracao_inicial_valor)}
            />
          </Campo>
          <Campo label="Fração adicional (min)">
            <Input
              name="fracao_adicional_minutos"
              type="number"
              defaultValue={String(tarifa.fracao_adicional_minutos)}
            />
          </Campo>
          <Campo label="Valor adicional (R$)">
            <Input
              name="fracao_adicional_valor"
              defaultValue={String(tarifa.fracao_adicional_valor)}
            />
          </Campo>

          <SecaoOpcional
            titulo="Teto de diária"
            descricao="Limita quanto o cliente paga no total. Se a soma das frações passar do teto, o app cobra só o valor do teto."
            habilitado={comTeto}
            onChange={setComTeto}
          >
            <Campo label="Teto (R$)">
              <Input
                name="teto_diaria"
                defaultValue={
                  tarifa.teto_diaria > 0 ? String(tarifa.teto_diaria) : "60.00"
                }
              />
            </Campo>
          </SecaoOpcional>
          {!comTeto && <input type="hidden" name="teto_diaria" value="0" />}

          <SecaoOpcional
            titulo="Pernoite"
            descricao="Valor fixo para quem atravessa a madrugada no pátio, dentro da janela definida. Substitui a cobrança por tempo nesse caso."
            habilitado={comPernoite}
            onChange={setComPernoite}
          >
            <Campo label="Valor do pernoite (R$)">
              <Input
                name="pernoite_valor"
                defaultValue={
                  tarifa.pernoite_valor > 0
                    ? String(tarifa.pernoite_valor)
                    : "40.00"
                }
              />
            </Campo>
            <Campo label="Início da janela (h)">
              <Input
                name="pernoite_hora_inicio"
                type="number"
                defaultValue={String(tarifa.pernoite_hora_inicio)}
              />
            </Campo>
            <Campo label="Fim da janela (h)">
              <Input
                name="pernoite_hora_fim"
                type="number"
                defaultValue={String(tarifa.pernoite_hora_fim)}
              />
            </Campo>
          </SecaoOpcional>
          {!comPernoite && (
            <>
              <input type="hidden" name="pernoite_valor" value="0" />
              <input
                type="hidden"
                name="pernoite_hora_inicio"
                value={String(tarifa.pernoite_hora_inicio)}
              />
              <input
                type="hidden"
                name="pernoite_hora_fim"
                value={String(tarifa.pernoite_hora_fim)}
              />
            </>
          )}
          <div className="col-span-full pt-1">
            <Botao carregando={pendente} className="w-full">
              Salvar alterações
            </Botao>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function BotaoDesativar({ tarifa }: { tarifa: Tarifa }) {
  const toast = useToast();

  return (
    <Confirmar
      titulo="Desativar tarifa?"
      descricao={`A tarifa "${tarifa.nome}" deixa de valer para novas cobranças no app. Tickets já abertos não são afetados.`}
      rotuloConfirmar="Desativar"
      aoConfirmar={async () => {
        const r = await desativarTarifa(tarifa.id);
        if (r?.ok) toast.sucesso(r.msg);
        else toast.erro(r?.msg ?? "Erro inesperado.");
      }}
    >
      {(abrir) => (
        <button
          onClick={abrir}
          aria-label={`Desativar tarifa ${tarifa.nome}`}
          className="w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-perigo hover:bg-perigo-bg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </Confirmar>
  );
}


