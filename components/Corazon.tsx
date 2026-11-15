import type { CSSProperties } from "react";

interface Props {
  /** Latidos por minuto. Sin valor (o sin señal) el corazón queda quieto. */
  fc: number | null;
  color: string;
  className?: string;
}

/**
 * Corazón que late al ritmo de la frecuencia cardiaca medida: cada ciclo de la
 * animación dura 60 / fc segundos, con el doble golpe del latido real. Es
 * decorativo: el valor numérico sigue al lado como texto.
 */
export default function Corazon({ fc, color, className = "size-4" }: Props) {
  const late = fc !== null && fc > 0;
  // Se limita a 30–200 lpm para que valores raros no den animaciones absurdas.
  const duracion = late ? 60 / Math.min(200, Math.max(30, fc)) : 1;

  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} shrink-0 ${late ? "latido" : ""}`}
      style={{ "--duracion-latido": `${duracion.toFixed(2)}s` } as CSSProperties}
      aria-hidden
    >
      <path
        fill={color}
        d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z"
      />
    </svg>
  );
}
