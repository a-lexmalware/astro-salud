"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  avisos,
  interpretar,
  responder,
  type Accion,
  type ContextoVega,
  type Guia,
  type Huella,
} from "@/lib/vega";

/** Lo mínimo del reconocimiento de voz del navegador (no viene en los tipos de TypeScript). */
interface Reconocimiento {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
type ConstructorReconocimiento = new () => Reconocimiento;

function reconocimientoDisponible(): ConstructorReconocimiento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstructorReconocimiento; webkitSpeechRecognition?: ConstructorReconocimiento };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function vozEnEspanol(): SpeechSynthesisVoice | null {
  const voces = window.speechSynthesis?.getVoices() ?? [];
  return (
    voces.find((v) => v.lang === "es-MX") ??
    voces.find((v) => v.lang === "es-US") ??
    voces.find((v) => v.lang.startsWith("es")) ??
    null
  );
}

interface Props {
  ctx: ContextoVega;
  onAccion: (a: Accion) => void;
}

type Modo = "reposo" | "hablando" | "escuchando";

/**
 * VEGA, la asistente de a bordo. Habla con la voz del navegador (funciona sin
 * internet en la mayoría de los equipos) y escucha con el reconocimiento de
 * Chrome si está disponible; si no, se le escribe. Lo que dice sale de lib/vega.ts.
 */
