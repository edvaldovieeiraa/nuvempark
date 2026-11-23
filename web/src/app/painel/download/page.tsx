"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Smartphone, Copy, Check, RefreshCw, TriangleAlert } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { URL_APP } from "@/lib/app-links";
import { SelosLojas } from "@/components/site/selos-lojas";

/**
 * O app do operador só se instala pelas lojas (Google Play e App Store). O APK
 * solto que esta página distribuía saiu em 22/11/2026, quando a Play publicou.
 *
 * Quem ainda roda o APK antigo precisa trocar: a versão da Play é assinada com
 * outra chave, então não instala por cima — e, no Android 8+, o ANDROID_ID muda
 * junto com a chave. O servidor reconhece reinstalação pelo ANDROID_ID
 * (`mergePorAndroidId`, na API), então o mesmo celular volta como aparelho
 * NOVO. Por isso o passo de revogar o antigo em Dispositivos ANTES de entrar:
 * com o slot incluso livre, o celular entra nele sem cobrança extra.
 */
const TROCA_APK: string[] = [
  "Abra o app antigo com internet e espere sincronizar, para não perder nada que ainda não subiu.",
  "Em Dispositivos, aqui no painel, revogue esse celular. Assim ele volta a ocupar a vaga incluída, sem cobrança extra.",
  "Desinstale o app antigo e instale o NuvemPark pela Google Play.",
  "Entre com o código do estacionamento, o usuário e a senha de sempre.",
];

export default function DownloadPage() {
  const toast = useToast();
  const [copiado, setCopiado] = useState(false);

  function copiarLink() {
    navigator.clipboard.writeText(URL_APP);
    setCopiado(true);
    toast.sucesso("Link copiado!", "Abre a loja certa em qualquer celular, Android ou iPhone.");
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
          Instale o app do operador pela loja oficial do celular — Google Play no Android, App Store
          no iPhone.
        </p>
      </motion.header>

      {/* Lojas */}
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
              Android e iPhone · procure por “NuvemPark” na loja ou toque no selo
            </div>
          </div>
        </div>

        <div className="mt-5">
          <SelosLojas altura={48} />
        </div>

        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            onClick={copiarLink}
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl font-bold text-sm border border-borda text-texto-2 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all"
          >
            {copiado ? <Check className="w-4 h-4 text-brand-600" /> : <Copy className="w-4 h-4" />}
            {copiado ? "Copiado" : "Copiar link para o operador"}
          </button>
        </div>

        <p className="mt-3 text-[12px] text-texto-3 text-center">
          O link <b>{URL_APP.replace(/^https?:\/\//, "")}</b> abre a loja certa sozinho: Google Play
          no Android, App Store no iPhone. Mande pelo WhatsApp para quem vai operar.
        </p>
        <p className="mt-2 text-[12px] text-texto-3 text-center">
          No iPhone, a impressão do ticket funciona com impressoras térmicas Bluetooth LE.
        </p>
      </motion.section>

      {/* Quem ainda está no APK antigo */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
        className="bg-superficie border border-aviso/30 rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        <div className="flex items-start gap-3 px-5 py-4 bg-aviso-bg/60 border-b border-aviso/20">
          <TriangleAlert className="w-5 h-5 text-aviso shrink-0 mt-0.5" />
          <div>
            <h2 className="font-extrabold text-sm">Seu Android ainda usa o app instalado por APK?</h2>
            <p className="text-[13px] text-texto-2 mt-0.5">
              A versão da Google Play não instala por cima da antiga. Faça a troca uma vez em cada
              celular:
            </p>
          </div>
        </div>
        <ol className="divide-y divide-borda">
          {TROCA_APK.map((texto, i) => (
            <li key={i} className="flex items-start gap-4 px-5 py-3.5">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-[12px] font-black grid place-items-center shrink-0">
                {i + 1}
              </span>
              <p className="text-[13px] text-texto-2 leading-relaxed">
                {i === 1 ? (
                  <>
                    Em{" "}
                    <Link href="/painel/dispositivos" className="font-bold text-brand-700 hover:underline">
                      Dispositivos
                    </Link>
                    , aqui no painel, revogue esse celular. Assim ele volta a ocupar a vaga incluída,
                    sem cobrança extra.
                  </>
                ) : (
                  texto
                )}
              </p>
            </li>
          ))}
        </ol>
      </motion.section>

      {/* Atualização */}
      <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info-bg/50 px-4 py-3">
        <RefreshCw className="w-4 h-4 text-info shrink-0 mt-0.5" />
        <p className="text-[13px] text-texto-2">
          <b>Atualizações:</b> chegam pela própria loja, como em qualquer app. Os dados do aparelho
          (tickets pendentes, caixa) são preservados.
        </p>
      </div>
    </div>
  );
}
