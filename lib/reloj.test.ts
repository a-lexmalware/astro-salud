import assert from "node:assert/strict";
import { test } from "node:test";
import { parsearMedicionFC, rmssd } from "./reloj";

const vista = (...bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);

test("frecuencia cardiaca de 8 bits sin intervalos RR", () => {
  assert.deepEqual(parsearMedicionFC(vista(0x00, 72)), { fc: 72, rr: [] });
});

test("frecuencia cardiaca de 16 bits", () => {
  assert.deepEqual(parsearMedicionFC(vista(0x01, 0x2c, 0x01)), { fc: 300, rr: [] });
});

test("intervalos RR convertidos de 1/1024 s a milisegundos", () => {
  // 1024 = 1000 ms, 512 = 500 ms
  const m = parsearMedicionFC(vista(0x10, 60, 0x00, 0x04, 0x00, 0x02));
  assert.deepEqual(m, { fc: 60, rr: [1000, 500] });
});

test("la energía gastada se salta antes de leer los intervalos RR", () => {
  const m = parsearMedicionFC(vista(0x18, 60, 0xff, 0xff, 0x00, 0x04));
  assert.deepEqual(m, { fc: 60, rr: [1000] });
});

test("un byte suelto al final no se interpreta como intervalo", () => {
  assert.deepEqual(parsearMedicionFC(vista(0x10, 60, 0x00, 0x04, 0x07)).rr, [1000]);
});

test("rmssd necesita un mínimo de intervalos", () => {
  assert.equal(rmssd([]), null);
  assert.equal(rmssd([800, 810, 790, 805]), null);
});

test("rmssd de una serie conocida", () => {
  // diferencias: 10, -20, 30, -40 -> media de cuadrados 750 -> raíz 27.39
  assert.equal(rmssd([800, 810, 790, 820, 780]), 27);
  assert.equal(rmssd([800, 800, 800, 800, 800]), 0);
});
