import assert from "node:assert/strict";
import { test } from "node:test";
import { protocolosPara } from "./protocolos";
import { evaluar } from "./salud";
import type { Lectura } from "./tipos";
import { avisos, interpretar, responder, type ContextoVega, type TripulanteVega } from "./vega";

const lectura = (id: string, c: Partial<Lectura> = {}): Lectura => ({
  astronauta_id: id,
  fc: 64,
  spo2: 98,
  temp: 36.6,
  hrv: 58,
  sueno: 7.2,
  ejercicio: 40,
  creado_en: "2026-01-01T00:00:00.000Z",
  ...c,
});

function tripulante(id: string, nombre: string, indicativo: string, c: Partial<Lectura> = {}): TripulanteVega {
  const l = lectura(id, c);
  const e = evaluar(l);
  return {
    id,
    nombre,
    indicativo,
    nivel: e.nivel,
    vigilar: false,
    sinSenal: false,
    lectura: l,
    evaluacion: e,
    desviaciones: [],
    protocolos: protocolosPara(e, []),
  };
}

const ctx = (cambios: Partial<Record<string, Partial<Lectura>>> = {}, apagon = false): ContextoVega => ({
  tripulantes: [
    tripulante("ast-1", "Valeria Ríos", "Cóndor", cambios["ast-1"]),
    tripulante("ast-2", "Mateo Salas", "Brújula", cambios["ast-2"]),
    tripulante("ast-4", "Lucas Ferreira", "Ancla", cambios["ast-4"]),
  ],
  apagon,
  enCola: 3,
});

test("entiende preguntas por tripulante, por nombre o indicativo, con o sin acentos", () => {
  const c = ctx();
  assert.deepEqual(interpretar("¿Cómo está Lucas?", c), { tipo: "estado", id: "ast-4" });
  assert.deepEqual(interpretar("estado de Ferreira", c), { tipo: "estado", id: "ast-4" });
  assert.deepEqual(interpretar("como esta condor", c), { tipo: "estado", id: "ast-1" });
  assert.deepEqual(interpretar("¿Cómo está la tripulación?", c), { tipo: "tripulacion" });
});

test("entiende comandos de acción", () => {
  const c = ctx();
  assert.deepEqual(interpretar("mide el pulso de Valeria", c), { tipo: "medir", id: "ast-1" });
  assert.deepEqual(interpretar("simula un apagón", c), { tipo: "apagon", activar: true });
  assert.deepEqual(interpretar("restablece el enlace con la Tierra", c), { tipo: "apagon", activar: false });
  assert.deepEqual(interpretar("¿cómo va el enlace?", c), { tipo: "enlace" });
  assert.deepEqual(interpretar("guíame", c), { tipo: "guia", id: null });
  assert.deepEqual(interpretar("listo, siguiente", c), { tipo: "siguiente" });
  assert.deepEqual(interpretar("¿cómo sigue Lucas?", c), { tipo: "estado", id: "ast-4" });
  assert.deepEqual(interpretar("blablá", c), { tipo: "desconocida" });
});

test("el resumen de la tripulación menciona solo a quien tiene problemas", () => {
  const r = responder({ tipo: "tripulacion" }, ctx({ "ast-2": { spo2: 85 } }), null);
  assert.match(r.texto, /Mateo está en nivel crítico/);
  assert.match(r.texto, /otros 2 están estables/);
  assert.equal(responder({ tipo: "tripulacion" }, ctx(), null).texto, "Toda la tripulación está estable y dentro de su normal.");
});

test("guía un protocolo paso a paso hasta terminar", () => {
  const c = ctx({ "ast-2": { spo2: 85 } });
  let r = responder({ tipo: "guia", id: null }, c, null);
  assert.equal(r.guia?.id, "ast-2");
  assert.match(r.texto, /Paso 1: Colócate la mascarilla/);
  const total = r.guia!.protocolo.pasos.length;
  for (let i = 1; i < total; i++) {
    r = responder({ tipo: "siguiente" }, c, r.guia);
    assert.match(r.texto, new RegExp(`Paso ${i + 1}:`));
  }
  r = responder({ tipo: "siguiente" }, c, r.guia);
  assert.equal(r.guia, null);
  assert.match(r.texto, /terminaste el protocolo/);
});

test("guiar sin protocolos pendientes no inventa nada", () => {
  const r = responder({ tipo: "guia", id: null }, ctx(), null);
  assert.equal(r.guia, null);
  assert.match(r.texto, /No hay nada pendiente/);
});

test("las acciones salen hacia la app", () => {
  assert.deepEqual(responder({ tipo: "medir", id: "ast-4" }, ctx(), null).accion, { tipo: "medir", id: "ast-4" });
  assert.deepEqual(responder({ tipo: "apagon", activar: true }, ctx(), null).accion, { tipo: "apagon", activar: true });
  assert.match(responder({ tipo: "enlace" }, ctx({}, true), null).texto, /3 resúmenes esperan en cola/);
});

test("habla por su cuenta solo cuando algo cambia", () => {
  const primera = avisos(null, ctx());
  assert.deepEqual(primera.textos, []);
  const igual = avisos(primera.huella, ctx());
  assert.deepEqual(igual.textos, []);
  const critico = avisos(igual.huella, ctx({ "ast-4": { spo2: 85 } }));
  assert.equal(critico.textos.length, 1);
  assert.match(critico.textos[0], /Atención\. Lucas/);
  const sigue = avisos(critico.huella, ctx({ "ast-4": { spo2: 85 } }));
  assert.deepEqual(sigue.textos, []);
  const recupera = avisos(sigue.huella, ctx());
  assert.match(recupera.textos[0], /Lucas volvió a su normal/);
  const apagon = avisos(recupera.huella, ctx({}, true));
  assert.match(apagon.textos[0], /Perdimos el enlace/);
});
