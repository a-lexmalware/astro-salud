interface Props {
  valores: number[];
  color: string;
  etiqueta: string;
}

/** Gráfica mínima en SVG, sin dependencias. */
export default function Sparkline({ valores, color, etiqueta }: Props) {
  const ancho = 100;
  const alto = 28;
  if (valores.length < 2) return <div className="h-7" aria-hidden />;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const puntos = valores
    .map((v, i) => {
      const x = (i / (valores.length - 1)) * ancho;
      const y = alto - 2 - ((v - min) / rango) * (alto - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      preserveAspectRatio="none"
      className="h-7 w-full"
      role="img"
      aria-label={etiqueta}
    >
      <polyline
        points={puntos}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
