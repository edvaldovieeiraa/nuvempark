/**
 * A marca NuvemPark: a nuvem com o "P". Fonte única — antes o mesmo SVG estava
 * copiado inline no site, no login, no painel e no placeholder de foto.
 *
 * Padrão da casa: a marca vai DENTRO de um selo com gradiente
 * `from-brand-500 to-acento-teal` (nuvem branca, P esmeralda). Onde o selo
 * pesaria demais — como na miniatura de "sem foto" — use as cores invertidas.
 */
export function Marca({
  className = "w-5 h-5",
  corNuvem = "white",
  corP = "#059669", // brand-600
}: {
  className?: string;
  corNuvem?: string;
  corP?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M7 18a4 4 0 0 1-.6-7.96 5.5 5.5 0 0 1 10.83-1.02A4.5 4.5 0 0 1 16.5 18H7Z"
        fill={corNuvem}
      />
      <path
        d="M10.6 15.5v-5h2.2a1.7 1.7 0 1 1 0 3.4h-2.2"
        stroke={corP}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
