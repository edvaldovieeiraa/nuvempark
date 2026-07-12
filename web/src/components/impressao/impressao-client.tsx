"use client";

import { useActionState, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Printer, Save, QrCode } from "lucide-react";
import { salvarCupom, type Resultado } from "@/app/painel/patios/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campos";

/**
 * Personalização do cupom impresso (cabeçalho/rodapé) com preview ao vivo —
 * o gestor vê como o ticket sai na impressora térmica enquanto digita.
 */
export function ImpressaoClient({
  patioId,
  patioNome,
  cabecalhoInicial,
  rodapeInicial,
}: {
  patioId: string;
  patioNome: string;
  cabecalhoInicial: string[];
  rodapeInicial: string[];
}) {
  const toast = useToast();
  const [cabecalho, setCabecalho] = useState(cabecalhoInicial.join("\n"));
  const [rodape, setRodape] = useState(rodapeInicial.join("\n"));
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    salvarCupom,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) toast.sucesso("Salvo!", estado.msg);
    else toast.erro("Não deu certo", estado.msg);
  }, [estado, toast]);

  const linhas = (s: string) =>
    s
      .split("\n")
      .map((l) => l.trim().slice(0, 48))
      .filter(Boolean)
      .slice(0, 4);

  const areaCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-borda bg-superficie text-sm " +
    "font-mono placeholder:text-texto-3 focus:outline-none focus:border-brand-400 " +
    "focus:ring-4 focus:ring-brand-500/15 resize-none";

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight">Impressão</h1>
        <p className="text-sm text-texto-2">
          <b className="text-texto">{patioNome}</b> · personalize o ticket que
          sai na impressora térmica. Até 4 linhas de 48 caracteres em cada
          bloco.
        </p>
      </motion.header>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Formulário */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06 }}
          className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
              <Printer className="w-4 h-4 text-brand-600" />
            </span>
            <h2 className="font-bold">Textos do cupom</h2>
          </div>
          <form action={agir} className="space-y-4">
            <input type="hidden" name="patio_id" value={patioId} />
            <Campo label="Cabeçalho (uma linha por linha)">
              <textarea
                name="cabecalho"
                rows={4}
                value={cabecalho}
                onChange={(e) => setCabecalho(e.target.value)}
                className={areaCls}
                placeholder={`${patioNome.toUpperCase()}\nRua Exemplo, 123 — Centro\nCNPJ 00.000.000/0001-00`}
              />
            </Campo>
            <Campo label="Rodapé">
              <textarea
                name="rodape"
                rows={3}
                value={rodape}
                onChange={(e) => setRodape(e.target.value)}
                className={areaCls}
                placeholder={`Obrigado pela preferência!\nNão nos responsabilizamos por objetos`}
              />
            </Campo>
            <Botao carregando={pendente}>
              <Save className="w-4 h-4" />
              Salvar cupom
            </Botao>
            <p className="text-xs text-texto-3">
              O app recebe na próxima sincronização — os próximos tickets já
              saem com o texto novo.
            </p>
          </form>
        </motion.section>

        {/* Preview */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="lg:sticky lg:top-6"
        >
          <p className="text-xs font-black uppercase tracking-wider text-texto-3 mb-2 pl-1">
            Prévia do ticket de entrada
          </p>
          <div className="mx-auto w-[300px] bg-white border border-borda rounded-sm shadow-[var(--shadow-card-hover)] px-4 py-5 font-mono text-[11.5px] leading-[1.6] text-noite">
            {/* Cabeçalho custom */}
            {linhas(cabecalho).length > 0 ? (
              linhas(cabecalho).map((l, i) => (
                <p key={i} className="text-center font-bold uppercase">
                  {l}
                </p>
              ))
            ) : (
              <p className="text-center font-bold uppercase text-texto-3">
                (sem cabeçalho)
              </p>
            )}
            <Separador />
            <p className="text-center font-black text-[13px] tracking-wider">
              TICKET DE ENTRADA
            </p>
            <Separador />
            <p>PLACA: <b className="tracking-[0.25em]">ABC1D23</b></p>
            <p>TIPO: CARRO</p>
            <p>
              ENTRADA:{" "}
              {new Date().toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p>OPERADOR: OPERADOR01</p>
            <Separador />
            <div className="grid place-items-center py-2">
              <span className="w-24 h-24 border-2 border-noite grid place-items-center">
                <QrCode className="w-16 h-16" />
              </span>
              <p className="mt-1 text-[10px] text-center">
                apresente na saída
              </p>
            </div>
            <Separador />
            {/* Rodapé custom */}
            {linhas(rodape).length > 0 ? (
              linhas(rodape).map((l, i) => (
                <p key={i} className="text-center">
                  {l}
                </p>
              ))
            ) : (
              <p className="text-center text-texto-3">(sem rodapé)</p>
            )}
            {/* impeccable-disable design-system-font-size -- preview do ticket térmico 58mm: 9px imita o tamanho físico do papel, não é a rampa de UI */}
            <p className="mt-3 text-center text-[9px] text-texto-3">
              nuvempark.com
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function Separador() {
  return (
    <p className="my-1.5 text-texto-3 select-none overflow-hidden whitespace-nowrap">
      {"- ".repeat(24)}
    </p>
  );
}
