import Image from "next/image";
import { iniciales, type Astronauta } from "@/lib/tipos";

interface Props {
  astronauta: Astronauta;
  /** Texto alternativo; vacío si el nombre ya está al lado. */
  alt?: string;
  /** Ancho aproximado en pantalla, para que Next sirva el tamaño justo. */
  sizes: string;
  /** Proporción del retrato (clases de Tailwind). */
  aspecto?: string;
  className?: string;
}

/** Retrato 4:5 del astronauta o, si aún no hay foto, sus iniciales. */
export default function FotoAstronauta({ astronauta, alt = "", sizes, aspecto = "aspect-[4/5]", className = "" }: Props) {
  if (astronauta.foto) {
    return (
      <div className={`relative w-full overflow-hidden bg-panel-2 ${aspecto} ${className}`}>
        <Image src={astronauta.foto} alt={alt} fill sizes={sizes} className="object-cover object-[50%_25%]" />
      </div>
    );
  }

  return (
    <div
      className={`visor relative grid w-full place-items-center ${aspecto} overflow-hidden ${className}`}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <span className="ancho-expandido text-6xl font-semibold text-tenue">{iniciales(astronauta.nombre)}</span>
    </div>
  );
}
