"use client";

import { useEffect, useRef } from "react";
import type { Evaluacion } from "@/lib/salud";
import type { Astronauta, Nivel } from "@/lib/tipos";
import Corazon from "./Corazon";
import FotoAstronauta from "./FotoAstronauta";
import { COLOR, ETIQUETA } from "./TarjetaAstronauta";

interface Props {
  /** Último astronauta elegido: se mantiene al cerrar para que el contenido no desaparezca durante la animación. */
  astronauta: Astronauta | null;
  abierta: boolean;
  evaluacion: Evaluacion | null;
  fcActual: number | null;
  sinSenal: boolean;
  onCerrar: () => void;
}

const formatoHoras = (h: number) => (Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`);

/**
 * Dosier del tripulante, centrado sobre el panel. Usa <dialog> nativo: atrapa
 * el foco, cierra con Escape y devuelve el foco a la columna que lo abrió.
 */
export default function FichaAstronauta({ astronauta: a, abierta, evaluacion, fcActual, sinSenal, onCerrar }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  const nivel: Nivel = evaluacion?.nivel ?? "verde";
  const vigente = !!evaluacion && !sinSenal;
  const color = vigente ? COLOR[nivel] : "var(--color-tenue)";
  const estado = sinSenal ? "Sin señal" : evaluacion ? ETIQUETA[nivel] : "Esperando datos";

  return (
    <dialog
      ref={ref}
      className="ficha"
      aria-labelledby="ficha-nombre"
      onClose={onCerrar}
      // Clic en el fondo oscuro (fuera del dosier) lo cierra.
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      {a && (
        <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="relative">
            <FotoAstronauta
              astronauta={a}
              alt={`Retrato de ${a.nombre}`}
              sizes="(max-width: 768px) 100vw, 400px"
              aspecto="aspect-[5/4] md:aspect-auto md:h-full"
            />
            <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: color }} aria-hidden />
          </div>

          <div className="flex flex-col gap-7 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="ficha-nombre" className="ancho-expandido text-3xl font-semibold leading-tight tracking-tight">
                  {a.nombre}
                </h2>
                <p className="mt-1 text-tenue">
                  {a.rol}. Indicativo por radio: {a.indicativo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => ref.current?.close()}
                className="grid size-10 shrink-0 place-items-center rounded-[3px] border border-borde text-tenue hover:border-texto hover:text-texto focus-visible:outline-2 focus-visible:outline-acento"
                aria-label="Cerrar ficha"
                title="Cerrar (Esc)"
              >
                <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                  <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-5 border-y border-borde py-5">
              <Corazon fc={sinSenal ? null : fcActual} color={color} className="size-12" />
              <div>
                <p className="ancho-condensado text-6xl font-bold leading-none tabular-nums" style={{ color }}>
                  {fcActual !== null && !sinSenal ? fcActual : "--"}
                  <span className="ml-2 text-base font-normal text-tenue [font-variation-settings:'wdth'_100]">
                    lpm ahora
                  </span>
                </p>
                <p className="mt-2 text-sm" style={{ color }}>
                  <span className="font-semibold">{estado}</span>
                  {vigente && <span className="text-tenue">, índice de salud {evaluacion.indice} de 100</span>}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <Dato termino="Edad" valor={`${a.edad} años`} />
              <Dato termino="Grupo sanguíneo" valor={a.grupoSanguineo} />
              <Dato termino="Pulso en reposo" valor={`${a.fcReposo} lpm`} />
              <Dato termino="País" valor={a.pais} />
              <Dato termino="Especialidad" valor={a.especialidad} />
              <Dato termino="Días en esta misión" valor={String(a.diasEnMision)} />
              <Dato termino="Misiones previas" valor={a.misionesPrevias === 0 ? "Ninguna" : String(a.misionesPrevias)} />
              <Dato termino="Paseos espaciales" valor={a.horasEva === 0 ? "Ninguno" : formatoHoras(a.horasEva)} />
              <Dato termino="Alergias" valor={a.alergias} />
              <Dato termino="Agencia" valor={a.agencia} ancho />
            </dl>

            <section aria-labelledby="ficha-nota" className="border-t border-borde pt-5">
              <h3 id="ficha-nota" className="text-sm text-tenue">
                Nota médica
              </h3>
              <p className="mt-1 max-w-prose leading-relaxed">{a.notaMedica}</p>
            </section>
          </div>
        </div>
      )}
    </dialog>
  );
}

function Dato({ termino, valor, ancho = false }: { termino: string; valor: string; ancho?: boolean }) {
  return (
    <div className={ancho ? "col-span-2 sm:col-span-3" : ""}>
      <dt className="text-tenue">{termino}</dt>
      <dd className="mt-0.5 text-base">{valor}</dd>
    </div>
  );
}
