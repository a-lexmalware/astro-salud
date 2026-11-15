import type { Desviacion } from "./lineaBase";
import type { Protocolo } from "./protocolos";
import type { Evaluacion } from "./salud";
import type { Lectura, Nivel } from "./tipos";

/**
 * VEGA, la asistente de a bordo. Su "cerebro" son reglas: todo lo que dice
 * sale de los datos de la app (lecturas, alertas, línea base, protocolos),
 * nunca de algo inventado. Así, en un tema médico, no improvisa.
 * La voz y el micrófono son solo la capa de encima (components/Vega.tsx).
 */

export interface TripulanteVega {
  id: string;
  nombre: string;
  indicativo: string;
  nivel: Nivel;
  vigilar: boolean; // fuera de su normal sin umbral rebasado
  sinSenal: boolean;
  lectura: Lectura | null;
  evaluacion: Evaluacion | null;
  desviaciones: Desviacion[];
  protocolos: Protocolo[];
}

export interface ContextoVega {
  tripulantes: TripulanteVega[];
  apagon: boolean;
  enCola: number;
}

export type Intencion =
  | { tipo: "tripulacion" }
  | { tipo: "estado"; id: string }
  | { tipo: "guia"; id: string | null }
  | { tipo: "siguiente" }
  | { tipo: "repetir" }
  | { tipo: "medir"; id: string | null }
  | { tipo: "apagon"; activar: boolean }
  | { tipo: "enlace" }
  | { tipo: "ayuda" }
  | { tipo: "silencio" }
  | { tipo: "desconocida" };

export type Accion = { tipo: "medir"; id: string } | { tipo: "apagon"; activar: boolean } | { tipo: "silencio" };

/** Guía en curso: qué protocolo de quién y en qué paso va. */
export interface Guia {
  id: string;
  protocolo: Protocolo;
  paso: number;
}

export interface Respuesta {
  texto: string;
  accion?: Accion;
  guia: Guia | null;
}

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const primerNombre = (n: string) => n.split(" ")[0];

/** Busca a qué tripulante se refiere el texto, por nombre, apellido o indicativo. */
function buscarTripulante(texto: string, ctx: ContextoVega): string | null {
  const t = ` ${normalizar(texto)} `;
  for (const tr of ctx.tripulantes) {
    const claves = [...tr.nombre.split(" "), tr.indicativo].map(normalizar).filter((c) => c.length > 2);
    if (claves.some((c) => t.includes(` ${c} `))) return tr.id;
  }
  return null;
}

/** De texto libre (voz o teclado) a una intención. */
export function interpretar(texto: string, ctx: ContextoVega): Intencion {
  const t = normalizar(texto);
  if (!t) return { tipo: "desconocida" };
  const id = buscarTripulante(texto, ctx);

  if (/\b(calla|silencio|callate|detente|basta)\b/.test(t)) return { tipo: "silencio" };
  if (!id && /\b(siguiente|listo|ya termine|hecho|continua|sigue)\b/.test(t)) return { tipo: "siguiente" };
  if (/\b(repite|repetir|otra vez|no escuche)\b/.test(t)) return { tipo: "repetir" };
  if (/\b(ayuda|que puedes hacer|comandos)\b/.test(t)) return { tipo: "ayuda" };
  if (/\b(mide|medir|medicion|camara|toma (el|mi) pulso)\b/.test(t)) return { tipo: "medir", id };
  if (/\b(simula|simular|corta|activa)\b.*\b(apagon|enlace)\b|\bapagon\b/.test(t) && !/\b(restablece|recupera|vuelve)\b/.test(t))
    return { tipo: "apagon", activar: true };
  if (/\b(restablece|recupera|reconecta|vuelve)\b.*\b(enlace|conexion|tierra)\b/.test(t)) return { tipo: "apagon", activar: false };
  if (/\b(enlace|tierra|conexion|comunicacion)\b/.test(t)) return { tipo: "enlace" };
  if (/\b(guia|guiame|que hago|ayudame|protocolo|pasos)\b/.test(t)) return { tipo: "guia", id };
  if (id) return { tipo: "estado", id };
  if (/\b(tripulacion|todos|equipo|como estamos|resumen|estado)\b/.test(t)) return { tipo: "tripulacion" };
  return { tipo: "desconocida" };
}

