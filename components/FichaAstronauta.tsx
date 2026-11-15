"use client";

import { useEffect, useRef } from "react";
import type { Evaluacion } from "@/lib/salud";
import type { Astronauta, Nivel } from "@/lib/tipos";
import FotoAstronauta from "./FotoAstronauta";
import { COLOR, ETIQUETA } from "./TarjetaAstronauta";

interface Props {
  /** Último astronauta elegido: se mantiene al cerrar para que el contenido no desaparezca durante la animación. */
  astronauta: Astronauta | null;
  abierta: boolean;
  evaluacion: Evaluacion | null;
  sinSenal: boolean;
  onCerrar: () => void;
}

const formatoHoras = (h: number) => (Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`);

/**
 * Ficha lateral del astronauta. Usa <dialog> nativo: atrapa el foco, cierra con
 * Escape y devuelve el foco a la tarjeta que la abrió.
 */
export default function FichaAstronauta({ astronauta: a, abierta, evaluacion, sinSenal, onCerrar }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  const nivel: Nivel = evaluacion?.nivel ?? "verde";
  const colorEstado = sinSenal || !evaluacion ? "var(--color-tenue)" : COLOR[nivel];
  const estado = sinSenal ? "Sin señal" : evaluacion ? ETIQUETA[nivel] : "Esperando datos";

  return (
    <dialog
      ref={ref}
      className="ficha"
      aria-labelledby="ficha-nombre"
      onClose={onCerrar}
      // Clic en el fondo (fuera del panel) cierra la ficha.
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      {a && (
        <div className="flex min-h-full flex-col gap-6 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-tenue">Ficha de tripulante</p>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="grid size-10 place-items-center rounded-md border border-borde bg-panel-2 text-tenue hover:border-acento hover:text-texto focus-visible:outline-2 focus-visible:outline-acento"
              aria-label="Cerrar ficha"
              title="Cerrar (Esc)"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <FotoAstronauta astronauta={a} tamano="retrato" alt={`Foto de ${a.nombre}`} />

          <div>
            <h2 id="ficha-nombre" className="font-rotulo text-4xl font-semibold leading-none">
              {a.nombre}
            </h2>
            <p className="mt-2 text-tenue">
              {a.rol}, indicativo «{a.indicativo}»
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm font-medium" style={{ color: colorEstado }}>
              <span className="inline-block size-2.5 rounded-full" style={{ background: colorEstado }} aria-hidden />
              {estado} ahora
              {evaluacion && !sinSenal ? `, índice ${evaluacion.indice} de 100` : ""}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Dato termino="Edad" valor={`${a.edad} años`} />
            <Dato termino="Grupo sanguíneo" valor={a.grupoSanguineo} />
            <Dato termino="País" valor={a.pais} />
            <Dato termino="Especialidad" valor={a.especialidad} />
            <Dato termino="Días en esta misión" valor={String(a.diasEnMision)} />
            <Dato termino="Misiones previas" valor={a.misionesPrevias === 0 ? "Ninguna" : String(a.misionesPrevias)} />
            <Dato termino="Paseos espaciales" valor={a.horasEva === 0 ? "Ninguno" : formatoHoras(a.horasEva)} />
            <Dato termino="Pulso en reposo" valor={`${a.fcReposo} lpm`} />
            <Dato termino="Agencia" valor={a.agencia} ancho />
            <Dato termino="Alergias" valor={a.alergias} ancho />
          </dl>

          <section aria-labelledby="ficha-nota">
            <h3 id="ficha-nota" className="text-sm text-tenue">
              Nota médica
            </h3>
            <p className="mt-1 max-w-prose leading-relaxed">{a.notaMedica}</p>
          </section>
        </div>
      )}
    </dialog>
  );
}

function Dato({ termino, valor, ancho = false }: { termino: string; valor: string; ancho?: boolean }) {
  return (
    <div className={`border-b border-borde pb-2 ${ancho ? "col-span-2" : ""}`}>
      <dt className="text-tenue">{termino}</dt>
      <dd className="mt-0.5">{valor}</dd>
    </div>
  );
}
