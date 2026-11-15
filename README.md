# Órbita Vital

Monitoreo en tiempo real de la salud de astronautas mediante smartwatch.
Next.js + Tailwind para el panel, Supabase Realtime para los datos en vivo y un simulador de relojes.

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
| `lib/tipos.ts` | Lista de astronautas y forma de una lectura. |
| `components/Panel.tsx` | Panel, conexión Realtime y modo demo. |
| `components/TarjetaAstronauta.tsx` | Tarjeta por astronauta. |
| `lib/reloj.ts` | Conexión Web Bluetooth y decodificación de la frecuencia cardiaca. |
| `scripts/simulador.ts` | Envía lecturas a Supabase. |
| `supabase/esquema.sql` | Tablas, políticas y Realtime. |

## Conectar un reloj real por Bluetooth

1. Abre el panel en Chrome o Edge (Safari y Firefox no tienen Web Bluetooth), en `localhost` o con https.
2. En el reloj, activa la transmisión de frecuencia cardiaca a otros dispositivos. El nombre cambia
   según la marca ("Transmitir FC", "Difusión de frecuencia cardiaca", "Compartir FC"). Las bandas de
   pecho la emiten siempre.
3. En la tarjeta del astronauta, pulsa "Conectar reloj" y elige el dispositivo.

El panel usa el perfil estándar Heart Rate de Bluetooth: del reloj llegan la frecuencia cardiaca y, si
envía intervalos RR, la HRV. Oxígeno, temperatura, sueño y ejercicio siguen siendo simulados, porque
ese perfil no los incluye. Solo se admite un reloj a la vez. Un reloj que no ofrezca esa transmisión
(por ejemplo un Apple Watch) no aparecerá en el selector.

Con Supabase, el panel que tiene el reloj envía las lecturas de ese astronauta y el simulador lo omite.

Para otras fuentes (una app de Wear OS, por ejemplo) basta con insertar filas en `lecturas` con las
mismas columnas.

## Comprobaciones

```bash
npm test             # pruebas de reglas de salud, simulador y lectura Bluetooth
npm run lint
npm run typecheck
```

## Notas

- Las políticas de `esquema.sql` son abiertas para la demo. No uses datos reales con ellas.
- La tabla `lecturas` solo conserva la última hora: un disparador borra lo anterior en cada inserción.
- `esquema.sql` se puede volver a ejecutar sin errores; hazlo si creaste las tablas con una versión anterior.
- Los umbrales son ilustrativos y no sustituyen criterio médico.