function lineaEstado(tr: TripulanteVega): string {
  const n = primerNombre(tr.nombre);
  if (tr.sinSenal || !tr.lectura) return `No me llegan lecturas de ${n}. Revisa su reloj.`;
  const l = tr.lectura;
  const datos = `pulso ${l.fc}, oxígeno ${l.spo2} %`;
  if (tr.nivel === "rojo") {
    const a = tr.evaluacion?.alertas.find((x) => x.nivel === "rojo");
    return `${n} está en nivel crítico: ${a ? a.mensaje.toLowerCase() : datos}.`;
  }
  if (tr.nivel === "amarillo" && !tr.vigilar) {
    const a = tr.evaluacion?.alertas[0];
    return `${n} requiere precaución: ${a ? a.mensaje.toLowerCase() : datos}.`;
  }
  if (tr.vigilar) {
    const d = tr.desviaciones[0];
    return `${n} sigue en rango, pero ${d ? d.mensaje.charAt(0).toLowerCase() + d.mensaje.slice(1) : "está fuera de su normal"}.`;
  }
  return `${n} está estable: ${datos}.`;
}

/** Lo que VEGA contesta a una intención, con la acción que la app debe hacer. */
export function responder(int: Intencion, ctx: ContextoVega, guia: Guia | null): Respuesta {
  const porId = (id: string | null) => ctx.tripulantes.find((t) => t.id === id) ?? null;
  // Sin nombre, "guíame" se refiere al tripulante que más lo necesita.
  const masUrgente = () =>
    [...ctx.tripulantes]
      .filter((t) => t.protocolos.length)
      .sort((a, b) => (a.protocolos[0].gravedad === "rojo" ? -1 : 0) - (b.protocolos[0].gravedad === "rojo" ? -1 : 0))[0] ?? null;

  switch (int.tipo) {
    case "tripulacion": {
      const conProblema = ctx.tripulantes.filter((t) => t.nivel !== "verde" || t.sinSenal);
      if (!conProblema.length) return { texto: "Toda la tripulación está estable y dentro de su normal.", guia };
      const resto = ctx.tripulantes.length - conProblema.length;
      return {
        texto: [
          ...conProblema.map(lineaEstado),
          resto ? `${resto === 1 ? "El resto está" : `Los otros ${resto} están`} estables.` : "",
        ]
          .filter(Boolean)
          .join(" "),
        guia,
      };
    }
    case "estado": {
      const tr = porId(int.id)!;
      const extra = tr.protocolos.length ? " ¿Quieres que te guíe?" : "";
      return { texto: lineaEstado(tr) + extra, guia };
    }
    case "guia": {
      const tr = int.id ? porId(int.id) : masUrgente();
      if (!tr) return { texto: "No hay nada pendiente. Nadie necesita un protocolo ahora.", guia: null };
      const p = tr.protocolos[0];
      if (!p) return { texto: `${primerNombre(tr.nombre)} no necesita ningún protocolo ahora.`, guia: null };
      const nueva = { id: tr.id, protocolo: p, paso: 0 };
      return {
        texto: `${p.titulo} para ${primerNombre(tr.nombre)}. Son ${p.pasos.length} pasos. Paso 1: ${p.pasos[0]}. Dime "siguiente" cuando termines.`,
        guia: nueva,
      };
    }
    case "siguiente": {
      if (!guia) return { texto: 'No estoy guiando ningún protocolo. Dime "guíame" para empezar.', guia: null };
      const paso = guia.paso + 1;
      if (paso >= guia.protocolo.pasos.length) {
        return {
          texto: `Listo, terminaste el protocolo. Vuelve a medir en ${formatoMinutos(guia.protocolo.volverAMedirMin)}. ${guia.protocolo.escalar}`,
          guia: null,
        };
      }
      return { texto: `Paso ${paso + 1}: ${guia.protocolo.pasos[paso]}.`, guia: { ...guia, paso } };
    }
    case "repetir": {
      if (!guia) return { texto: "No tengo un paso pendiente que repetir.", guia };
      return { texto: `Paso ${guia.paso + 1}: ${guia.protocolo.pasos[guia.paso]}.`, guia };
    }
    case "medir": {
      const tr = porId(int.id) ?? masUrgente() ?? ctx.tripulantes[0];
      return {
        texto: `Abro el sensor de cámara para ${primerNombre(tr.nombre)}. Tapa la cámara con la yema del dedo.`,
        accion: { tipo: "medir", id: tr.id },
        guia,
      };
    }
    case "apagon":
      return int.activar
        ? {
            texto: "Simulo un apagón. A partir de ahora guardo los resúmenes en cola; la detección sigue a bordo.",
            accion: { tipo: "apagon", activar: true },
            guia,
          }
        : { texto: "Restablezco el enlace con la Tierra.", accion: { tipo: "apagon", activar: false }, guia };
    case "enlace":
      return {
        texto: ctx.apagon
          ? `No hay enlace con la Tierra. Sigo monitoreando a bordo; ${ctx.enCola} ${ctx.enCola === 1 ? "resumen espera" : "resúmenes esperan"} en cola.`
          : "El enlace con la Tierra está activo. La señal tarda unos doce minutos en llegar.",
        guia,
      };
    case "ayuda":
      return {
        texto:
          'Puedes decirme: "¿cómo está la tripulación?", "¿cómo está Lucas?", "guíame", "siguiente", "mide el pulso de Valeria" o "simula un apagón".',
        guia,
      };
    case "silencio":
      return { texto: "Me callo.", accion: { tipo: "silencio" }, guia };
    default:
      return { texto: 'No te entendí. Prueba con "¿cómo está la tripulación?" o "guíame".', guia };
  }
}

