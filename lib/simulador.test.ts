import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluar } from "./salud";
import { Simulador } from "./simulador";
import { ASTRONAUTAS } from "./tipos";

const ID = ASTRONAUTAS[0].id;
const avanzar = (s: Simulador, pasos: number) => {
  let ultimas = s.tick();
  for (let i = 1; i < pasos; i++) ultimas = s.tick();
  return ultimas;
};
const de = (s: Simulador, pasos: number, id = ID) => avanzar(s, pasos).find((l) => l.astronauta_id === id)!;

test("cada paso devuelve una lectura por astronauta con la hora indicada", () => {
  const ahora = new Date("2026-01-01T00:00:00.000Z");
  const lecturas = new Simulador().tick(ahora);
  assert.deepEqual(
    lecturas.map((l) => l.astronauta_id),
    ASTRONAUTAS.map((a) => a.id),
  );
  assert.ok(lecturas.every((l) => l.creado_en === ahora.toISOString()));
});

test("en escenario normal la tripulación se mantiene sin alertas críticas", () => {
  const lecturas = avanzar(new Simulador(), 50);
  assert.ok(lecturas.every((l) => evaluar(l).nivel !== "rojo"));
});

test("la hipoxia lleva el oxígeno a nivel crítico solo en el astronauta elegido", () => {
  const s = new Simulador();
  s.setEscenario(ID, "hipoxia");
  const lecturas = avanzar(s, 40);
  const afectado = lecturas.find((l) => l.astronauta_id === ID)!;
  assert.ok(afectado.spo2 < 90, `spo2 = ${afectado.spo2}`);
  assert.equal(evaluar(afectado).nivel, "rojo");
  assert.ok(lecturas.filter((l) => l.astronauta_id !== ID).every((l) => l.spo2 >= 95));
});

test("al volver a normal los valores se recuperan", () => {
  const s = new Simulador();
  s.setEscenario(ID, "taquicardia");
  assert.ok(de(s, 40).fc > 120);
  s.setEscenario(ID, "normal");
  assert.ok(de(s, 40).fc < 100);
});

test("un escenario para un astronauta desconocido se ignora", () => {
  const s = new Simulador();
  s.setEscenario("no-existe", "fiebre");
  assert.equal(s.escenarios.has("no-existe"), false);
});
