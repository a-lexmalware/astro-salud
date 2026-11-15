/**
 * Conexión a un reloj real por Web Bluetooth usando el perfil estándar
 * "Heart Rate" (servicio 0x180D). Lo exponen las bandas de pecho y los relojes
 * que permiten transmitir la frecuencia cardiaca a otros dispositivos.
 *
 * Web Bluetooth solo existe en Chrome y Edge, y solo en https o localhost.
 */

export interface MedicionFC {
  fc: number; // latidos por minuto
  rr: number[]; // intervalos entre latidos en ms (vacío si el reloj no los envía)
}

/** Decodifica la característica Heart Rate Measurement (0x2A37). */
export function parsearMedicionFC(v: DataView): MedicionFC {
  const banderas = v.getUint8(0);
  const fc16 = (banderas & 0x01) !== 0;
  let i = 1;
  const fc = fc16 ? v.getUint16(i, true) : v.getUint8(i);
  i += fc16 ? 2 : 1;
  if (banderas & 0x08) i += 2; // energía gastada: no se usa
  const rr: number[] = [];
  if (banderas & 0x10) {
    // Los intervalos RR vienen en unidades de 1/1024 s.
    for (; i + 1 < v.byteLength; i += 2) rr.push(Math.round((v.getUint16(i, true) / 1024) * 1000));
  }
  return { fc, rr };
}

const MIN_RR = 5;

/** HRV como RMSSD (ms) a partir de intervalos RR. Devuelve null si hay muy pocos. */
export function rmssd(rr: number[]): number | null {
  if (rr.length < MIN_RR) return null;
  let suma = 0;
  for (let i = 1; i < rr.length; i++) suma += (rr[i] - rr[i - 1]) ** 2;
  return Math.round(Math.sqrt(suma / (rr.length - 1)));
}

export const bluetoothDisponible = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

export interface ConexionReloj {
  nombre: string;
  desconectar: () => void;
}

/**
 * Abre el selector de dispositivos del navegador y se suscribe a la frecuencia
 * cardiaca. Debe llamarse desde un clic del usuario.
 */
export async function conectarReloj(
  onMedicion: (m: MedicionFC) => void,
  onDesconexion: () => void,
): Promise<ConexionReloj> {
  const dispositivo = await navigator.bluetooth.requestDevice({ filters: [{ services: ["heart_rate"] }] });
  if (!dispositivo.gatt) throw new Error("El dispositivo no permite conexión GATT.");

  const servidor = await dispositivo.gatt.connect();
  const servicio = await servidor.getPrimaryService("heart_rate");
  const medicion = await servicio.getCharacteristic("heart_rate_measurement");

  medicion.addEventListener("characteristicvaluechanged", (e) => {
    const valor = (e.target as BluetoothRemoteGATTCharacteristic).value;
    if (valor) onMedicion(parsearMedicionFC(valor));
  });
  dispositivo.addEventListener("gattserverdisconnected", onDesconexion);
  await medicion.startNotifications();

  return {
    nombre: dispositivo.name ?? "Reloj",
    desconectar: () => dispositivo.gatt?.disconnect(),
  };
}