export default function Vega({ ctx, onAccion }: Props) {
  const [frase, setFrase] = useState("VEGA en espera. Pregúntame cómo está la tripulación.");
  const [vozActiva, setVozActiva] = useState(false);
  const [modo, setModo] = useState<Modo>("reposo");
  const [guia, setGuia] = useState<Guia | null>(null);
  const [texto, setTexto] = useState("");
  const [puedeEscuchar, setPuedeEscuchar] = useState(false);

  const ctxRef = useRef(ctx);
  const guiaRef = useRef(guia);
  const vozRef = useRef(vozActiva);
  const huella = useRef<Huella | null>(null);
  const oyente = useRef<Reconocimiento | null>(null);
  const onAccionRef = useRef(onAccion);
  useEffect(() => {
    ctxRef.current = ctx;
    guiaRef.current = guia;
    vozRef.current = vozActiva;
    onAccionRef.current = onAccion;
  });

  useEffect(() => {
    // Solo se sabe en el navegador, después de montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPuedeEscuchar(reconocimientoDisponible() !== null);
    // Algunos navegadores cargan las voces después.
    window.speechSynthesis?.getVoices();
    return () => {
      window.speechSynthesis?.cancel();
      oyente.current?.stop();
    };
  }, []);

  const decir = useCallback((t: string, interrumpir = false) => {
    setFrase(t);
    const sintesis = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!vozRef.current || !sintesis) return;
    if (interrumpir) sintesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    const voz = vozEnEspanol();
    if (voz) u.voice = voz;
    u.lang = voz?.lang ?? "es-MX";
    u.rate = 1.05;
    u.onstart = () => setModo("hablando");
    u.onend = () => setModo((m) => (m === "hablando" ? "reposo" : m));
    sintesis.speak(u);
  }, []);

  const atender = useCallback(
    (entrada: string) => {
      const c = ctxRef.current;
      const r = responder(interpretar(entrada, c), c, guiaRef.current);
      setGuia(r.guia);
      if (r.accion?.tipo === "silencio") {
        window.speechSynthesis?.cancel();
        setModo("reposo");
        setFrase(r.texto);
        return;
      }
      decir(r.texto, true);
      if (r.accion) onAccionRef.current(r.accion);
    },
    [decir],
  );

  // Avisos por su cuenta: solo cuando cambia algo que importa (no cada segundo).
  const firma = [
    ...ctx.tripulantes.map(
      (t) =>
        `${t.id}:${t.nivel}:${t.vigilar}:${t.sinSenal}:${(t.evaluacion?.alertas ?? [])
          .filter((a) => a.nivel === "rojo")
          .map((a) => a.metrica)
          .join("+")}:${t.desviaciones.map((d) => d.metrica).join("+")}`,
    ),
    `apagon:${ctx.apagon}`,
  ].join("|");
  useEffect(() => {
    const { textos, huella: nueva } = avisos(huella.current, ctxRef.current);
    huella.current = nueva;
    textos.forEach((t) => decir(t));
  }, [firma, decir]);

  const alternarVoz = () => {
    const activar = !vozActiva;
    setVozActiva(activar);
    vozRef.current = activar;
    if (activar) decir("VEGA en línea. Estoy monitoreando a la tripulación a bordo.", true);
    else {
      window.speechSynthesis?.cancel();
      setModo("reposo");
    }
  };

  const escuchar = () => {
    const SR = reconocimientoDisponible();
    if (!SR) return;
    if (modo === "escuchando") {
      oyente.current?.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    const r = new SR();
    r.lang = "es-MX";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const dicho = e.results[0]?.[0]?.transcript ?? "";
      if (dicho) {
        setTexto(dicho);
        atender(dicho);
      }
    };
    r.onerror = (e) => {
      setFrase(
        e.error === "network"
          ? "El reconocimiento de voz de este navegador necesita internet. Escríbeme o usa los botones."
          : e.error === "not-allowed"
            ? "No tengo permiso para usar el micrófono."
            : "No te escuché bien. Intenta de nuevo.",
      );
    };
    r.onend = () => setModo((m) => (m === "escuchando" ? "reposo" : m));
    oyente.current = r;
    setModo("escuchando");
    r.start();
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    atender(texto);
    setTexto("");
  };

  const rapidos = [
    { etiqueta: "¿Cómo está la tripulación?", dicho: "¿cómo está la tripulación?" },
    guia ? { etiqueta: "Siguiente paso", dicho: "siguiente" } : { etiqueta: "Guíame", dicho: "guíame" },
    ...(guia ? [{ etiqueta: "Repetir", dicho: "repite" }] : []),
    { etiqueta: "¿Y el enlace?", dicho: "¿cómo está el enlace?" },
  ];

  return (
    <section
      aria-label="VEGA, asistente de a bordo"
      className="vega -mt-4 flex flex-col gap-3 rounded-[3px] border border-[#6FE3FF]/35 px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className={`orbe-vega relative grid size-10 shrink-0 place-items-center ${modo}`} aria-hidden>
          <span className="eco-vega absolute inset-0 rounded-full border border-[#6FE3FF]" />
          <span className="eco-vega eco-2 absolute inset-0 rounded-full border border-[#6FE3FF]" />
          <span className="nucleo-vega block size-7 rounded-full" />
        </span>
        <div className="min-w-0 flex-[999_1_320px]">
          <p className="text-xs tracking-[0.24em] text-[#6FE3FF]">
            VEGA
            <span className="ml-2 tracking-normal text-tenue">
              {modo === "escuchando" ? "· te escucho…" : modo === "hablando" ? "· hablando" : "· a bordo, sin nube"}
            </span>
          </p>
          <p className="mt-0.5 text-base leading-snug" aria-live="polite">
            {frase}
          </p>
          {guia && (
            <p className="mt-1 text-xs text-tenue">
              Protocolo: {guia.protocolo.titulo} · paso {guia.paso + 1} de {guia.protocolo.pasos.length}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {puedeEscuchar && (
            <button
              type="button"
              onClick={escuchar}
              aria-pressed={modo === "escuchando"}
              className="flex min-h-10 items-center gap-2 rounded-[3px] border border-borde px-3 text-sm hover:border-texto focus-visible:outline-2 focus-visible:outline-acento aria-pressed:border-[#6FE3FF] aria-pressed:text-[#6FE3FF]"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
              {modo === "escuchando" ? "Escuchando" : "Hablar"}
            </button>
          )}
          <button
            type="button"
            onClick={alternarVoz}
            aria-pressed={vozActiva}
            className="min-h-10 rounded-[3px] border border-borde px-3 text-sm hover:border-texto focus-visible:outline-2 focus-visible:outline-acento"
          >
            {vozActiva ? "Silenciar voz" : "Activar voz"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {rapidos.map((r) => (
          <button
            key={r.etiqueta}
            type="button"
            onClick={() => atender(r.dicho)}
            className="min-h-9 rounded-full border border-borde px-3 text-sm text-tenue hover:border-[#6FE3FF] hover:text-texto focus-visible:outline-2 focus-visible:outline-acento"
          >
            {r.etiqueta}
          </button>
        ))}
        <form onSubmit={enviar} className="flex min-w-[240px] flex-1 items-center gap-2">
          <label htmlFor="vega-texto" className="sr-only">
            Escríbele a VEGA
          </label>
          <input
            id="vega-texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escríbele a VEGA: «¿cómo está Lucas?»"
            className="min-h-9 min-w-0 flex-1 rounded-[3px] border border-borde bg-transparent px-3 text-sm placeholder:text-tenue focus-visible:outline-2 focus-visible:outline-acento"
          />
          <button
            type="submit"
            className="min-h-9 rounded-[3px] border border-borde px-3 text-sm hover:border-texto focus-visible:outline-2 focus-visible:outline-acento"
          >
            Enviar
          </button>
        </form>
      </div>
    </section>
  );
}
