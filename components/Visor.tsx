"use client";

import { useState, type ReactNode } from "react";
import { RETRASO_MARTE_MIN, type EstadoEnlace } from "@/lib/enlace";
import type { Desviacion } from "@/lib/lineaBase";
import type { Protocolo } from "@/lib/protocolos";
import { META_EJERCICIO, type Evaluacion } from "@/lib/salud";
import { ESCENARIOS, iniciales, type Astronauta, type Escenario, type Lectura, type Nivel } from "@/lib/tipos";
import Corazon from "./Corazon";
import Sparkline from "./Sparkline";

/** Colores del visor: más brillantes que los del panel, para leerse sobre el espacio. */
const COLOR: Record<Nivel | "vigilar", string> = {
  verde: "#4ADE9A",
  amarillo: "#FFB547",
  vigilar: "#FFB547",
  rojo: "#FF5A5F",
};

// Estrellas fijas (sin azar al renderizar, para que el servidor y el navegador coincidan).
const ESTRELLAS = Array.from({ length: 70 }, (_, i) => {
  const n = 17 + i * 53;
  return {
    x: (n * 7919) % 1000 / 10,
    y: (n * 104729) % 700 / 10,
    t: 1 + (i % 3),
    o: 0.25 + (i % 5) * 0.13,
    d: ((i * 0.37) % 3).toFixed(2),
    dur: 2 + (i % 4),
  };
});

export interface DatosVisor {
  astronauta: Astronauta;
  historial: Lectura[];
  evaluacion: Evaluacion | null;
  desviaciones: Desviacion[];
  protocolos: Protocolo[];
  aprendiendo: boolean;
  sinSenal: boolean;
  pulsoReal: boolean;
}

interface Props {
  datos: DatosVisor;
  tripulacion: { id: string; nombre: string; nivel: Nivel; vigilar: boolean }[];
  onElegir: (id: string) => void;
  enlace: EstadoEnlace;
  apagon: boolean;
  sinInternet: boolean;
  onAlternarApagon: () => void;
  onMedir: () => void;
  onAvisarMedica: (texto: string) => void;
  ahora: number | null;
  diaMision: number;
  /** Asistente (VIERNES), ya armado por el panel. */
  asistente: ReactNode;
  /** Pestañas Visor / Tripulación. */
  pestanas: ReactNode;
  aviso: string | null;
  escenario: Escenario;
  onEscenario: (e: Escenario) => void;
}

/**
 * "Mi estado" desde dentro del casco: el tripulante ve su núcleo de salud, sus
 * signos vitales, qué hacer ahora y el enlace con la Tierra, con VIERNES arriba.
 */
