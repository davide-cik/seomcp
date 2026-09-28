/** Utility per le date in formato YYYY-MM-DD (UTC). */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

/** Numero di giorni inclusi tra due date. */
export function daysBetween(startDate: string, endDate: string): number {
  const ms = Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * Intervallo degli ultimi `days` giorni con dati disponibili.
 * Search Console pubblica i dati con circa 2-3 giorni di ritardo,
 * quindi l'intervallo termina `lagDays` giorni fa.
 */
export function lastNDays(days: number, lagDays = 3, today = new Date()): { startDate: string; endDate: string } {
  const endDate = addDays(toIsoDate(today), -lagDays);
  return { startDate: addDays(endDate, -(days - 1)), endDate };
}

/** Il periodo di pari durata che precede immediatamente quello dato. */
export function previousPeriod(startDate: string, endDate: string): { startDate: string; endDate: string } {
  const len = daysBetween(startDate, endDate);
  const prevEnd = addDays(startDate, -1);
  return { startDate: addDays(prevEnd, -(len - 1)), endDate: prevEnd };
}
