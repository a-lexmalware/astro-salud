import type { Desviacion } from "./lineaBase";
import type { Evaluacion, Metrica } from "./salud";
import type { Nivel } from "./tipos";

/**
 * Protocolos de acción: qué hacer ante cada alerta. Son ilustrativos para el
 * prototipo (no son criterio médico), pero están escritos como los usaría un
 * tripulante: pasos cortos, cuándo volver a medir y cuándo pedir ayuda.
 */

export interface Protocolo {
  id: string;
  metrica: Metrica;
  gravedad: Nivel; // rojo o amarillo
  origen: "umbral" | "linea-base";
  titulo: string;
  porque: string; // el mensaje de la alerta que lo activó
  pasos: string[];
  volverAMedirMin: number;
  escalar: string;
}

type Plantilla = Omit<Protocolo, "id" | "metrica" | "gravedad" | "origen" | "porque">;

const UMBRAL: Record<string, Plantilla> = {
  "spo2:rojo": {
    titulo: "Oxígeno en sangre crítico",
    pasos: [
      "Colócate la mascarilla de oxígeno del módulo",
      "Revisa el filtro de CO₂ y la presión de tu módulo o traje",
      "Quédate quieto y respira despacio",
      "Avisa a la médica de a bordo ahora",
    ],
    volverAMedirMin: 2,
    escalar: "Si no sube de 90 % en 2 minutos, la médica de a bordo y la Tierra deben saberlo de inmediato.",
  },
  "spo2:amarillo": {
    titulo: "Oxígeno en sangre bajo",
    pasos: [
      "Deja lo que estés haciendo y siéntate",
      "Respira lento y profundo durante 2 minutos",
      "Revisa el filtro de CO₂ de tu módulo",
    ],
    volverAMedirMin: 5,
    escalar: "Si baja de 90 %, sigue el protocolo crítico.",
  },
  "fc:alta": {
    titulo: "Pulso alto",
    pasos: [
      "Detén el esfuerzo físico",
      "Siéntate y respira: 4 segundos dentro, 6 fuera",
      "Toma agua",
      "Nota si sientes dolor en el pecho o mareo",
    ],
    volverAMedirMin: 10,
    escalar: "Con dolor de pecho, mareo o si sigue arriba de 120 en 10 minutos, avisa a la médica de a bordo.",
  },
  "fc:baja": {
    titulo: "Pulso bajo",
    pasos: ["Siéntate o recuéstate", "Nota si sientes mareo o cansancio raro", "Toma agua y algo de comer"],
    volverAMedirMin: 10,
    escalar: "Si te mareas o baja de 40, avisa a la médica de a bordo.",
  },
  "temp:alta": {
    titulo: "Temperatura alta",
    pasos: [
      "Descansa y toma agua",
      "Revisa la temperatura de tu módulo o traje",
      "Nota síntomas: tos, dolor al orinar, dolor de cabeza",
    ],
    volverAMedirMin: 30,
    escalar: "Arriba de 38.3 °C o con síntomas, la médica de a bordo decide el tratamiento.",
  },
  "temp:baja": {
    titulo: "Temperatura baja",
    pasos: ["Abrígate y busca un módulo templado", "Toma algo caliente", "Revisa el control térmico de tu traje"],
    volverAMedirMin: 15,
    escalar: "Debajo de 35 °C avisa a la médica de a bordo.",
  },
  hrv: {
    titulo: "Variabilidad cardiaca baja: estrés o fatiga",
    pasos: [
      "Haz una pausa de 10 minutos sin pantallas",
      "Respiración lenta: 6 respiraciones por minuto durante 5 minutos",
      "Revisa cuánto dormiste esta semana",
    ],
    volverAMedirMin: 60,
    escalar: "Si sigue baja dos días seguidos, coméntalo en el chequeo con la médica de a bordo.",
  },
  sueno: {
    titulo: "Sueño insuficiente",
    pasos: [
      "Evita tareas críticas o de precisión en las próximas horas",
      "Pide ajustar tu turno si es posible",
      "Esta noche: luz tenue 1 h antes y horario fijo de iluminación",
    ],
    volverAMedirMin: 24 * 60,
    escalar: "Tres noches seguidas así: avísale a la médica de a bordo.",
  },
};

const BASE: Record<string, Plantilla> = {
  fc: {
    titulo: "Tu pulso está por arriba de tu normal",
    pasos: [
      "Descansa 10 minutos sentado, sin pantallas",
      "Toma 500 ml de agua",
      "Revisa si dormiste menos de 6 h esta semana",
      "Vuelve a medir con la cámara",
    ],
    volverAMedirMin: 15,
    escalar: "Si sigue así mañana, coméntalo con la médica de a bordo.",
  },
  hrv: {
    titulo: "Tu variabilidad está por debajo de tu normal",
    pasos: ["Haz una pausa de 10 minutos", "Respiración lenta durante 5 minutos", "Prioriza dormir esta noche"],
    volverAMedirMin: 60,
    escalar: "Si sigue baja dos días, coméntalo con la médica de a bordo.",
  },
  sueno: {
    titulo: "Estás durmiendo menos de lo normal para ti",
    pasos: ["Esta noche: horario fijo de iluminación", "Evita cafeína después del mediodía", "Pide revisar tu turno"],
    volverAMedirMin: 24 * 60,
    escalar: "Si sigue tres noches, coméntalo con la médica de a bordo.",
  },
  temp: {
    titulo: "Tu temperatura está por arriba de tu normal",
    pasos: ["Toma agua y descansa", "Nota cualquier síntoma nuevo", "Vuelve a medir en media hora"],
    volverAMedirMin: 30,
    escalar: "Si llega a 37.6 °C, sigue el protocolo de temperatura alta.",
  },
  spo2: {
    titulo: "Tu oxígeno está por debajo de tu normal",
    pasos: ["Revisa el filtro de CO₂ de tu módulo", "Respira lento durante 2 minutos", "Vuelve a medir"],
    volverAMedirMin: 5,
    escalar: "Si baja de 95 %, sigue el protocolo de oxígeno bajo.",
  },
};

const ORDEN: Record<Nivel, number> = { rojo: 0, amarillo: 1, verde: 2 };

/**
 * Protocolos activos para un tripulante. Si una métrica ya rebasó un umbral,
 * ese protocolo manda y no se duplica con el de la línea base.
 */
export function protocolosPara(evaluacion: Evaluacion | null, desviaciones: Desviacion[]): Protocolo[] {
  const lista: Protocolo[] = [];
  const conUmbral = new Set<string>();

  for (const a of evaluacion?.alertas ?? []) {
    const clave =
      a.metrica === "spo2"
        ? `spo2:${a.nivel}`
        : a.metrica === "fc" || a.metrica === "temp"
          ? `${a.metrica}:${/baj/i.test(a.mensaje) ? "baja" : "alta"}`
          : a.metrica;
    const p = UMBRAL[clave];
    if (!p) continue;
    conUmbral.add(a.metrica);
    lista.push({ ...p, id: `umbral-${clave}`, metrica: a.metrica, gravedad: a.nivel, origen: "umbral", porque: a.mensaje });
  }

  for (const d of desviaciones) {
    if (conUmbral.has(d.metrica)) continue;
    const p = BASE[d.metrica];
    if (!p) continue;
    lista.push({ ...p, id: `base-${d.metrica}`, metrica: d.metrica, gravedad: "amarillo", origen: "linea-base", porque: d.mensaje });
  }

  return lista.sort((a, b) => ORDEN[a.gravedad] - ORDEN[b.gravedad]);
}
