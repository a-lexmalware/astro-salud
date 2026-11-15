import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DURACION_MS,
  ESPERA_INICIAL_MS,
  esperaHastaSiguiente,
  INCIDENTES,
  PAUSA_MS,
  planificar,
} from "./incidentes";

const IDS = ["ast-1", "ast-2", "ast-3", "ast-4"];
// Generador fijo: devuelve siempre el mismo valor entre 0 y 1.
const fijo = (v: number) => () => v;

test("todos los incidentes usan un escenario del simulador distinto de normal", () => {
  const validos = ["hipoxia", "taquicardia", "fiebre", "fatiga"];
  assert.ok(INCIDENTES.every((t) => validos.includes(t.escenario)));
  assert.equal(new Set(INCIDENTES.map((t) => t.id)).size, INCIDENTES.length);
});

test("el primer incidente llega tras la espera inicial y los siguientes tras una pausa", () => {
  assert.equal(esperaHastaSiguiente(fijo(0.5), true), ESPERA_INICIAL_MS);
  assert.equal(esperaHastaSiguiente(fijo(0), false), PAUSA_MS[0]);
  assert.equal(esperaHastaSiguiente(fijo(1), false), PAUSA_MS[1]);
});

test("un incidente nuevo está en curso y dura lo previsto", () => {
  const i = planificar(fijo(0), 1000, IDS, 7);
  assert.equal(i.id, 7);
  assert.equal(i.estado, "en-curso");
  assert.equal(i.inicio, 1000);
  assert.equal(i.fin, 1000 + DURACION_MS[0]);
  assert.ok(IDS.includes(i.astronautaId));
});

test("no repite astronauta ni tipo de problema con el incidente anterior", () => {
  for (const v of [0, 0.3, 0.6, 0.99]) {
    const anterior = planificar(fijo(v), 0, IDS, 1);
    const siguiente = planificar(fijo(v), 0, IDS, 2, anterior);
    assert.notEqual(siguiente.astronautaId, anterior.astronautaId);
    assert.notEqual(siguiente.tipo.escenario, anterior.tipo.escenario);
  }
});

test("con un solo astronauta puede repetirlo", () => {
  const anterior = planificar(fijo(0), 0, ["ast-1"], 1);
  assert.equal(planificar(fijo(0), 0, ["ast-1"], 2, anterior).astronautaId, "ast-1");
});
