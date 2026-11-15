# Órbita Vital

Monitoreo en tiempo real de la salud de astronautas mediante smartwatch.
Next.js + Tailwind para el panel, Supabase Realtime para los datos en vivo y un simulador de relojes.

Demo publicada: https://astro-salud.vercel.app (modo demo; cada subida a `main` se despliega sola en Vercel).

## Arrancar en 1 minuto (modo demo, sin Supabase)

```bash
npm install
npm run dev
```

Abre http://localhost:3000. El simulador corre dentro del navegador.
Usa "Simular escenario" en cada tarjeta para provocar una emergencia durante la demo.

## Conectar Supabase Realtime

1. Crea un proyecto en https://supabase.com.
2. En SQL Editor, pega y ejecuta `supabase/esquema.sql`.
3. Copia `.env.example` como `.env.local` y llena la URL y la clave anon (Project Settings > API).
4. En dos terminales:

```bash
npm run dev          # panel
npm run simulador    # relojes simulados que envían lecturas cada 2 s
```

El panel detecta las variables y cambia solo a "Supabase Realtime". Los escenarios que elijas en el
panel se guardan en la tabla `escenarios` y el simulador los obedece. Si detienes el simulador, a los
10 segundos las tarjetas marcan "Sin señal".

## Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `lib/salud.ts` | Umbrales, alertas e índice de salud 0 a 100. Aquí se ajustan las reglas. |
| `lib/simulador.ts` | Genera signos vitales y escenarios (hipoxia, taquicardia, fiebre, fatiga). |
| `lib/tipos.ts` | Tripulación (ficha personal y médica) y forma de una lectura. |
| `components/FichaAstronauta.tsx` | Ficha lateral que se abre al tocar la cabecera de una tarjeta. |
| `components/Panel.tsx` | Panel, conexión Realtime y modo demo. |
| `components/TarjetaAstronauta.tsx` | Tarjeta por astronauta. |
| `scripts/simulador.ts` | Envía lecturas a Supabase. |
| `supabase/esquema.sql` | Tablas, políticas y Realtime. |

## Datos reales de la NASA

La ficha de cada astronauta muestra un análisis de sangre real de un tripulante de Inspiration4
(SpaceX, 2021), descargado del [NASA Open Science Data Repository](https://osdr.nasa.gov):
[OSD-569](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) (hemograma) y
[OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) (panel metabólico). Los datos están en
`lib/analiticas-osdr.json` y se regeneran con:

```bash
npm run datos:osdr
```

Las lecturas del reloj (pulso, oxígeno, temperatura, sueño) siguen siendo simuladas: OSDR no publica en
abierto los datos de los relojes de esa misión.

## Fotos de la tripulación

Los retratos de `public/astronautas/` están generados con IA (personas ficticias). Sin foto, un astronauta muestra sus iniciales. Para poner una, guarda la imagen en
`public/astronautas/` (por ejemplo `ast-1.jpg`, mejor vertical 4:5) y añade
`foto: "/astronautas/ast-1.jpg"` a ese astronauta en `lib/tipos.ts`.

Para otras fuentes (una app de Wear OS, por ejemplo) basta con insertar filas en `lecturas` con las
mismas columnas.

## Comprobaciones

```bash
npm test             # pruebas de reglas de salud y del simulador
npm run lint
npm run typecheck
```

## Notas

- Las políticas de `esquema.sql` son abiertas para la demo. No uses datos reales con ellas.
- La tabla `lecturas` solo conserva la última hora: un disparador borra lo anterior en cada inserción.
- `esquema.sql` se puede volver a ejecutar sin errores; hazlo si creaste las tablas con una versión anterior.
- Los umbrales son ilustrativos y no sustituyen criterio médico.