const formatoMinutos = (m: number) =>
  m >= 60 * 24 ? "24 horas" : m >= 60 ? `${Math.round(m / 60)} ${m >= 120 ? "horas" : "hora"}` : `${m} minutos`;

/** Huella del estado anterior para hablar solo cuando algo cambia. */
export interface Huella {
  porTripulante: Record<string, { nivel: Nivel; vigilar: boolean; criticas: string; base: string }>;
  apagon: boolean;
}

export const huellaVacia = (): Huella => ({ porTripulante: {}, apagon: false });

/**
 * Avisos que VEGA dice por su cuenta cuando algo empeora o se resuelve.
 * La primera vez solo registra el estado, sin hablar.
 */
export function avisos(prev: Huella | null, ctx: ContextoVega): { textos: string[]; huella: Huella } {
  const huella: Huella = { porTripulante: {}, apagon: ctx.apagon };
  const textos: string[] = [];

  for (const tr of ctx.tripulantes) {
    if (tr.sinSenal || !tr.lectura) continue;
    const criticas = (tr.evaluacion?.alertas ?? [])
      .filter((a) => a.nivel === "rojo")
      .map((a) => a.metrica)
      .sort()
      .join(",");
    const base = tr.desviaciones
      .map((d) => d.metrica)
      .sort()
      .join(",");
    huella.porTripulante[tr.id] = { nivel: tr.nivel, vigilar: tr.vigilar, criticas, base };
    const antes = prev?.porTripulante[tr.id];
    if (!prev || !antes) continue;
    const n = primerNombre(tr.nombre);

    if (criticas && criticas !== antes.criticas) {
      const a = tr.evaluacion!.alertas.find((x) => x.nivel === "rojo")!;
      textos.push(`Atención. ${n}: ${a.mensaje.toLowerCase()}. ¿Quieres que te guíe?`);
    } else if (base && base !== antes.base && !criticas) {
      const d = tr.desviaciones[0];
      textos.push(`${n} está fuera de su normal: ${d.mensaje.charAt(0).toLowerCase() + d.mensaje.slice(1)}. Los umbrales todavía no lo marcan.`);
    } else if (tr.nivel === "verde" && !tr.vigilar && (antes.nivel !== "verde" || antes.vigilar)) {
      textos.push(`${n} volvió a su normal.`);
    }
  }

  if (prev && ctx.apagon !== prev.apagon) {
    textos.push(
      ctx.apagon
        ? "Perdimos el enlace con la Tierra. Sigo monitoreando a bordo y guardo los resúmenes en cola."
        : "Enlace con la Tierra recuperado. Envío los resúmenes pendientes.",
    );
  }
  return { textos, huella };
}
