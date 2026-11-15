"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { evaluar, METRICAS, peorNivel } from "@/lib/salud";
import { Simulador } from "@/lib/simulador";
import { supabase } from "@/lib/supabase";
import { ASTRONAUTAS, type Escenario, type Lectura, type Nivel } from "@/lib/tipos";
import FichaAstronauta from "./FichaAstronauta";
import TarjetaAstronauta, { COLOR, ETIQUETA } from "./TarjetaAstronauta";

const MAX_PUNTOS = 60; // lecturas guardadas por astronauta para las gráficas
const INTERVALO_MS = 2000;
const SEGUNDOS_SIN_SENAL = 10;
// La misión empezó con la llegada de la comandante: su contador marca el día.
const DIA_DE_MISION = Math.max(...ASTRONAUTAS.map((a) => a.diasEnMision));

type Historial = Record<string, Lectura[]>;
type Escenarios = Record<string, Escenario>;

const historialVacio = (): Historial => Object.fromEntries(ASTRONAUTAS.map((a) => [a.id, []]));
const escenariosIniciales = (): Escenarios => Object.fromEntries(ASTRONAUTAS.map((a) => [a.id, "normal"]));

function agregar(h: Historial, nuevas: Lectura[]): Historial {
  const copia = { ...h };
  for (const l of nuevas) {
    const lista = copia[l.astronauta_id];
    if (!lista) continue;
    const t = Date.parse(l.creado_en);
    const ultima = lista.at(-1);
    // Caso normal: la lectura es más reciente que la última y va al final.
    if (!ultima || t > Date.parse(ultima.creado_en)) {
      copia[l.astronauta_id] = [...lista, l].slice(-MAX_PUNTOS);
      continue;
    }
    // Llegó fuera de orden (carga inicial tras una lectura en vivo): se descarta
    // si ya está y, si no, se inserta en su lugar.
    if (lista.some((x) => Date.parse(x.creado_en) === t)) continue;
    copia[l.astronauta_id] = [...lista, l]
      .sort((a, b) => Date.parse(a.creado_en) - Date.parse(b.creado_en))
      .slice(-MAX_PUNTOS);
  }
  return copia;
}

// Supabase puede devolver columnas numeric como texto: se normalizan aquí.
function normalizar(f: Record<string, unknown>): Lectura {
  return {
    astronauta_id: String(f.astronauta_id),
    fc: Number(f.fc),
    spo2: Number(f.spo2),
    temp: Number(f.temp),
    hrv: Number(f.hrv),
    sueno: Number(f.sueno),
    ejercicio: Number(f.ejercicio),
    creado_en: String(f.creado_en),
  };
}

