import assert from "node:assert/strict";
import { test } from "node:test";
import { PulsoReal, SEGUNDOS_PULSO_VIGENTE } from "./pulso";

test("sin filas no hay pulso real", () => {
  assert.equal(new PulsoReal().vigente("ast-1", 0), null);
});

test("el último pulso vale mientras sea reciente", () => {
  const p = new PulsoReal();
  p.registrar("ast-1", 70, 1000);
  p.registrar("ast-1", 74, 3000);
  assert.equal(p.vigente("ast-1", 3000 + SEGUNDOS_PULSO_VIGENTE * 1000), 74);
  assert.equal(p.vigente("ast-1", 3001 + SEGUNDOS_PULSO_VIGENTE * 1000), null);
});

test("cada astronauta lleva su propio pulso", () => {
  const p = new PulsoReal();
  p.registrar("ast-2", 88, 0);
  assert.equal(p.vigente("ast-1", 0), null);
  assert.equal(p.vigente("ast-2", 0), 88);
});

test("los valores imposibles se ignoran", () => {
  const p = new PulsoReal();
  p.registrar("ast-1", 0, 0);
  p.registrar("ast-1", 400, 0);
  p.registrar("ast-1", Number.NaN, 0);
  assert.equal(p.vigente("ast-1", 0), null);
});
