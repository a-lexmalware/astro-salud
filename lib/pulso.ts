/**
 * Pulso real enviado desde el teléfono (Gadgetbridge parcheado) a la tabla
 * `pulso_reloj`. Se guarda la hora local de llegada de cada fila, así un
 * desfase de reloj entre el teléfono, Supabase y esta máquina no afecta.
 */

export const SEGUNDOS_PULSO_VIGENTE = 10;

export class PulsoReal {
  private ultimo = new Map<string, { fc: number; en: number }>();

  /** Registra una fila recibida por Realtime. Ignora valores imposibles. */
  registrar(astronautaId: string, fc: number, ahora: number) {
    if (!Number.isFinite(fc) || fc < 20 || fc > 250) return;
    this.ultimo.set(astronautaId, { fc, en: ahora });
  }

  /** Último pulso si llegó hace menos de SEGUNDOS_PULSO_VIGENTE, si no null. */
  vigente(astronautaId: string, ahora: number): number | null {
    const u = this.ultimo.get(astronautaId);
    if (!u || ahora - u.en > SEGUNDOS_PULSO_VIGENTE * 1000) return null;
    return u.fc;
  }
}
