import { ASTRONAUTAS, type Escenario, type Lectura } from "./tipos";

/**
 * Simulador de smartwatch. Lo usan tanto el navegador (modo demo) como
 * `scripts/simulador.ts` (modo Supabase), así ambos generan los mismos datos.
 */

interface Estado {
  fc: number;
  spo2: number;
  temp: number;
  hrv: number;
  sueno: number;
  ejercicio: number;
}

// Valores hacia los que tiende cada escenario.
const OBJETIVOS: Record<Escenario, Partial<Estado>> = {
  normal: {},
  hipoxia: { spo2: 85, fc: 118, hrv: 24 },
  taquicardia: { fc: 148, hrv: 14 },
  fiebre: { temp: 38.9, fc: 108, hrv: 28 },
  fatiga: { hrv: 17, sueno: 3.4, fc: 92 },
  reloj: {},
};

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const ruido = (amplitud: number) => (Math.random() - 0.5) * 2 * amplitud;

/** Lo que aporta un reloj real: la HRV es null si no envía intervalos RR. */
export interface DatosReales {
  fc: number;
  hrv: number | null;
}

export class Simulador {
  private base = new Map<string, Estado>();
  private estado = new Map<string, Estado>();
  escenarios = new Map<string, Escenario>();
  // Valores medidos por un reloj real; sustituyen a los simulados.
  private real = new Map<string, DatosReales>();

  constructor() {
    ASTRONAUTAS.forEach((a, i) => {
      const base: Estado = {
        fc: 62 + i * 4,
        spo2: 98 - (i % 2),
        temp: 36.5 + i * 0.1,
        hrv: 62 - i * 6,
        sueno: 7.2 - i * 0.3,
        ejercicio: 35 + i * 20,
      };
      this.base.set(a.id, base);
      this.estado.set(a.id, { ...base });
      this.escenarios.set(a.id, "normal");
    });
  }

  setEscenario(id: string, escenario: Escenario) {
    if (this.escenarios.has(id)) this.escenarios.set(id, escenario);
  }

  /** Fija (o quita, con null) los valores reales de un astronauta. */
  setReal(id: string, datos: DatosReales | null) {
    if (!this.estado.has(id)) return;
    if (datos) this.real.set(id, datos);
    else this.real.delete(id);
  }

  tieneReal(id: string) {
    return this.real.has(id);
  }

  /** Avanza un paso y devuelve una lectura por astronauta. */
  tick(ahora = new Date()): Lectura[] {
    return ASTRONAUTAS.map((a) => {
      const base = this.base.get(a.id)!;
      const e = this.estado.get(a.id)!;
      const objetivo = { ...base, ...OBJETIVOS[this.escenarios.get(a.id) ?? "normal"] };

      // Cada valor se acerca poco a poco a su objetivo, con algo de ruido.
      e.fc = limitar(e.fc + (objetivo.fc - e.fc) * 0.25 + ruido(2.2), 35, 190);
      e.spo2 = limitar(e.spo2 + (objetivo.spo2 - e.spo2) * 0.25 + ruido(0.5), 70, 100);
      e.temp = limitar(e.temp + (objetivo.temp - e.temp) * 0.2 + ruido(0.05), 34, 41);
      e.hrv = limitar(e.hrv + (objetivo.hrv - e.hrv) * 0.25 + ruido(2.5), 5, 120);
      e.sueno = limitar(e.sueno + (objetivo.sueno - e.sueno) * 0.3, 0, 10);
      e.ejercicio = Math.min(150, e.ejercicio + (Math.random() < 0.15 ? 1 : 0));

      // Con reloj real, sus valores mandan. Se guardan en el estado para que,
      // al desconectarlo, la simulación continúe desde ahí sin saltos.
      const real = this.real.get(a.id);
      if (real) {
        e.fc = limitar(real.fc, 0, 255);
        if (real.hrv !== null) e.hrv = limitar(real.hrv, 0, 300);
      }

      return {
        astronauta_id: a.id,
        fc: Math.round(e.fc),
        spo2: Math.round(e.spo2),
        temp: Math.round(e.temp * 10) / 10,
        hrv: Math.round(e.hrv),
        sueno: Math.round(e.sueno * 10) / 10,
        ejercicio: Math.round(e.ejercicio),
        creado_en: ahora.toISOString(),
      };
    });
  }
}
