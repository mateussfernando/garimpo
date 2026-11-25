/**
 * Marca do Garimpo (escolhida em 25/11): uma linha de preço que desce e termina numa pepita de ouro.
 * A linha usa a cor do texto (segue o tema); a pepita é o ouro. O mesmo desenho está em src/app/icon.svg (favicon)
 * e em src/app/apple-icon.tsx (ícone do celular): mudou aqui, mude lá também.
 */
export const LOGO_LINHA = "M4 8 10.5 13 15.5 10 23 21";

export function Logo({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={`flex-none ${className}`}>
      <path d={LOGO_LINHA} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24.5" cy="23" r="5" className="fill-gold" />
      <circle cx="23" cy="21.5" r="1.6" className="fill-gold-hi" />
    </svg>
  );
}
