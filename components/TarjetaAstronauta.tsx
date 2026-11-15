import { evaluar, METRICAS, META_EJERCICIO } from "@/lib/salud";
import { ESCENARIOS, type Astronauta, type Escenario, type Lectura, type Nivel } from "@/lib/tipos";
import FotoAstronauta from "./FotoAstronauta";
import Sparkline from "./Sparkline";

export const COLOR: Record<Nivel, string> = {
  verde: "var(--color-verde)",
  amarillo: "var(--color-amarillo)",
  rojo: "var(--color-rojo)",
};

export const ETIQUETA: Record<Nivel, string> = {
  verde: "Estable",
  amarillo: "Precaución",
  rojo: "Crítico",
};

interface Props {
  astronauta: Astronauta;
  historial: Lectura[];
  escenario: Escenario;
  sinSenal: boolean;
  segundosDesde: number | null;
  onEscenario: (e: Escenario) => void;
  pulsoTelefono: boolean; // llega pulso real desde el teléfono (Gadgetbridge)
  onAbrirFicha: () => void;
}

export default function TarjetaAstronauta({
  astronauta,
  historial,
  escenario,
  sinSenal,
  segundosDesde,
  onEscenario,
  pulsoTelefono,
  onAbrirFicha,
}: Props) {
  const ultima = historial.at(-1);
  const evaluacion = ultima ? evaluar(ultima) : null;
  const nivel: Nivel = evaluacion?.nivel ?? "verde";
  const color = sinSenal || !evaluacion ? "var(--color-tenue)" : COLOR[nivel];
  const idSelect = `escenario-${astronauta.id}`;

  return (
    <article
      className="flex flex-col gap-4 rounded-xl border bg-panel p-5 transition-colors"
      style={{ borderColor: evaluacion && !sinSenal && nivel !== "verde" ? color : "var(--color-borde)" }}
    >
      <header className="flex items-start justify-between gap-3">
        {/* El encabezado envuelve al botón: un <h2> no puede ir dentro de un <button>. */}
        <h2 className="min-w-0">
          <button
            type="button"
            onClick={onAbrirFicha}
            aria-haspopup="dialog"
            className="group -m-1.5 flex w-full min-w-0 items-center gap-3 rounded-lg p-1.5 text-left hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-acento"
          >
            <FotoAstronauta astronauta={astronauta} tamano="mini" />
            <span className="min-w-0">
              <span className="font-rotulo block text-xl font-semibold leading-tight">{astronauta.nombre}</span>
              <span className="block text-sm font-normal leading-snug text-tenue">{astronauta.rol}</span>
              <span className="text-xs font-normal text-acento group-hover:underline">Ver ficha</span>
            </span>
          </button>
        </h2>
        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-2 text-sm font-medium" style={{ color }}>
            <span
              className={`inline-block size-2.5 rounded-full ${nivel === "rojo" && !sinSenal ? "pulso" : ""}`}
              style={{ background: color }}
              aria-hidden
            />
            {sinSenal ? "Sin señal" : evaluacion ? ETIQUETA[nivel] : "Esperando datos"}
          </div>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums leading-none" style={{ color }}>
            {evaluacion ? evaluacion.indice : "--"}
            <span className="ml-1 text-xs font-normal text-tenue">/ 100</span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {(["fc", "spo2"] as const).map((id) => {
          const m = METRICAS.find((x) => x.id === id)!;
          const n = evaluacion?.porMetrica[id] ?? "verde";
          // Sin señal, el último valor es viejo: se muestra atenuado, no como alerta vigente.
          const colorMetrica = sinSenal ? "var(--color-tenue)" : COLOR[n];
          return (
            <div key={id} className="rounded-lg bg-panel-2 p-3">
              <p className="text-xs text-tenue">{m.etiqueta}</p>
              <p className="font-mono text-2xl font-semibold tabular-nums" style={{ color: colorMetrica }}>
                {ultima ? ultima[id] : "--"}
                <span className="ml-1 text-xs font-normal text-tenue">{m.unidad}</span>
              </p>
              <Sparkline
                valores={historial.map((l) => l[id])}
                color={colorMetrica}
                etiqueta={`Tendencia de ${m.etiqueta.toLowerCase()}`}
              />
            </div>
          );
        })}
      </div>

      <dl className="grid gap-y-2 text-sm">
        {METRICAS.filter((m) => m.id !== "fc" && m.id !== "spo2").map((m) => {
          const n = evaluacion?.porMetrica[m.id] ?? "verde";
          return (
            <div key={m.id} className="flex items-baseline justify-between gap-2 border-b border-borde pb-1.5">
              <dt className="text-tenue">{m.etiqueta}</dt>
              <dd
                className="font-mono tabular-nums"
                style={{ color: sinSenal ? "var(--color-tenue)" : n === "verde" ? undefined : COLOR[n] }}
              >
                {ultima ? ultima[m.id].toFixed(m.decimales) : "--"}
                {m.id === "ejercicio" ? ` / ${META_EJERCICIO}` : ""} {m.unidad}
              </dd>
            </div>
          );
        })}
      </dl>

      <ul className="min-h-10 space-y-1 text-sm">
        {sinSenal ? (
          <li className="text-tenue">No llegan lecturas del reloj. Revisa la conexión.</li>
        ) : evaluacion && evaluacion.alertas.length > 0 ? (
          evaluacion.alertas.map((a) => (
            <li key={a.metrica} style={{ color: COLOR[a.nivel] }}>
              {a.nivel === "rojo" ? "▲" : "●"} {a.mensaje}
            </li>
          ))
        ) : (
          <li className="text-tenue">Sin alertas activas.</li>
        )}
      </ul>

      {pulsoTelefono && (
        <p className="text-xs text-tenue">
          <span className="text-acento">Reloj vía teléfono</span>: frecuencia cardiaca real enviada por Gadgetbridge.
          Las demás métricas son simuladas.
        </p>
      )}

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-borde pt-3">
        <label htmlFor={idSelect} className="text-xs text-tenue">
          Simular escenario
        </label>
        <select
          id={idSelect}
          value={escenario}
          onChange={(e) => onEscenario(e.target.value as Escenario)}
          className="rounded-md border border-borde bg-panel-2 px-2 py-1.5 text-sm text-texto focus-visible:outline-2 focus-visible:outline-acento disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ESCENARIOS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.etiqueta}
            </option>
          ))}
        </select>
      </footer>
      <p className="-mt-2 text-xs text-tenue">
        {segundosDesde === null ? "Sin lecturas todavía" : `Última lectura hace ${segundosDesde} s`}
      </p>
    </article>
  );
}
