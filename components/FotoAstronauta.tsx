import Image from "next/image";
import { iniciales, type Astronauta } from "@/lib/tipos";

interface Props {
  astronauta: Astronauta;
  /** "mini" para la cabecera de la tarjeta, "retrato" para la ficha. */
  tamano: "mini" | "retrato";
  /** Para lectores de pantalla; vacío si el nombre ya está al lado. */
  alt?: string;
}

/** Foto del astronauta o, si aún no hay foto, sus iniciales sobre un visor. */
export default function FotoAstronauta({ astronauta, tamano, alt = "" }: Props) {
  const mini = tamano === "mini";
  if (astronauta.foto) {
    const caja = mini ? "size-12 rounded-full" : "aspect-[4/5] w-full rounded-lg";
    return (
      <div className={`relative shrink-0 overflow-hidden bg-panel-2 ${caja}`}>
        <Image
          src={astronauta.foto}
          alt={alt}
          fill
          sizes={mini ? "48px" : "(max-width: 640px) 100vw, 440px"}
          className="object-cover object-[50%_20%]"
        />
      </div>
    );
  }

  // Sin foto, el retrato es más bajo para no dejar un hueco vacío.
  const caja = mini ? "size-12 rounded-full" : "aspect-[3/2] w-full rounded-lg";
  return (
    <div
      className={`visor relative grid shrink-0 place-items-center overflow-hidden ${caja}`}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <span className={`font-rotulo font-semibold text-texto ${mini ? "text-lg" : "text-7xl"}`}>
        {iniciales(astronauta.nombre)}
      </span>
    </div>
  );
}
