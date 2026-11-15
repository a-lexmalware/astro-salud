# Pulso real de un reloj Xiaomi (Redmi Watch 5 Active) vía Gadgetbridge

El Redmi Watch 5 Active no transmite la frecuencia cardiaca por el perfil Bluetooth estándar, así que el
botón "Conectar reloj" del panel no puede leerlo. Este camino usa un teléfono Android:

```
Reloj ──(protocolo Xiaomi)──> Gadgetbridge parcheado ──(HTTPS)──> Supabase: pulso_reloj
                                                                     │
                     panel <── lecturas <── npm run simulador <──────┘
```

[Gadgetbridge](https://gadgetbridge.org) es una app libre que ya habla el protocolo de Xiaomi y recibe el
pulso en vivo del reloj, pero no lo comparte con otras apps. `orbita-vital.patch` añade dos cosas:

- Mantiene activa la medición en vivo mientras el reloj está conectado.
- Envía cada medición (como mucho una cada 2 s) a la tabla `pulso_reloj` de Supabase.

El script del simulador aplica ese pulso al astronauta indicado; las demás métricas siguen simuladas. La
tarjeta muestra "Reloj vía teléfono" mientras llegan datos.

> El parche no está probado con un reloj real. Se escribió leyendo el código de Gadgetbridge
> (commit `3c30da08`).

## Lo que necesitas

- Supabase configurado según el README principal, con `supabase/esquema.sql` ejecutado (crea `pulso_reloj`).
- Un teléfono Android con el reloj emparejado en Mi Fitness.
- Android Studio en el Mac (trae el JDK y el SDK necesarios).

## 1. Obtener la clave del reloj

El reloj solo acepta a quien tenga su clave de autenticación (16 bytes), que se genera al emparejarlo con
Mi Fitness. Sigue la guía oficial de Gadgetbridge:
<https://gadgetbridge.org/basics/pairing/huami-xiaomi-server/>

No desvincules el reloj en Mi Fitness: eso lo restablece y la clave deja de servir.

## 2. Compilar Gadgetbridge con el parche

```bash
git clone https://codeberg.org/Freeyourgadget/Gadgetbridge.git
```

```bash
cd Gadgetbridge && git checkout 3c30da08b93ac25a90812e6a84a5df1de6527708
```

```bash
git am /ruta/a/astro-salud/integraciones/gadgetbridge/orbita-vital.patch
```

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ANDROID_HOME="$HOME/Library/Android/sdk"
```

Sustituye la URL y la clave anon por las de tu `.env.local`, y el astronauta si no es `ast-1`:

```bash
./gradlew :app:assembleBanglejsDebug -PastroSupabaseUrl=https://TU-PROYECTO.supabase.co -PastroSupabaseKey=TU_CLAVE_ANON -PastroAstronautaId=ast-1
```

Se compila la variante `banglejs` porque es la única de Gadgetbridge con permiso de internet. Es
Gadgetbridge completo (admite los mismos relojes) y se instala aparte de cualquier otro Gadgetbridge.

El APK queda en `app/build/outputs/apk/banglejs/debug/`.

## 3. Instalar y emparejar

1. Instala el APK en el teléfono (por cable con `adb install`, o copiándolo y abriéndolo).
2. Fuerza el cierre de Mi Fitness o desactívala: el reloj solo atiende a una app a la vez.
3. En Gadgetbridge, añade el reloj e introduce la clave del paso 1.

## 4. Arrancar

```bash
npm run simulador
```

```bash
npm run dev
```

En la consola del simulador verás `FC ... (reloj)` en el astronauta del reloj, y su tarjeta mostrará
"Reloj vía teléfono". Si en 10 s no llega pulso, vuelve a la frecuencia simulada.

## Si no llega nada

- Comprueba en Gadgetbridge que el reloj aparece conectado y que la pantalla "Actividad en vivo" muestra pulso.
- Revisa que `pulso_reloj` recibe filas en el Table Editor de Supabase. Si no, revisa la URL y la clave del paso 2.
- Los registros de Gadgetbridge (Ajustes > Opciones de desarrollador) muestran los avisos "Órbita Vital: ...".
