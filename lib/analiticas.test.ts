import assert from "node:assert/strict";
import { test } from "node:test";
import { analiticaDe, ANTES, DESPUES, fueraDeRango } from "./analiticas";
import { ASTRONAUTAS } from "./tipos";

test("fuera de rango distingue bajo, alto y normal", () => {
  assert.equal(fueraDeRango(11.5, 11.7, 15.5), "bajo");
  assert.equal(fueraDeRango(103, 65, 99), "alto");
  assert.equal(fueraDeRango(14, 13.2, 17.1), null);
  assert.equal(fueraDeRango(null, 1, 2), null);
  assert.equal(fueraDeRango(5, null, null), null);
});

test("cada astronauta tiene una analítica real con valores antes y después del vuelo", () => {
  for (const a of ASTRONAUTAS) {
    const marcadores = analiticaDe(a.analiticaOsdr);
    assert.ok(marcadores, `sin analítica para ${a.nombre}`);
    assert.ok(marcadores.length > 0);
    for (const m of marcadores) {
      assert.equal(typeof m.valores[ANTES], "number", `${a.nombre}: ${m.nombre} sin valor antes del vuelo`);
      assert.equal(typeof m.valores[DESPUES], "number", `${a.nombre}: ${m.nombre} sin valor al volver`);
    }
  }
});

test("un tripulante que no existe no tiene analítica", () => {
  assert.equal(analiticaDe("C999"), null);
});
