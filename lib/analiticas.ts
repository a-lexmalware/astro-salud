import datos from "./analiticas-osdr.json";

/**
 * Análisis de sangre reales de la tripulación civil de Inspiration4 (SpaceX,
 * septiembre de 2021, 3 días en órbita), publicados por la NASA en su Open
 * Science Data Repository. Se regeneran con `npm run datos:osdr`.
 */

export interface MarcadorSangre {
  id: string;
  nombre: string;
  unidad: string;
  min: number | null;
  max: number | null;
  valores: Record<string, number | null>;
}

export const ESTUDIOS_OSDR = [
  { id: "OSD-569", titulo: "Hemograma completo", url: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-569" },
  { id: "OSD-575", titulo: "Panel metabólico completo", url: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575" },
];

/** Muestra de referencia antes del vuelo y la del día siguiente al aterrizaje. */
export const ANTES = "L-3";
export const DESPUES = "R+1";

export function analiticaDe(tripulante: string): MarcadorSangre[] | null {
  return datos.datos.find((d) => d.tripulante === tripulante)?.marcadores ?? null;
}

/** "bajo", "alto" o null si el valor está dentro del rango del laboratorio. */
export function fueraDeRango(valor: number | null, min: number | null, max: number | null): "bajo" | "alto" | null {
  if (valor === null) return null;
  if (min !== null && valor < min) return "bajo";
  if (max !== null && valor > max) return "alto";
  return null;
}
