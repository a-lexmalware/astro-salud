import type { Lectura, Nivel } from "./tipos";

/**
 * Reglas de detección. Son umbrales simples y explicables, pensados para
 * correr a bordo sin conexión. Ajusta los valores aquí; el panel y las
 * alertas se actualizan solos.
 */

export type Metrica = "fc" | "spo2" | "temp" | "hrv" | "sueno" | "ejercicio";

export interface DefMetrica {
  id: Metrica;
  etiqueta: string;
  unidad: string;
  decimales: number;
  peso: number; // importancia en el índice de salud
  nivel: (v: number) => Nivel;
  mensaje: (v: number) => string;
}

export const META_EJERCICIO = 120; // minutos diarios contra pérdida de músculo y hueso

export const METRICAS: DefMetrica[] = [
  {
    id: "fc",
    etiqueta: "Frecuencia cardiaca",
    unidad: "lpm",
    decimales: 0,
    peso: 25,
    nivel: (v) => (v > 120 || v < 40 ? "rojo" : v > 100 || v < 50 ? "amarillo" : "verde"),
    mensaje: (v) => (v > 100 ? `Frecuencia cardiaca alta (${v} lpm)` : `Frecuencia cardiaca baja (${v} lpm)`),
  },
  {
    id: "spo2",
    etiqueta: "Oxígeno en sangre",
    unidad: "%",
    decimales: 0,
    peso: 30,
    nivel: (v) => (v < 90 ? "rojo" : v < 95 ? "amarillo" : "verde"),
    mensaje: (v) => `Oxígeno en sangre bajo (${v} %)`,
  },
  {
    id: "temp",
    etiqueta: "Temperatura",
    unidad: "°C",
    decimales: 1,
    peso: 15,
    nivel: (v) => (v >= 38.3 || v < 35 ? "rojo" : v >= 37.6 || v < 35.8 ? "amarillo" : "verde"),
    mensaje: (v) => (v >= 37.6 ? `Temperatura elevada (${v.toFixed(1)} °C)` : `Temperatura baja (${v.toFixed(1)} °C)`),
  },
  {
    id: "hrv",
    etiqueta: "Variabilidad (HRV)",
    unidad: "ms",
    decimales: 0,
    peso: 15,
    nivel: (v) => (v < 20 ? "rojo" : v < 35 ? "amarillo" : "verde"),
    mensaje: (v) => `HRV baja, posible estrés o fatiga (${v} ms)`,
  },
  {
    id: "sueno",
    etiqueta: "Sueño",
    unidad: "h",
    decimales: 1,
    peso: 10,
    nivel: (v) => (v < 4 ? "rojo" : v < 6 ? "amarillo" : "verde"),
    mensaje: (v) => `Sueño insuficiente (${v.toFixed(1)} h)`,
  },
  {
    id: "ejercicio",
    etiqueta: "Ejercicio hoy",
    unidad: "min",
    decimales: 0,
    peso: 5,
    nivel: () => "verde", // es una meta diaria, no una alarma
    mensaje: () => "",
  },
];

const ORDEN: Record<Nivel, number> = { verde: 0, amarillo: 1, rojo: 2 };

export interface Evaluacion {
  nivel: Nivel;
  indice: number; // 0 a 100
  alertas: { metrica: Metrica; nivel: Nivel; mensaje: string }[];
  porMetrica: Record<Metrica, Nivel>;
}

export function evaluar(l: Lectura): Evaluacion {
  let nivel: Nivel = "verde";
  let penalizacion = 0;
  let pesoTotal = 0;
  const alertas: Evaluacion["alertas"] = [];
  const porMetrica = {} as Record<Metrica, Nivel>;

  for (const m of METRICAS) {
    const v = l[m.id];
    const n = m.nivel(v);
    porMetrica[m.id] = n;
    pesoTotal += m.peso;
    if (n !== "verde") {
      penalizacion += m.peso * (n === "rojo" ? 1 : 0.5);
      alertas.push({ metrica: m.id, nivel: n, mensaje: m.mensaje(v) });
    }
    if (ORDEN[n] > ORDEN[nivel]) nivel = n;
  }

  alertas.sort((a, b) => ORDEN[b.nivel] - ORDEN[a.nivel]);
  const indice = Math.round(100 - (penalizacion / pesoTotal) * 100);
  return { nivel, indice, alertas, porMetrica };
}

export const peorNivel = (niveles: Nivel[]): Nivel =>
  niveles.reduce<Nivel>((p, n) => (ORDEN[n] > ORDEN[p] ? n : p), "verde");
