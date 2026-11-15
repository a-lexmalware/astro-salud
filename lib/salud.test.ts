import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluar, peorNivel } from "./salud";
import type { Lectura } from "./tipos";

const sana: Lectura = {
  astronauta_id: "ast-1",
  fc: 65,
  spo2: 98,
  temp: 36.6,
  hrv: 60,
  sueno: 7.5,
  ejercicio: 40,
  creado_en: "2026-01-01T00:00:00.000Z",
};

test("una lectura sana da nivel verde, índice 100 y ninguna alerta", () => {
  const e = evaluar(sana);
  assert.equal(e.nivel, "verde");
  assert.equal(e.indice, 100);
  assert.deepEqual(e.alertas, []);
});

test("la hipoxia es crítica y resta el peso completo del oxígeno", () => {
  const e = evaluar({ ...sana, spo2: 85 });
  assert.equal(e.nivel, "rojo");
  assert.equal(e.porMetrica.spo2, "rojo");
  assert.equal(e.indice, 70); // el oxígeno pesa 30 de 100
  assert.equal(e.alertas[0].metrica, "spo2");
});

test("una métrica en precaución resta la mitad de su peso", () => {
  const e = evaluar({ ...sana, fc: 110 });
  assert.equal(e.nivel, "amarillo");
  assert.equal(e.indice, 88); // la frecuencia cardiaca pesa 25: resta 12.5
});

test("los umbrales de frecuencia cardiaca cubren valores altos y bajos", () => {
  assert.equal(evaluar({ ...sana, fc: 130 }).porMetrica.fc, "rojo");
  assert.equal(evaluar({ ...sana, fc: 38 }).porMetrica.fc, "rojo");
  assert.equal(evaluar({ ...sana, fc: 45 }).porMetrica.fc, "amarillo");
  assert.match(evaluar({ ...sana, fc: 45 }).alertas[0].mensaje, /baja/);
  assert.match(evaluar({ ...sana, fc: 130 }).alertas[0].mensaje, /alta/);
});

test("las alertas críticas van antes que las de precaución", () => {
  const e = evaluar({ ...sana, sueno: 5, temp: 39 });
  assert.deepEqual(
    e.alertas.map((a) => a.nivel),
    ["rojo", "amarillo"],
  );
});

test("el ejercicio es una meta y nunca genera alerta", () => {
  assert.equal(evaluar({ ...sana, ejercicio: 0 }).nivel, "verde");
});

test("peorNivel devuelve el más grave, y verde si no hay datos", () => {
  assert.equal(peorNivel(["verde", "rojo", "amarillo"]), "rojo");
  assert.equal(peorNivel(["verde", "amarillo"]), "amarillo");
  assert.equal(peorNivel([]), "verde");
});
