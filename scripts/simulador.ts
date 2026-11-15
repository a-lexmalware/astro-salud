/**
 * Simulador de smartwatches: envía una lectura por astronauta a Supabase
 * cada 2 segundos y obedece los escenarios que se activan desde el panel.
 *
 *   npm run simulador
 */
import { createClient } from "@supabase/supabase-js";
import { Simulador } from "../lib/simulador";
import type { Escenario } from "../lib/tipos";

// Se carga aquí (y no con --env-file) para poder dar un mensaje claro si falta el archivo.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local: la comprobación de abajo explica qué falta.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !clave) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(url, clave, { auth: { persistSession: false } });
const sim = new Simulador();
const INTERVALO_MS = 2000;

async function paso() {
  const { data: escenarios, error: errorEsc } = await supabase.from("escenarios").select("astronauta_id, escenario");
  if (errorEsc) console.error("No se pudieron leer los escenarios:", errorEsc.message);
  escenarios?.forEach((e) => sim.setEscenario(e.astronauta_id, e.escenario as Escenario));

  // Los astronautas con reloj real ("reloj") los envía el panel que tiene el reloj conectado.
  const lecturas = sim.tick().filter((l) => sim.escenarios.get(l.astronauta_id) !== "reloj");
  if (lecturas.length === 0) return;
  const { error } = await supabase.from("lecturas").insert(lecturas);
  if (error) {
    console.error("Error al enviar lecturas:", error.message);
    return;
  }
  console.log(
    new Date().toLocaleTimeString(),
    lecturas.map((l) => `${l.astronauta_id} FC ${l.fc} SpO2 ${l.spo2}`).join(" | "),
  );
}

// Cada paso espera al anterior, así no se solapan si la red va lenta.
async function bucle() {
  for (;;) {
    const inicio = Date.now();
    try {
      await paso();
    } catch (e) {
      console.error("Fallo inesperado en el paso:", e instanceof Error ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, Math.max(0, INTERVALO_MS - (Date.now() - inicio))));
  }
}

console.log("Simulador en marcha. Ctrl+C para detenerlo.");
bucle();
