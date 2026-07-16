"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { RefreshCw } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatarDataHora } from "@/lib/format-data";

/** `patio_id → ISO` da atividade mais recente daquele pátio. */
export type Atividade = Record<string, string>;

/** Abaixo disto o app é considerado conectado (o heartbeat bate a cada 60s). */
const LIMITE_ONLINE_MS = 3 * 60 * 1000;

/** De quanto em quanto tempo o verde/cinza é reavaliado no cliente. */
const RECALCULO_MS = 30_000;

/** Marca sentinela do render no servidor, onde não há veredito de online. */
const SERVIDOR = -1;

/**
 * O relógio como "store externo" — é exatamente o que ele é, do ponto de vista
 * do React: um valor mutável que muda sozinho, fora da árvore.
 *
 * `marcaAgora` é QUANTIZADA em RECALCULO_MS de propósito: getSnapshot precisa
 * devolver o mesmo valor entre renders do mesmo instante, senão o React
 * re-renderiza em loop. O efeito colateral é justamente o desejado — o
 * indicador só é reavaliado a cada 30s, e sem tocar no banco.
 */
function assinarRelogio(aoMudar: () => void): () => void {
  const t = setInterval(aoMudar, RECALCULO_MS);
  return () => clearInterval(t);
}
const marcaAgora = (): number => Math.floor(Date.now() / RECALCULO_MS) * RECALCULO_MS;
const marcaNoServidor = (): number => SERVIDOR;

/**
 * Mantém, ao vivo, a última atividade de cada pátio da rede.
 *
 * DUAS FONTES, uma data só (a mais recente das duas):
 *   • `dispositivos.ultimo_acesso` — o heartbeat do app (60s). Prova que o
 *     tablet está vivo mesmo num pátio parado, sem nenhum dado novo.
 *   • `tickets.sincronizado_em` — prova que o app subiu dado de verdade.
 *
 * Ambas as tabelas estão na publication do Realtime (db/24 e db/07) e a RLS
 * filtra os eventos pelo tenant da sessão — o canal só entrega o que este
 * gestor já podia ler.
 *
 * `inicial` vem do servidor (sidebar, server component) para a primeira pintura
 * não piscar; o fetch do mount e os eventos só melhoram esse valor.
 */
export function useUltimaAtividade(inicial: Atividade): Atividade {
  const [atividade, setAtividade] = useState<Atividade>(inicial);

  // Só avança a data de um pátio — nunca retrocede. Eventos chegam fora de
  // ordem (heartbeat e sync são caminhos independentes), e um evento antigo
  // não pode fazer o painel "voltar no tempo".
  const carimbar = useCallback((patioId: string, iso: string) => {
    setAtividade((atual) =>
      atual[patioId] && atual[patioId] >= iso
        ? atual
        : { ...atual, [patioId]: iso },
    );
  }, []);

  const buscar = useCallback(async () => {
    const supabase = createClient();
    // Sessão do gestor → RLS ativa: só os dispositivos do próprio tenant.
    const { data } = await supabase
      .from("dispositivos")
      .select("patio_id, ultimo_acesso")
      .not("ultimo_acesso", "is", null);

    for (const linha of data ?? []) {
      const patioId = campo(linha, "patio_id");
      const iso = campo(linha, "ultimo_acesso");
      if (patioId && iso) carimbar(patioId, iso);
    }
  }, [carimbar]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("atividade-patio")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dispositivos" },
        ({ new: linha }) => {
          const patioId = campo(linha, "patio_id");
          const iso = campo(linha, "ultimo_acesso");
          if (patioId && iso) carimbar(patioId, iso);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        ({ new: linha }) => {
          const patioId = campo(linha, "patio_id");
          const iso = campo(linha, "sincronizado_em");
          if (patioId && iso) carimbar(patioId, iso);
        },
      )
      .subscribe((status) => {
        // Refaz o fetch a cada (re)inscrição: o canal pode ter caído (wifi,
        // aba dormindo, deploy) e os eventos daquele intervalo são perdidos
        // para sempre — o Realtime não tem replay. Sem isto, a data ficaria
        // congelada até o próximo evento OU até um F5, que é justamente o que
        // este componente existe para eliminar.
        if (status === "SUBSCRIBED") void buscar();
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [buscar, carimbar]);

  return atividade;
}

/**
 * Data da última atividade do pátio + indicador de conectividade do app.
 * Discreta de propósito: é um sinal de saúde, não uma ação.
 */
export function UltimaAtividade({ iso }: { iso?: string }) {
  // O relógio é uma fonte externa mutável — ler Date.now() no corpo do render
  // seria impuro e divergiria entre servidor e cliente na hidratação.
  const marca = useSyncExternalStore(assinarRelogio, marcaAgora, marcaNoServidor);

  const online =
    iso != null &&
    marca !== SERVIDOR &&
    marca - new Date(iso).getTime() < LIMITE_ONLINE_MS;

  return (
    <div className="mt-1.5 px-1 space-y-1">
      <p
        className="flex items-center gap-1.5 text-[10px] leading-tight text-white/40"
        title={
          iso
            ? "Última vez que o app deste pátio falou com a nuvem"
            : "Este pátio ainda não enviou nada pelo app"
        }
      >
        <RefreshCw className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {iso ? `Atualizado ${formatarDataHora(iso)}` : "Nunca sincronizou"}
        </span>
      </p>
      <p className="flex items-center gap-1.5 text-[10px] leading-tight">
        <span className="relative flex w-1.5 h-1.5 shrink-0" aria-hidden="true">
          {online && (
            <span className="absolute inline-flex w-full h-full rounded-full bg-brand-500 animate-ping-slow" />
          )}
          <span
            className={`relative inline-flex w-1.5 h-1.5 rounded-full ${
              online ? "bg-brand-500" : "bg-white/30"
            }`}
          />
        </span>
        <span
          className={`truncate font-semibold ${online ? "text-brand-400" : "text-white/40"}`}
        >
          {online ? "App conectado" : "App offline"}
        </span>
      </p>
    </div>
  );
}

/**
 * Lê um campo string de uma linha vinda do Realtime/PostgREST.
 *
 * Os payloads do Realtime são `{} | {[k: string]: any}` — acessar `.patio_id`
 * direto não compila no modo estrito, e um `as` cego mentiria sobre o que
 * chegou pela rede. Aqui a checagem é de verdade: o que não for string não
 * passa, e o chamador decide o que fazer com o null.
 */
function campo(linha: unknown, nome: string): string | null {
  if (typeof linha !== "object" || linha === null) return null;
  const valor = (linha as Record<string, unknown>)[nome];
  return typeof valor === "string" && valor !== "" ? valor : null;
}
