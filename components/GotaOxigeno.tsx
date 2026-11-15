"use client";

import { useId } from "react";

interface Props {
  /** Saturación de oxígeno (%). Sin valor la gota queda vacía y quieta. */
  spo2: number | null;
  color: string;
  className?: string;
}

// La escala útil de la saturación es estrecha: 80 % o menos se ve vacía y 100 % llena.
const MINIMO = 80;

/**
 * Gota cuyo nivel de llenado refleja la saturación de oxígeno, con una
 * superficie que ondula. Es decorativa: el valor numérico va al lado.
 */
export default function GotaOxigeno({ spo2, color, className = "size-4" }: Props) {
  const idRecorte = useId();
  const activa = spo2 !== null;
  const nivel = activa ? Math.min(1, Math.max(0, (spo2 - MINIMO) / (100 - MINIMO))) : 0;
  // Interior de la gota: de y = 3 (arriba) a y = 22 (abajo).
  const superficie = 22 - nivel * 19;

  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} aria-hidden>
      <defs>
        <clipPath id={idRecorte}>
          <path d="M12 2.5C9 6.6 5.5 10.6 5.5 14.6a6.5 6.5 0 0 0 13 0c0-4-3.5-8-6.5-12.1z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${idRecorte})`}>
        {/* El grupo sube o baja con la saturación; la onda se desplaza en bucle. */}
        <g className="gota-nivel" style={{ transform: `translateY(${superficie}px)` }}>
          <path
            className={activa ? "gota-onda" : ""}
            fill={color}
            d="M-24 0q3 -1.6 6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0V24H-24z"
          />
        </g>
      </g>
      <path
        d="M12 2.5C9 6.6 5.5 10.6 5.5 14.6a6.5 6.5 0 0 0 13 0c0-4-3.5-8-6.5-12.1z"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  );
}