export default function Visor({
  datos,
  tripulacion,
  onElegir,
  enlace,
  apagon,
  sinInternet,
  onAlternarApagon,
  onMedir,
  onAvisarMedica,
  ahora,
  diaMision,
  asistente,
  pestanas,
  aviso,
  escenario,
  onEscenario,
}: Props) {
  const { astronauta: a, historial, evaluacion, desviaciones, protocolos, aprendiendo, sinSenal, pulsoReal } = datos;
  const l = historial.at(-1) ?? null;
  const vigente = !!evaluacion && !sinSenal;
  const soloBase = evaluacion ? desviaciones.filter((d) => !evaluacion.alertas.some((x) => x.metrica === d.metrica)) : [];
  const vigilar = vigente && evaluacion.nivel === "verde" && soloBase.length > 0;
  const nivel: Nivel = vigilar ? "amarillo" : (evaluacion?.nivel ?? "verde");
  const color = !vigente ? "#8A97AE" : vigilar ? COLOR.vigilar : COLOR[nivel];
  const indice = evaluacion ? Math.max(0, evaluacion.indice - (vigente ? soloBase.length * 5 : 0)) : null;
  const etiqueta = sinSenal
    ? "Sin señal"
    : !evaluacion
      ? "Esperando datos"
      : vigilar
        ? "Vigilar"
        : { verde: "Estable", amarillo: "Precaución", rojo: "Crítico" }[nivel];
  const nombre = a.nombre.split(" ")[0];
  const resumen = !vigente
    ? "Esperando lecturas de tu reloj"
    : nivel === "rojo"
      ? (evaluacion.alertas[0]?.mensaje ?? "Actúa ahora")
      : vigilar
        ? `${soloBase[0].mensaje}. Los umbrales todavía no lo marcan.`
        : nivel === "amarillo"
          ? (evaluacion.alertas[0]?.mensaje ?? "Precaución")
          : aprendiendo
            ? "Aprendiendo tu normal…"
            : "Todo dentro de tu normal";

  const desvDe = (m: string) => soloBase.find((d) => d.metrica === m);
  const nivelDe = (m: keyof Evaluacion["porMetrica"]) => {
    if (!vigente) return "#8A97AE";
    const n = evaluacion.porMetrica[m];
    if (n !== "verde") return COLOR[n];
    return desvDe(m) ? COLOR.vigilar : "#E8EEF8";
  };

  // Pasos marcados por protocolo (se reinicia al cambiar de protocolo).
  const [hechos, setHechos] = useState<Record<string, boolean>>({});
  const p = protocolos[0] ?? null;
  const marcados = p ? p.pasos.filter((_, i) => hechos[`${a.id}:${p.id}:${i}`]).length : 0;

  const colorEnlace = apagon ? "#FF5A5F" : "#4ADE9A";

  return (
    <div className={`visor-escena ${apagon ? "visor-apagon" : ""}`}>
      {/* Fondo: estrellas, Tierra, marco del casco y línea de escaneo. Todo decorativo. */}
      <div className="visor-cielo" aria-hidden>
        {ESTRELLAS.map((e, i) => (
          <span
            key={i}
            className="visor-estrella"
            style={{
              left: `${e.x}%`,
              top: `${e.y}%`,
              width: e.t,
              height: e.t,
              opacity: e.o,
              animationDelay: `${e.d}s`,
              animationDuration: `${e.dur}s`,
            }}
          />
        ))}
      </div>
      <div className="visor-tierra" aria-hidden>
        <div className="visor-nubes" />
      </div>
      <div className="visor-marco" aria-hidden>
        <div className="visor-escaneo" />
      </div>
      {apagon && <div className="visor-interferencia" aria-hidden />}

      <div className="visor-contenido mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-10 lg:px-16 lg:py-10">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-xs tracking-[0.28em] text-[#6FE3FF]">ÓRBITA VITAL</p>
            <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Mi estado · {a.nombre}</h1>
          </div>
          <div className="visor-cinta hidden flex-1 lg:block" aria-hidden />
          <div className="flex flex-wrap items-end gap-6">
            {pestanas}
            <div className="text-right">
              <p className="text-sm text-[#8A97AE]">Día {diaMision} de misión</p>
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {ahora === null ? "--:--:--" : new Date(ahora).toISOString().slice(11, 19)}
                <span className="ml-1 text-xs font-normal text-[#8A97AE]">UTC</span>
              </p>
            </div>
          </div>
        </header>

        {asistente}

        {aviso && (
          <p role="status" className="visor-aparece -mt-2 rounded-[10px] border border-[#4ADE9A]/50 px-4 py-3 text-sm text-[#4ADE9A]">
            {aviso}
          </p>
        )}

        <div className="visor-rejilla">
          <section aria-labelledby="visor-vitales" className="visor-panel visor-panel-izq">
            <h2 id="visor-vitales" className="visor-titulo">
              Signos vitales
            </h2>
            <div className="flex flex-col gap-1 border-b border-[#6FE3FF]/15 pb-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 text-[#C9D3E3]">
                  <Corazon fc={l && !sinSenal ? l.fc : null} color={nivelDe("fc")} className="size-5" />
                  Pulso
                  {pulsoReal && (
                    <span className="flex items-center gap-1 text-xs font-medium text-[#FF5A5F]">
                      <span className="pulso inline-block size-1.5 rounded-full bg-[#FF5A5F]" aria-hidden />
                      cámara
                    </span>
                  )}
                </span>
                <span className="font-mono text-4xl font-semibold tabular-nums" style={{ color: nivelDe("fc") }}>
                  {l?.fc ?? "--"}
                  <span className="ml-1 text-sm font-normal text-[#8A97AE]">lpm</span>
                </span>
              </div>
              <Sparkline valores={historial.map((x) => x.fc)} color={nivelDe("fc")} etiqueta="Tendencia del pulso" />
              {desvDe("fc") && <p className="visor-aparece text-sm text-[#FFB547]">◆ {desvDe("fc")!.mensaje}</p>}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {(
                [
                  ["spo2", "Oxígeno", "%", 0],
                  ["temp", "Temperatura", "°C", 1],
                  ["hrv", "Variabilidad", "ms", 0],
                  ["sueno", "Sueño", "h", 1],
                ] as const
              ).map(([m, et, u, dec]) => (
                <div key={m}>
                  <dt className="text-sm text-[#8A97AE]">{et}</dt>
                  <dd className="font-mono text-2xl font-semibold tabular-nums" style={{ color: nivelDe(m) }}>
                    {l ? l[m].toFixed(dec) : "--"}
                    <span className="ml-1 text-xs font-normal text-[#8A97AE]">{u}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <div>
              <div className="flex justify-between text-sm text-[#8A97AE]">
                <span>Ejercicio de hoy</span>
                <span>
                  {l?.ejercicio ?? "--"} de {META_EJERCICIO} min
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#6FE3FF]/15" aria-hidden>
                <div
                  className="visor-barra relative h-1 rounded-full bg-[#6FE3FF]"
                  style={{ width: `${Math.min(100, ((l?.ejercicio ?? 0) / META_EJERCICIO) * 100)}%` }}
                />
              </div>
            </div>
            <button type="button" onClick={onMedir} className="visor-boton">
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              Medir pulso con cámara
            </button>
          </section>

          <section aria-label={`Estado general: ${etiqueta}`} className="visor-nucleo-zona">
            <div className="visor-anillos" aria-hidden>
              <div className="visor-anillo visor-anillo-a" style={{ borderColor: color, boxShadow: `0 0 30px ${color}55` }}>
                <span className="visor-sat" style={{ background: color, boxShadow: `0 0 18px ${color}` }} />
              </div>
              <div className="visor-anillo visor-anillo-b">
                <span className="visor-sat visor-sat-b" />
              </div>
              <div className="visor-anillo visor-anillo-c">
                <span className="visor-sat visor-sat-c" />
              </div>
            </div>
            <span className="visor-onda" style={{ borderColor: color }} aria-hidden />
            <span className="visor-onda visor-onda-2" style={{ borderColor: color }} aria-hidden />
            <div className="visor-nucleo" style={{ boxShadow: `0 30px 80px rgb(0 0 0 / 0.6), 0 0 60px ${color}55` }}>
              <Corazon fc={l && !sinSenal ? l.fc : null} color={color} className="size-11" />
              <p className="font-mono text-6xl font-semibold leading-none tabular-nums" style={{ color }}>
                {indice ?? "--"}
              </p>
              <p className="text-xs text-[#8A97AE]">índice de salud</p>
              <p className="mt-1 text-xl font-semibold" style={{ color }} aria-live="polite">
                {etiqueta}
              </p>
            </div>
            <p className="visor-resumen">{resumen}</p>
          </section>

          <section
            aria-labelledby="visor-hacer"
            className="visor-panel visor-panel-der"
            style={p ? { borderColor: COLOR[p.gravedad] } : undefined}
          >
            <h2 id="visor-hacer" className="visor-titulo">
              ¿Qué hago ahora?
            </h2>
            {p ? (
              <div className="flex flex-col gap-3">
                <p className="text-lg font-semibold leading-snug">{p.titulo}</p>
                <p className="text-sm text-[#A9B5C8]">{p.porque}</p>
                <ul className="flex flex-col gap-2.5">
                  {p.pasos.map((paso, i) => {
                    const clave = `${a.id}:${p.id}:${i}`;
                    const hecho = !!hechos[clave];
                    return (
                      <li key={clave}>
                        <label className={`flex cursor-pointer items-start gap-3 leading-snug ${hecho ? "text-[#8A97AE] line-through" : ""}`}>
                          <input
                            type="checkbox"
                            checked={hecho}
                            onChange={() => setHechos((h) => ({ ...h, [clave]: !hecho }))}
                            className="mt-0.5 size-5 shrink-0 accent-[#6FE3FF]"
                          />
                          <span>{paso}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-sm text-[#8A97AE]">
                  {marcados === p.pasos.length
                    ? `Listo. Vuelve a medir en ${p.volverAMedirMin >= 60 ? `${Math.round(p.volverAMedirMin / 60)} h` : `${p.volverAMedirMin} min`}.`
                    : `${marcados} de ${p.pasos.length} pasos`}
                </p>
                <p className="text-xs leading-snug text-[#8A97AE]">{p.escalar}</p>
                <button
                  type="button"
                  onClick={() => onAvisarMedica(`${a.nombre}: ${p.titulo.toLowerCase()}`)}
                  className="min-h-11 rounded-[10px] font-semibold text-[#04060C]"
                  style={{ background: COLOR[p.gravedad] }}
                >
                  Avisar a la médica de a bordo
                </button>
                {protocolos.length > 1 && (
                  <p className="text-xs text-[#8A97AE]">
                    Después: {protocolos
                      .slice(1)
                      .map((x) => x.titulo.toLowerCase())
                      .join(" · ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="leading-relaxed text-[#C9D3E3]">
                {aprendiendo
                  ? "Estoy aprendiendo tu normal. En unos segundos podré avisarte si algo cambia."
                  : `Todo dentro de tu normal, ${nombre}. Sigue con tu rutina y tu ejercicio de resistencia.`}
              </p>
            )}
          </section>
        </div>

        <section
          aria-label="Enlace con la Tierra y tripulación"
          className="visor-enlace flex flex-wrap items-center gap-x-5 gap-y-3"
          style={{ borderColor: apagon ? "#FF5A5F" : undefined }}
        >
          <svg viewBox="0 0 32 32" className="size-8 shrink-0" fill="none" stroke={colorEnlace} strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M8 26h16M16 26V15" />
            <circle cx="16" cy="13" r="2.5" fill={colorEnlace} />
            <g className={apagon ? "" : "ondas"} opacity={apagon ? 0.35 : 1}>
              <path d="M11 8a7 7 0 0 0 0 10M21 8a7 7 0 0 1 0 10" />
              <path d="M7 4.5a12 12 0 0 0 0 17M25 4.5a12 12 0 0 1 0 17" />
            </g>
            {apagon && <path d="M6 6l20 20" strokeWidth="2.2" />}
          </svg>
          <div className="min-w-0 flex-[999_1_260px]">
            <p className="font-semibold" style={{ color: colorEnlace }} aria-live="polite">
              {apagon ? (sinInternet ? "Sin internet" : "Apagón de comunicaciones") : "Enlace con la Tierra: conectado"}
            </p>
            <p className="text-sm text-[#A9B5C8]">
              {apagon
                ? `Todo sigue funcionando a bordo. ${enlace.cola.length} ${enlace.cola.length === 1 ? "resumen espera" : "resúmenes esperan"} en cola.`
                : `Retraso de la señal ~${RETRASO_MARTE_MIN} min · ${enlace.enviados} ${enlace.enviados === 1 ? "resumen enviado" : "resúmenes enviados"}`}
            </p>
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Ver el estado de otro tripulante">
            {tripulacion.map((t) => {
              const c = t.vigilar ? COLOR.vigilar : COLOR[t.nivel];
              const yo = t.id === a.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onElegir(t.id)}
                  aria-pressed={yo}
                  aria-label={`${t.nombre}${yo ? " (en el visor)" : ""}`}
                  title={t.nombre}
                  className={`grid size-11 place-items-center rounded-full bg-[#0C1424] text-xs font-semibold transition-transform hover:scale-110 ${yo ? "ring-2 ring-[#6FE3FF] ring-offset-2 ring-offset-[#04060C]" : ""}`}
                  style={{ border: `2px solid ${c}` }}
                >
                  {iniciales(t.nombre)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onAlternarApagon}
            disabled={sinInternet && !enlace.apagon}
            className="min-h-11 rounded-[10px] border border-white/30 px-4 text-sm font-medium hover:border-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enlace.apagon ? "Restablecer enlace" : "Simular apagón"}
          </button>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#8A97AE]">
          <p>Prototipo de hackathon con datos simulados. Los umbrales y protocolos son ilustrativos y no sustituyen criterio médico.</p>
          <label className="flex items-center gap-2">
            Simular para {nombre}
            <select
              value={escenario}
              onChange={(e) => onEscenario(e.target.value as Escenario)}
              className="min-h-9 rounded-[6px] border border-white/20 bg-[#04060C] px-2 text-sm text-[#E8EEF8]"
            >
              {ESCENARIOS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.etiqueta}
                </option>
              ))}
            </select>
          </label>
        </footer>
      </div>
    </div>
  );
}
