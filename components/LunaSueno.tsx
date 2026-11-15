interface Props {
  /** Horas dormidas. Sin valor la luna queda quieta. */
  horas: number | null;
  color: string;
  className?: string;
}

/**
 * Luna con dos "z" que suben y se desvanecen. Con sueño insuficiente (menos de
 * 6 h) las "z" no aparecen: la ausencia se nota tanto como el color.
 * Decorativa: el valor numérico va al lado.
 */
export default function LunaSueno({ horas, color, className = "size-4" }: Props) {
  const descansa = horas !== null && horas >= 6;
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0 overflow-visible`} aria-hidden>
      <path d="M14.5 20.5A8.5 8.5 0 0 1 9 5a7 7 0 1 0 10 10 8.5 8.5 0 0 1-4.5 5.5z" fill={color} opacity="0.9" />
      {descansa && (
        <g fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path className="zeta" d="M16 3h3l-3 3.5h3" />
          <path className="zeta zeta-2" d="M19.5 7.5h2l-2 2.3h2" />
        </g>
      )}
    </svg>
  );
}
