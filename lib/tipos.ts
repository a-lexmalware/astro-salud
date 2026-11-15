export type Nivel = "verde" | "amarillo" | "rojo";

// "reloj" no es un escenario simulado: marca que la frecuencia cardiaca de ese
// astronauta viene de un reloj real conectado por Bluetooth a un panel.
export type Escenario = "normal" | "hipoxia" | "taquicardia" | "fiebre" | "fatiga" | "reloj";

export interface Astronauta {
  id: string;
  nombre: string;
  rol: string;
}

/** Una lectura del smartwatch. Coincide con las columnas de la tabla `lecturas`. */
export interface Lectura {
  astronauta_id: string;
  fc: number; // frecuencia cardiaca (lpm)
  spo2: number; // oxígeno en sangre (%)
  temp: number; // temperatura corporal (°C)
  hrv: number; // variabilidad cardiaca RMSSD (ms)
  sueno: number; // horas dormidas en el último ciclo
  ejercicio: number; // minutos de ejercicio hoy
  creado_en: string; // ISO
}

export const ASTRONAUTAS: Astronauta[] = [
  { id: "ast-1", nombre: "Valeria Ríos", rol: "Comandante" },
  { id: "ast-2", nombre: "Mateo Salas", rol: "Ingeniero de vuelo" },
  { id: "ast-3", nombre: "Akira Tanaka", rol: "Médica de a bordo" },
  { id: "ast-4", nombre: "Lucas Ferreira", rol: "Especialista de misión" },
];

/** Escenarios que se pueden elegir en el panel. */
export const ESCENARIOS: { id: Escenario; etiqueta: string }[] = [
  { id: "normal", etiqueta: "Normal" },
  { id: "hipoxia", etiqueta: "Hipoxia" },
  { id: "taquicardia", etiqueta: "Taquicardia" },
  { id: "fiebre", etiqueta: "Fiebre" },
  { id: "fatiga", etiqueta: "Fatiga" },
];
