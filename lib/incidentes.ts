import type { Escenario } from "./tipos";

/**
 * Incidentes que el panel simula solo, cada cierto tiempo, para que la demo
 * muestre cómo reacciona ante problemas reales de una misión. Cada uno usa uno
 * de los escenarios del simulador y le pone una causa creíble.
 */

export interface TipoIncidente {
  id: string;
  escenario: Exclude<Escenario, "normal">;
  /** Cómo se lee en la bitácora: "<titulo> (<astronauta>)". */
  titulo: string;
  /** Qué se va a ver en sus signos vitales. */
  efecto: string;
}

export const INCIDENTES: TipoIncidente[] = [
  {
    id: "co2",
    escenario: "hipoxia",
    titulo: "Fallo del filtro de CO₂ en su módulo",
    efecto: "baja el oxígeno en sangre",
  },
  {
    id: "traje",
    escenario: "hipoxia",
    titulo: "Pérdida lenta de presión en el traje",
    efecto: "baja el oxígeno en sangre",
  },
  {
    id: "eva",
    escenario: "taquicardia",
    titulo: "Esfuerzo intenso durante un paseo espacial",
    efecto: "sube el pulso",
  },
  {
    id: "alarma",
    escenario: "taquicardia",
    titulo: "Crisis de ansiedad tras una alarma de incendio",
    efecto: "sube el pulso",
  },
  {
    id: "respiratoria",
    escenario: "fiebre",
    titulo: "Infección respiratoria",
    efecto: "sube la temperatura",
  },
  {
    id: "urinaria",
    escenario: "fiebre",
    titulo: "Infección urinaria",
    efecto: "sube la temperatura",
  },
  {
    id: "turnos",
    escenario: "fatiga",
    titulo: "Sueño alterado por turnos de noche",
    efecto: "duerme menos y baja la variabilidad cardiaca",
  },
  {
    id: "ruido",
    escenario: "fatiga",
    titulo: "Insomnio por el ruido de los ventiladores",
    efecto: "duerme menos y baja la variabilidad cardiaca",
  },
];

/** Espera antes del primer incidente tras abrir el panel. */
export const ESPERA_INICIAL_MS = 15_000;
/** Pausa entre el final de un incidente y el comienzo del siguiente. */
export const PAUSA_MS: [number, number] = [40_000, 80_000];
/** Cuánto dura un incidente antes de resolverse solo. */
export const DURACION_MS: [number, number] = [35_000, 60_000];

export type EstadoIncidente = "en-curso" | "resuelto" | "detenido";

export interface Incidente {
  id: number;
  tipo: TipoIncidente;
  astronautaId: string;
  inicio: number; // ms
  fin: number; // ms en que se resolverá solo
  estado: EstadoIncidente;
}

const entre = (rand: () => number, [min, max]: [number, number]) => Math.round(min + rand() * (max - min));
const elegir = <T>(rand: () => number, lista: T[]) => lista[Math.min(lista.length - 1, Math.floor(rand() * lista.length))];

/** Milisegundos hasta el próximo incidente. */
export function esperaHastaSiguiente(rand: () => number, esPrimero: boolean): number {
  return esPrimero ? ESPERA_INICIAL_MS : entre(rand, PAUSA_MS);
}

/**
 * Elige el siguiente incidente. Evita repetir el mismo astronauta y el mismo
 * tipo de problema que el anterior, para que la demo no se vuelva monótona.
 */
export function planificar(
  rand: () => number,
  ahora: number,
  astronautas: string[],
  id: number,
  anterior?: Pick<Incidente, "astronautaId" | "tipo">,
): Incidente {
  const candidatos = astronautas.length > 1 ? astronautas.filter((a) => a !== anterior?.astronautaId) : astronautas;
  const tipos = INCIDENTES.filter((t) => t.escenario !== anterior?.tipo.escenario);
  return {
    id,
    tipo: elegir(rand, tipos),
    astronautaId: elegir(rand, candidatos),
    inicio: ahora,
    fin: ahora + entre(rand, DURACION_MS),
    estado: "en-curso",
  };
}
