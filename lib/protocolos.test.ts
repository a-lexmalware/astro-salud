import assert from "node:assert/strict";
import { test } from "node:test";
import { LineaBase, PERSISTENCIA } from "./lineaBase";
import { protocolosPara } from "./protocolos";
import { evaluar } from "./salud";
import type { Lectura } from "./tipos";

const sana: Lectura = {
  astronauta_id: "ast-1",
  fc: 62,
  spo2: 98,
  temp: 36.6,
  hrv: 60,
  sueno: 7.5,
  ejercicio: 40,
  creado_en: "2026-01-01T00:00:00.000Z",
};

const desviacionesFc = () => {
  const lb = new LineaBase();
  for (let i = 0; i < 40; i++) lb.actualizar(sana);
  let d = lb.actualizar({ ...sana, fc: 80 });
  for (let i = 1; i < PERSISTENCIA; i++) d = lb.actualizar({ ...sana, fc: 80 });
  return d;
};

test("sin alertas ni desviaciones no hay protocolos", () => {
  assert.deepEqual(protocolosPara(evaluar(sana), []), []);
  assert.deepEqual(protocolosPara(null, []), []);
});

test("cada protocolo trae pasos, cuándo volver a medir y cuándo escalar", () => {
  const casos: Partial<Lectura>[] = [{ spo2: 85 }, { spo2: 92 }, { fc: 130 }, { fc: 38 }, { temp: 39 }, { temp: 34.5 }, { hrv: 15 }, { sueno: 3 }];
  for (const c of casos) {
    const ps = protocolosPara(evaluar({ ...sana, ...c }), []);
    assert.equal(ps.length, 1, JSON.stringify(c));
    assert.ok(ps[0].pasos.length >= 3);
    assert.ok(ps[0].volverAMedirMin > 0);
    assert.ok(ps[0].escalar.length > 10);
  }
});

test("distingue pulso alto de pulso bajo", () => {
  assert.match(protocolosPara(evaluar({ ...sana, fc: 130 }), [])[0].titulo, /alto/);
  assert.match(protocolosPara(evaluar({ ...sana, fc: 38 }), [])[0].titulo, /bajo/);
});

test("lo crítico va antes que la precaución", () => {
  const ps = protocolosPara(evaluar({ ...sana, spo2: 85, sueno: 5 }), []);
  assert.deepEqual(
    ps.map((p) => p.gravedad),
    ["rojo", "amarillo"],
  );
});

test("una desviación de la línea base tiene su propio protocolo", () => {
  const ps = protocolosPara(evaluar(sana), desviacionesFc());
  assert.equal(ps.length, 1);
  assert.equal(ps[0].origen, "linea-base");
  assert.match(ps[0].titulo, /tu normal/);
});

test("si la métrica ya rebasó el umbral, no se duplica con la línea base", () => {
  const ps = protocolosPara(evaluar({ ...sana, fc: 130 }), desviacionesFc());
  assert.equal(ps.length, 1);
  assert.equal(ps[0].origen, "umbral");
});
