// Utilidades puras de formatação/cálculo financeiro — seguras no client.
// (Sem "server-only": é usado por client components de faturas/inadimplência.)

export const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarCompetencia(iso: string): string {
  // iso = 'yyyy-mm-dd' (1º do mês). Ex.: "julho de 2026"
  const [ano, mes] = iso.split("-").map(Number);
  const nomes = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${nomes[(mes ?? 1) - 1]} de ${ano}`;
}

export function competenciaCurta(iso: string): string {
  const [ano, mes] = iso.split("-");
  return `${mes}/${ano}`;
}

export function diasEmAtraso(vencimentoIso: string): number {
  const venc = new Date(vencimentoIso + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = Math.floor((hoje.getTime() - venc.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

export type EstadoFatura = "aberta" | "paga" | "vencida" | "cancelada";

export const ESTADO_FATURA: Record<
  EstadoFatura,
  { rotulo: string; cls: string }
> = {
  aberta: { rotulo: "Aberta", cls: "bg-info-bg text-info border-info/20" },
  paga: { rotulo: "Paga", cls: "bg-brand-50 text-brand-700 border-brand-200" },
  vencida: { rotulo: "Vencida", cls: "bg-perigo-bg text-perigo border-perigo/20" },
  cancelada: { rotulo: "Cancelada", cls: "bg-fundo text-texto-3 border-borda" },
};
