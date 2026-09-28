import { describe, expect, it } from 'vitest';
import { daysBetween, isIsoDate, lastNDays, previousPeriod } from '../src/core/dates.js';

describe('date', () => {
  it('valida il formato', () => {
    expect(isIsoDate('2026-09-28')).toBe(true);
    expect(isIsoDate('28/09/2026')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
  });

  it('calcola gli ultimi N giorni tenendo conto del ritardo dei dati', () => {
    expect(lastNDays(28, 3, new Date('2026-09-28T10:00:00Z'))).toEqual({ startDate: '2026-08-29', endDate: '2026-09-25' });
  });

  it('calcola il periodo precedente di pari durata', () => {
    const prev = previousPeriod('2026-09-01', '2026-09-28');
    expect(prev).toEqual({ startDate: '2026-08-04', endDate: '2026-08-31' });
    expect(daysBetween(prev.startDate, prev.endDate)).toBe(28);
  });
});
