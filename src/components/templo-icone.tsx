/**
 * Silhueta estilizada de templo, com a torre central alta e uma figura no topo
 * — evoca o Templo do Rio de Janeiro sem copiar foto nem marca oficial.
 *
 * Usa currentColor para acompanhar a cor do texto ao redor.
 */
export function TemploIcone({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* base */}
      <path d="M2.5 21h19" />
      {/* alas laterais */}
      <path d="M4 21v-6h4v6" />
      <path d="M16 21v-6h4v6" />
      {/* torre central */}
      <path d="M9 21V9h6v12" />
      {/* portal */}
      <path d="M11 21v-4a1 1 0 0 1 2 0v4" />
      {/* pináculo */}
      <path d="M10.5 9 12 6l1.5 3" />
      <path d="M12 6V3.4" />
      {/* figura no topo */}
      <circle cx="12" cy="2.3" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
