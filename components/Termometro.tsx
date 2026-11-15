interface Props {
  /** Temperatura en °C. Sin valor el termómetro queda vacío. */
  temp: number | null;
  color: string;
  /** Con fiebre o hipotermia el depósito late para llamar la atención. */
  alerta: boolean;
  className?: string;
}

// Escala visible del tubo: 35 °C vacío, 39 °C lleno.
const MIN = 35;
const MAX = 39;

/** Termómetro cuya columna sube con la temperatura. Decorativo: el valor va al lado. */
export default function Termometro({ temp, color, alerta, className = "size-4" }: Props) {
  const nivel = temp === null ? 0 : Math.min(1, Math.max(0, (temp - MIN) / (MAX - MIN)));
  // Interior del tubo: de y = 4 (arriba) a y = 15 (donde empieza el depósito).
  const alto = nivel * 11;

  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} aria-hidden>
      <path
        d="M10 4a2 2 0 0 1 4 0v10.3a4.5 4.5 0 1 1-4 0z"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect
        className="termometro-columna"
        x="11.1"
        y={15 - alto}
        width="1.8"
        height={alto + 1}
        rx="0.9"
        fill={color}
      />
      <circle className={alerta ? "termometro-alerta" : ""} cx="12" cy="18" r="2.6" fill={color} />
    </svg>
  );
}
