/**
 * Descarga de NASA OSDR los análisis de sangre reales de la tripulación de
 * Inspiration4 (2021) y genera lib/analiticas-osdr.json con los marcadores
 * que muestra la ficha.
 *
 *   npm run datos:osdr
 *
 * Fuentes (acceso abierto):
 *   OSD-569  Hemograma completo (CBC)              https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
 *   OSD-575  Panel metabólico completo (CMP)       https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
 */
import { writeFileSync } from "node:fs";

const API = "https://osdr.nasa.gov/osdr/data/osd/files";

interface Marcador {
  id: string;
  nombre: string;
  unidad: string;
  /** Prefijo de la columna en el CSV: <prefijo>_value_<sufijo>, <prefijo>_range_min_<sufijo>... */
  prefijo: string;
  sufijo: string;
  estudio: "569" | "575";
}

const MARCADORES: Marcador[] = [
  // En el CSV la hemoglobina figura como "percent", pero los valores son g/dL.
  { id: "hemoglobina", nombre: "Hemoglobina", unidad: "g/dL", prefijo: "hemoglobin", sufijo: "percent", estudio: "569" },
  { id: "hematocrito", nombre: "Hematocrito", unidad: "%", prefijo: "hematocrit", sufijo: "percent", estudio: "569" },
  { id: "leucocitos", nombre: "Leucocitos", unidad: "mil/µL", prefijo: "white_blood_cell_count", sufijo: "thousand_per_microliter", estudio: "569" },
  { id: "plaquetas", nombre: "Plaquetas", unidad: "mil/µL", prefijo: "platelet_count", sufijo: "thousand_per_microliter", estudio: "569" },
  { id: "glucosa", nombre: "Glucosa", unidad: "mg/dL", prefijo: "glucose", sufijo: "milligram_per_deciliter", estudio: "575" },
  { id: "creatinina", nombre: "Creatinina", unidad: "mg/dL", prefijo: "creatinine", sufijo: "milligram_per_deciliter", estudio: "575" },
  { id: "sodio", nombre: "Sodio", unidad: "mmol/L", prefijo: "sodium", sufijo: "millimol_per_liter", estudio: "575" },
  { id: "potasio", nombre: "Potasio", unidad: "mmol/L", prefijo: "potassium", sufijo: "millimol_per_liter", estudio: "575" },
  { id: "calcio", nombre: "Calcio", unidad: "mg/dL", prefijo: "calcium", sufijo: "milligram_per_deciliter", estudio: "575" },
];

const ARCHIVOS = {
  "569": "LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv",
  "575": "LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv",
} as const;

/** Días respecto al lanzamiento (L) o al regreso (R) en que se tomó cada muestra. */
const MOMENTOS = ["L-92", "L-44", "L-3", "R+1", "R+45", "R+82", "R+194"];

async function descargarCsv(estudio: "569" | "575"): Promise<Record<string, string>[]> {
  const indice = await (await fetch(`${API}/${estudio}?size=100`)).json();
  const archivo = indice.studies[`OSD-${estudio}`].study_files.find(
    (f: { file_name: string }) => f.file_name === ARCHIVOS[estudio],
  );
  if (!archivo) throw new Error(`No se encontró ${ARCHIVOS[estudio]} en OSD-${estudio}`);
  const texto = (await (await fetch(`https://osdr.nasa.gov${archivo.remote_url}`)).text()).replace(/^﻿/, "");
  const [cabecera, ...filas] = texto.trim().split(/\r?\n/).map((l) => l.split(","));
  return filas.map((f) => Object.fromEntries(cabecera.map((c, i) => [c, f[i]])));
}

const numero = (v: string | undefined) => (v === undefined || v === "" ? null : Number(v));

async function main() {
  const tablas = { "569": await descargarCsv("569"), "575": await descargarCsv("575") };
  const tripulantes = ["C001", "C002", "C003", "C004"];

  const datos = tripulantes.map((t) => ({
    tripulante: t,
    marcadores: MARCADORES.map((m) => {
      const filas = tablas[m.estudio].filter((f) => f["Sample Name"].startsWith(`${t}_`));
      const fila = (momento: string) => filas.find((f) => f["Sample Name"].includes(`_${momento}`));
      const referencia = fila("L-3") ?? filas[0];
      return {
        id: m.id,
        nombre: m.nombre,
        unidad: m.unidad,
        min: numero(referencia?.[`${m.prefijo}_range_min_${m.sufijo}`]),
        max: numero(referencia?.[`${m.prefijo}_range_max_${m.sufijo}`]),
        valores: Object.fromEntries(MOMENTOS.map((mo) => [mo, numero(fila(mo)?.[`${m.prefijo}_value_${m.sufijo}`])])),
      };
    }),
  }));

  writeFileSync(
    new URL("../lib/analiticas-osdr.json", import.meta.url),
    JSON.stringify({ fuente: "NASA OSDR: OSD-569 (CBC) y OSD-575 (CMP), misión Inspiration4", momentos: MOMENTOS, datos }, null, 2) + "\n",
  );
  console.log(`Guardado lib/analiticas-osdr.json con ${datos.length} tripulantes y ${MARCADORES.length} marcadores.`);
}

main().catch((e) => {
  console.error("No se pudieron descargar los datos de OSDR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
