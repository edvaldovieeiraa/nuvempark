"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Card de alerta no dashboard: dispositivo(s) aguardando liberação.
 * Assina Realtime em dispositivo_acessos (já na publication supabase_realtime)
 * para o aviso aparecer/sumir ao vivo, sem o gestor precisar recarregar.
 */
export function AlertaDispositivos({ total, patios }: { total: number; patios: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dispositivos-pendentes")
      .on("postgres_changes", { event: "*", schema: "public", table: "dispositivo_acessos" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dispositivos" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (total <= 0) return null;

  const onde =
    patios.length === 1
      ? `no ${patios[0]}`
      : patios.length > 1
        ? `em ${patios.length} pátios`
        : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Link
        href="/painel/dispositivos"
        className="flex items-center gap-3 rounded-2xl border border-aviso/30 bg-aviso-bg/50 px-4 py-3 hover:bg-aviso-bg transition-colors"
      >
        <span className="w-9 h-9 rounded-xl bg-aviso/15 grid place-items-center shrink-0">
          <AlertTriangle className="w-4.5 h-4.5 text-aviso" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-texto">
            {total === 1
              ? `1 dispositivo aguardando liberação ${onde}`
              : `${total} dispositivos aguardando liberação ${onde}`}
          </div>
          <div className="text-[12px] text-texto-2">Toque para revisar e liberar.</div>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-aviso shrink-0">
          Ver dispositivos
          <ChevronRight className="w-4 h-4" />
        </span>
      </Link>
    </motion.div>
  );
}
