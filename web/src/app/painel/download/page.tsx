"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Smartphone,
  Copy,
  Check,
  ShieldQuestion,
  FolderOpen,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { APK_URL } from "@/lib/apk";

const PASSOS: { Icone: typeof ShieldQuestion; titulo: string; texto: string }[] = [
  {
    Icone: Download,
    titulo: "Baixe o arquivo",
    texto:
      "Toque em “Baixar APK”. Se o navegador avisar que o arquivo “pode ser prejudicial”, é normal para instaladores — toque em “Baixar mesmo assim”.",
  },
  {
    Icone: FolderOpen,
    titulo: "Abra o arquivo baixado",
    texto:
      "Toque na notificação de download concluído, ou abra o app “Arquivos” → Downloads e toque no nuvempark.apk.",
  },
  {
    Icone: ShieldQuestion,
    titulo: "Permita a instalação (só na 1ª vez)",
    texto:
      "O Android vai pedir permissão para “instalar apps desconhecidos”. Toque em “Configurações”, ative “Permitir desta fonte” e volte.",
  },
  {
    Icone: CheckCircle2,
    titulo: "Instale e abra",
    texto:
      "Toque em “Instalar” e aguarde. Ao terminar, toque em “Abrir” — pronto, o app está no aparelho.",
  },
];

export default function DownloadPage() {
  const toast = useToast();
  const [copiado, setCopiado] = useState(false);

  function copiarLink() {
    navigator.clipboard.writeText(APK_URL);
    setCopiado(true);
    toast.sucesso("Link copiado!", "Cole no navegador do aparelho onde vai instalar.");
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight">Baixar o app</h1>
        <p className="text-sm text-texto-2">
          Instale o app do operador nos aparelhos que vão trabalhar nos seus pátios (Android).
        </p>
      </motion.header>

      {/* Card de download */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-6"
      >
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white shrink-0 shadow-[var(--shadow-brand)]">
            <Smartphone className="w-8 h-8" />
          </span>
          <div className="flex-1 text-center sm:text-left">
            <div className="font-extrabold text-lg">App do operador · NuvemPark</div>
            <div className="text-[13px] text-texto-2">
              Android · atualização instala por cima (mantém os dados do aparelho)
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <motion.a
            whileTap={{ scale: 0.97 }}
            href={APK_URL}
            download="nuvempark.apk"
            className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand-600 to-brand-500 shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
          >
            <Download className="w-5 h-5" />
            Baixar APK
          </motion.a>
          <button
            onClick={copiarLink}
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl font-bold text-sm border border-borda text-texto-2 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all"
          >
            {copiado ? <Check className="w-4 h-4 text-brand-600" /> : <Copy className="w-4 h-4" />}
            {copiado ? "Copiado" : "Copiar link"}
          </button>
        </div>

        <p className="mt-3 text-[12px] text-texto-3">
          Dica: o jeito mais fácil é abrir <b>esta página no próprio aparelho</b> onde o app vai ser
          instalado (use “Copiar link” e cole no navegador do celular/tablet).
        </p>
      </motion.section>

      {/* Tutorial */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-borda">
          <h2 className="font-extrabold text-sm">Como instalar no Android</h2>
        </div>
        <ol className="divide-y divide-borda">
          {PASSOS.map((p, i) => (
            <li key={i} className="flex items-start gap-4 px-5 py-4">
              <span className="relative shrink-0">
                <span className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center">
                  <p.Icone className="w-5 h-5 text-brand-600" />
                </span>
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-brand-600 text-white text-[11px] font-black grid place-items-center">
                  {i + 1}
                </span>
              </span>
              <div className="min-w-0">
                <div className="font-bold text-sm">{p.titulo}</div>
                <p className="text-[13px] text-texto-2 leading-relaxed mt-0.5">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </motion.section>

      {/* Atualização */}
      <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info-bg/50 px-4 py-3">
        <RefreshCw className="w-4 h-4 text-info shrink-0 mt-0.5" />
        <p className="text-[13px] text-texto-2">
          <b>Atualizar o app:</b> quando sair uma versão nova, baixe daqui de novo e instale por cima
          — os dados do aparelho (tickets pendentes, caixa) são preservados.
        </p>
      </div>
    </div>
  );
}