export default function Panel() {
  const modoDemo = supabase === null;
  const [historial, setHistorial] = useState<Historial>(historialVacio);
  const [escenarios, setEscenarios] = useState<Escenarios>(escenariosIniciales);
  // Hora local en que llegó la última lectura en vivo de cada astronauta. Evita
  // comparar el reloj del navegador con el de quien generó la lectura.
  const [recibido, setRecibido] = useState<Record<string, number>>({});
  const [ahora, setAhora] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // El id se conserva al cerrar para que la ficha mantenga su contenido mientras sale.
  const [ficha, setFicha] = useState<{ id: string; abierta: boolean } | null>(null);
  const sim = useRef<Simulador | null>(null);

  // Reloj: también sirve para detectar relojes que dejaron de transmitir.
  useEffect(() => {
    // La hora no puede calcularse al renderizar (el HTML del servidor no coincidiría).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Modo demo: el simulador corre en el navegador.
  useEffect(() => {
    if (!modoDemo) return;
    const s = new Simulador();
    sim.current = s;
    // Unos segundos de historia para que las gráficas no empiecen vacías.
    let inicial = historialVacio();
    for (let i = 20; i > 0; i--) inicial = agregar(inicial, s.tick(new Date(Date.now() - i * INTERVALO_MS)));
    // Datos aleatorios: se generan tras montar, no al renderizar en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistorial(inicial);
    // tick() muta el simulador: se llama fuera del actualizador, que React
    // puede ejecutar dos veces en modo estricto.
    const t = setInterval(() => {
      const lecturas = s.tick();
      setHistorial((h) => agregar(h, lecturas));
    }, INTERVALO_MS);
    return () => clearInterval(t);
  }, [modoDemo]);

  // Modo Supabase: historia reciente + lecturas nuevas por Realtime.
  useEffect(() => {
    if (!supabase) return;
    const cliente = supabase;
    let activo = true;

    (async () => {
      const { data, error } = await cliente
        .from("lecturas")
        .select("*")
        .order("creado_en", { ascending: false })
        .limit(MAX_PUNTOS * ASTRONAUTAS.length);
      if (!activo) return;
      if (error) return setError(`No se pudo leer la tabla lecturas: ${error.message}`);
      setHistorial((h) => agregar(h, (data ?? []).reverse().map(normalizar)));

      const esc = await cliente.from("escenarios").select("astronauta_id, escenario");
      if (activo && esc.data) {
        setEscenarios((e) => ({
          ...e,
          ...Object.fromEntries(esc.data.map((f) => [f.astronauta_id, f.escenario as Escenario])),
        }));
      }
    })();

    const canal = cliente
      .channel("lecturas-en-vivo")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lecturas" }, (p) => {
        const lectura = normalizar(p.new);
        const llegada = Date.now();
        setRecibido((r) => ({ ...r, [lectura.astronauta_id]: llegada }));
        setHistorial((h) => agregar(h, [lectura]));
      })
      // Escenarios cambiados desde otro panel abierto.
      .on("postgres_changes", { event: "*", schema: "public", table: "escenarios" }, (p) => {
        const f = p.new as { astronauta_id?: string; escenario?: Escenario };
        const { astronauta_id, escenario } = f;
        if (astronauta_id && escenario) setEscenarios((e) => ({ ...e, [astronauta_id]: escenario }));
      })
      .subscribe((estado) => {
        if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") {
          setError("Se perdió la conexión en tiempo real con Supabase.");
        } else if (estado === "SUBSCRIBED") {
          setError(null);
        }
      });

    return () => {
      activo = false;
      cliente.removeChannel(canal);
    };
  }, []);

  const cambiarEscenario = useCallback(async (id: string, escenario: Escenario) => {
    const previo = escenarios[id];
    setEscenarios((e) => ({ ...e, [id]: escenario }));
    if (!supabase) {
      sim.current?.setEscenario(id, escenario);
      return;
    }
    const { error } = await supabase
      .from("escenarios")
      .upsert({ astronauta_id: id, escenario, actualizado_en: new Date().toISOString() });
    if (error) {
      // El cambio no se guardó: el selector vuelve al valor anterior.
      setEscenarios((e) => ({ ...e, [id]: previo }));
      setError(`No se pudo cambiar el escenario: ${error.message}`);
    }
  }, [escenarios]);

  const restablecer = () => ASTRONAUTAS.forEach((a) => cambiarEscenario(a.id, "normal"));


  // Estado de cada astronauta a partir de su última lectura.
  const estados = ASTRONAUTAS.map((a) => {
    const ultima = historial[a.id].at(-1);
    // Se prefiere la hora de llegada local; `creado_en` solo se usa para la
    // historia cargada al abrir, antes de que llegue una lectura en vivo.
    const referencia = recibido[a.id] ?? (ultima ? Date.parse(ultima.creado_en) : null);
    const segundosDesde =
      referencia !== null && ahora !== null ? Math.max(0, Math.round((ahora - referencia) / 1000)) : null;
    const sinSenal = segundosDesde !== null && segundosDesde > SEGUNDOS_SIN_SENAL;
    return { astronauta: a, ultima, segundosDesde, sinSenal, evaluacion: ultima ? evaluar(ultima) : null };
  });

  const conDatos = estados.filter((e) => e.evaluacion && !e.sinSenal);
  const nivelTripulacion: Nivel = peorNivel(conDatos.map((e) => e.evaluacion!.nivel));
  const alertas = conDatos.flatMap((e) =>
    e.evaluacion!.alertas.map((a) => ({ ...a, nombre: e.astronauta.nombre, id: `${e.astronauta.id}-${a.metrica}` })),
  );
  const criticas = alertas.filter((a) => a.nivel === "rojo");
  const hayEscenarioActivo = Object.values(escenarios).some((e) => e !== "normal");

  // Texto para lectores de pantalla: no incluye los valores medidos, así solo
  // cambia (y se anuncia) cuando cambia el nivel o el conjunto de alertas críticas.
  const anuncio =
    conDatos.length === 0
      ? ""
      : [
          `Tripulación: ${ETIQUETA[nivelTripulacion].toLowerCase()}.`,
          ...criticas.map(
            (a) => `${a.nombre}: ${METRICAS.find((m) => m.id === a.metrica)!.etiqueta.toLowerCase()} en nivel crítico.`,
          ),
        ].join(" ");

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div>
          <h1 className="ancho-expandido text-5xl font-semibold leading-none tracking-tight sm:text-6xl">Órbita Vital</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-tenue">
            Salud de la tripulación, medida a bordo.
            <span
              className="rounded-[3px] border border-borde px-1.5 py-0.5 text-xs"
              title={modoDemo ? "Los datos los genera un simulador en este navegador" : "Datos en vivo desde Supabase"}
            >
              {modoDemo ? "Modo demo" : "En vivo"}
            </span>
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-sm text-tenue">Día {DIA_DE_MISION} de misión</p>
          <p className="ancho-condensado text-4xl font-semibold leading-tight tabular-nums">
            {ahora === null ? "--:--:--" : new Date(ahora).toISOString().slice(11, 19)}
            <span className="ml-2 text-sm font-normal text-tenue [font-variation-settings:'wdth'_100]">UTC</span>
          </p>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-[3px] border border-rojo px-4 py-3 text-sm text-rojo">
          {error}
        </p>
      )}

      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {anuncio}
      </p>

      <section className="-mt-4 flex flex-col gap-3 border-y border-borde py-4" aria-label="Estado de la tripulación">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="flex items-center gap-3 text-lg">
            <span
              className={`inline-block size-2.5 rounded-full ${nivelTripulacion === "rojo" && conDatos.length ? "pulso" : ""}`}
              style={{ background: conDatos.length ? COLOR[nivelTripulacion] : "var(--color-tenue)" }}
              aria-hidden
            />
            <span>
              <span className="font-semibold" style={{ color: conDatos.length ? COLOR[nivelTripulacion] : undefined }}>
                {conDatos.length === 0
                  ? "Esperando lecturas de los relojes"
                  : `Tripulación ${ETIQUETA[nivelTripulacion].toLowerCase()}.`}
              </span>{" "}
              <span className="text-tenue">
                {conDatos.length} de {ASTRONAUTAS.length} relojes transmitiendo,{" "}
                {alertas.length === 0 ? "sin alertas" : `${alertas.length} ${alertas.length === 1 ? "alerta" : "alertas"}`}.
              </span>
            </span>
          </p>
          <button
            type="button"
            onClick={restablecer}
            disabled={!hayEscenarioActivo}
            className="min-h-10 rounded-[3px] border border-borde px-3 text-sm hover:border-texto focus-visible:outline-2 focus-visible:outline-acento disabled:cursor-not-allowed disabled:opacity-40"
          >
            Restablecer escenarios
          </button>
        </div>
        {criticas.length > 0 && (
          <ul className="space-y-1 text-sm">
            {criticas.map((a) => (
              <li key={a.id} className="text-rojo">
                ▲ <span className="font-medium">{a.nombre}:</span> {a.mensaje}. Avisar a la médica de a bordo.
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-x-8 gap-y-14 md:grid-cols-2 xl:grid-cols-4" aria-label="Tripulación">
        {estados.map((e) => (
          <TarjetaAstronauta
            key={e.astronauta.id}
            astronauta={e.astronauta}
            historial={historial[e.astronauta.id]}
            escenario={escenarios[e.astronauta.id]}
            sinSenal={e.sinSenal}
            segundosDesde={e.segundosDesde}
            onEscenario={(esc) => cambiarEscenario(e.astronauta.id, esc)}
            onAbrirFicha={() => setFicha({ id: e.astronauta.id, abierta: true })}
          />
        ))}
      </section>

      {(() => {
        const e = estados.find((x) => x.astronauta.id === ficha?.id);
        return (
          <FichaAstronauta
            astronauta={e?.astronauta ?? null}
            abierta={ficha?.abierta ?? false}
            evaluacion={e?.evaluacion ?? null}
            fcActual={e?.ultima?.fc ?? null}
            sinSenal={e?.sinSenal ?? false}
            onCerrar={() => setFicha((f) => (f ? { ...f, abierta: false } : f))}
          />
        );
      })()}

      <footer className="border-t border-borde pt-4 text-xs text-tenue">
        Prototipo de hackathon con datos simulados. Los umbrales son ilustrativos y no sustituyen criterio médico.
      </footer>
    </main>
  );
}
