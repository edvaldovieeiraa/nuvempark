/** "van grande" → "Van Grande"; "ambos" → "Todos os tipos". */
export function nomeAmigavel(tipo: string): string {
  if (tipo === "ambos") return "Todos os tipos";
  return tipo
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
