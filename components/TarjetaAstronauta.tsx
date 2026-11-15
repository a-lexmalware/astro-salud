import { evaluar, METRICAS, META_EJERCICIO } from "@/lib/salud";
import { ESCENARIOS, type Astronauta, type Escenario, type Lectura, type Nivel } from "@/lib/tipos";
import Corazon from "./Corazon";
import FotoAstronauta from "./FotoAstronauta";
import GotaOxigeno from "./GotaOxigeno";
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

const TENUE = "var(--color-tenue)";

interface Props {
  astronauta: Astronauta;
  historial: Lectura[];
  escenario: Escenario;
  sinSenal: boolean;
  segundosDesde: number | null;
  onEscenario: (e: Escenario) => void;
  onAbrirFicha: () => void;
}

export default function TarjetaAstronauta({
  astronauta,
  historial,
  escenario,
  sinSenal,
  segundosDesde,
  onEscenario,
  onAbrirFicha,
}: Props) {
  const ultima = historial.at(-1);
  const evaluacion = ultima ? evaluar(ultima) : null;
  const nivel: Nivel = evaluacion?.nivel ?? "verde";
  const vigente = !!evaluacion && !sinSenal;
  const color = vigente ? COLOR[nivel] : TENUE;
  const colorDe = (n: Nivel) => (sinSenal ? TENUE : COLOR[n]);
  const idSelect = `escenario-${astronauta.id}`;
  const estado = sinSenal ? "Sin señal" : evaluacion ? ETIQUETA[nivel] : "Esperando datos";

  const fc = METRICAS.find((m) => m.id === "fc")!;
  const spo2 = METRICAS.find((m) => m.id === "spo2")!;
  const nFc = evaluacion?.porMetrica.fc ?? "verde";
  const nSpo2 = evaluacion?.porMetrica.spo2 ?? "verde";

  return (
    <article
      className="@container flex flex-col gap-5 rounded-2xl border bg-panel p-5 transition-colors"
      style={{ borderColor: vigente && nivel !== "verde" ? color : "var(--color-borde)" }}
    >
      {/* El encabezado envuelve al botón: un <h2> no puede ir dentro de un <button>. */}
      <h2>
        <button
          type="button"
          onClick={onAbrirFicha}
          aria-haspopup="dialog"
          className="group -m-2 flex w-[calc(100%+1rem)] items-center gap-4 rounded-xl p-2 text-left hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-acento"
        >
          <AnilloIndice indice={vigente ? evaluacion.indice : null} color={color}>
            <FotoAstronauta astronauta={astronauta} tamano="mini" />
          </AnilloIndice>
          <span className="min-w-0 flex-1">
            <span className="font-rotulo block text-2xl font-semibold leading-none">{astronauta.nombre}</span>
            <span className="mt-1 block text-sm font-normal text-tenue">{astronauta.rol}</span>
            <span className="mt-1.5 flex items-center gap-1.5 text-sm font-medium" style={{ color }}>
              <span
                className={`inline-block size-2 rounded-full ${nivel === "rojo" && vigente ? "pulso" : ""}`}
                style={{ background: color }}
                aria-hidden
              />
              <span>
                {estado}
                {vigente && <span className="font-normal text-tenue">, índice {evaluacion.indice} de 100</span>}
              </span>
            </span>
          </span>
          <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-tenue group-hover:text-texto" aria-hidden>
            <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Ver ficha</span>
        </button>
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <Vital
          icono={<Corazon fc={ultima && !sinSenal ? ultima.fc : null} color={colorDe(nFc)} className="size-5" />}
          etiqueta="Pulso"
          titulo={fc.etiqueta}
          valor={ultima?.fc ?? null}
          unidad={fc.unidad}
          color={colorDe(nFc)}
          serie={historial.map((l) => l.fc)}
        />
        <Vital
          icono={<GotaOxigeno spo2={ultima && !sinSenal ? ultima.spo2 : null} color={colorDe(nSpo2)} className="size-5" />}
          etiqueta="Oxígeno"
          titulo={spo2.etiqueta}
          valor={ultima?.spo2 ?? null}
          unidad={spo2.unidad}
          color={colorDe(nSpo2)}
          serie={historial.map((l) => l.spo2)}
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 @md:grid-cols-4">
        {METRICAS.filter((m) => m.id !== "fc" && m.id !== "spo2").map((m) => {
          const n = evaluacion?.porMetrica[m.id] ?? "verde";
          const valor = ultima ? ultima[m.id] : null;
          return (
            <div key={m.id} className="min-w-0">
              <dt className="truncate text-xs text-tenue">{m.etiqueta}</dt>
              <dd
                className="mt-0.5 font-mono text-base tabular-nums"
                style={{ color: sinSenal ? TENUE : n === "verde" ? undefined : COLOR[n] }}
              >
                {valor === null ? "--" : valor.toFixed(m.decimales)}
                <span className="ml-1 font-sans text-xs text-tenue">
                  {m.id === "ejercicio" ? `/ ${META_EJERCICIO} ${m.unidad}` : m.unidad}
                </span>
              </dd>
              {m.id === "ejercicio" && (
                // Meta diaria: la barra muestra cuánto falta para los 120 minutos.
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-panel-2" aria-hidden>
                  <div
                    className="barra-meta h-full rounded-full bg-acento"
                    style={{ width: `${Math.min(100, ((valor ?? 0) / META_EJERCICIO) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </dl>

      <ul className="min-h-5 space-y-1 text-sm">
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

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-borde pt-4">
        <p className="text-xs text-tenue">
          {segundosDesde === null ? "Sin lecturas todavía" : `Última lectura hace ${segundosDesde} s`}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor={idSelect} className="text-xs text-tenue">
            Simular
          </label>
          <select
            id={idSelect}
            value={escenario}
            onChange={(e) => onEscenario(e.target.value as Escenario)}
            className="min-h-9 rounded-md border border-borde bg-panel-2 px-2 text-sm text-texto focus-visible:outline-2 focus-visible:outline-acento"
          >
            {ESCENARIOS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </footer>
    </article>
  );
}

/** Anillo alrededor de la foto: su recorrido es el índice de salud (0–100). */
function AnilloIndice({ indice, color, children }: { indice: number | null; color: string; children: React.ReactNode }) {
  const r = 30;
  const circunferencia = 2 * Math.PI * r;
  const lleno = indice === null ? 0 : indice / 100;
  return (
    <span className="relative grid size-[4.25rem] shrink-0 place-items-center">
      <svg viewBox="0 0 68 68" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="34" cy="34" r={r} fill="none" stroke="var(--color-borde)" strokeWidth="3" />
        <circle
          className="anillo-progreso"
          cx="34"
          cy="34"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - lleno)}
        />
      </svg>
      {children}
    </span>
  );
}

function Vital({
  icono,
  etiqueta,
  titulo,
  valor,
  unidad,
  color,
  serie,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  titulo: string;
  valor: number | null;
  unidad: string;
  color: string;
  serie: number[];
}) {
  return (
    <div className="rounded-xl bg-panel-2 p-3.5" title={titulo}>
      <p className="flex items-center gap-2 text-sm text-tenue">
        {icono}
        {etiqueta}
      </p>
      <p className="mt-1 font-mono text-3xl font-semibold tabular-nums leading-tight" style={{ color }}>
        {valor ?? "--"}
        <span className="ml-1 font-sans text-xs font-normal text-tenue">{unidad}</span>
      </p>
      <Sparkline valores={serie} color={color} etiqueta={`Tendencia de ${titulo.toLowerCase()}`} />
    </div>
  );
}
