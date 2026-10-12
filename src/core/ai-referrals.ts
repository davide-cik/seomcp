import type { GaRow } from './types.js';

/**
 * Assistenti AI che portano visite al sito, riconosciuti dalla sorgente della sessione in GA4
 * (dominio del referrer o utm_source, es. ChatGPT aggiunge utm_source=chatgpt.com ai link).
 */
export const AI_ASSISTANTS = [
  { assistant: 'ChatGPT', vendor: 'OpenAI', domains: ['chatgpt.com', 'openai.com'] },
  { assistant: 'Perplexity', vendor: 'Perplexity', domains: ['perplexity.ai'] },
  { assistant: 'Gemini', vendor: 'Google', domains: ['gemini.google.com', 'bard.google.com'] },
  { assistant: 'Copilot', vendor: 'Microsoft', domains: ['copilot.microsoft.com', 'copilot.cloud.microsoft'] },
  { assistant: 'Claude', vendor: 'Anthropic', domains: ['claude.ai'] },
  { assistant: 'Le Chat', vendor: 'Mistral AI', domains: ['chat.mistral.ai'] },
  { assistant: 'DeepSeek', vendor: 'DeepSeek', domains: ['deepseek.com'] },
  { assistant: 'Grok', vendor: 'xAI', domains: ['grok.com'] },
  { assistant: 'Meta AI', vendor: 'Meta', domains: ['meta.ai'] },
  { assistant: 'Duck.ai', vendor: 'DuckDuckGo', domains: ['duck.ai'] },
  { assistant: 'You.com', vendor: 'You.com', domains: ['you.com'] },
  { assistant: 'Phind', vendor: 'Phind', domains: ['phind.com'] },
  { assistant: 'Poe', vendor: 'Quora', domains: ['poe.com'] },
] as const;

export type AiAssistant = (typeof AI_ASSISTANTS)[number];

/** Assistente a cui appartiene una sorgente GA4 ("chatgpt.com", "www.perplexity.ai"…), se è uno di quelli noti. */
export function aiAssistantOf(source: string): AiAssistant | undefined {
  const host = source.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  if (!host) return undefined;
  return AI_ASSISTANTS.find((a) => a.domains.some((d) => host === d || host.endsWith(`.${d}`)));
}

/** Espressione regolare (RE2, per i filtri GA4) che seleziona le sorgenti degli assistenti AI. */
export function aiSourceRegex(): string {
  const domains = AI_ASSISTANTS.flatMap((a) => a.domains).map((d) => d.replace(/\./g, '\\.'));
  return `(^|\\.)(${domains.join('|')})$`;
}

export interface AiReferralSummary {
  assistant: string;
  vendor: string;
  sessions: number;
  previousSessions?: number;
  /** Variazione percentuale rispetto al periodo precedente (null se prima era zero). */
  change?: number | null;
  engagedSessions: number;
  engagementRate: number;
  keyEvents: number;
  revenue: number;
  /** Sorgenti GA4 che compongono il totale, es. "chatgpt.com". */
  sources: string[];
  topLandingPages: Array<{ page: string; sessions: number; keyEvents: number }>;
}

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Raggruppa per assistente le righe GA4 con dimensioni sessionSource e landingPage
 * (metriche sessions, engagedSessions, keyEvents, totalRevenue). Le sorgenti non riconosciute sono scartate.
 */
export function aggregateAiReferrals(
  rows: GaRow[],
  previous: GaRow[] = [],
  pagesPerAssistant = 10,
): AiReferralSummary[] {
  const by = new Map<string, { a: AiAssistant; sessions: number; engaged: number; keyEvents: number; revenue: number; sources: Set<string>; pages: Map<string, { sessions: number; keyEvents: number }> }>();
  for (const r of rows) {
    const source = r.dimensions.sessionSource ?? '';
    const a = aiAssistantOf(source);
    if (!a) continue;
    const e = by.get(a.assistant) ?? { a, sessions: 0, engaged: 0, keyEvents: 0, revenue: 0, sources: new Set<string>(), pages: new Map() };
    const sessions = r.metrics.sessions ?? 0;
    const keyEvents = r.metrics.keyEvents ?? 0;
    e.sessions += sessions;
    e.engaged += r.metrics.engagedSessions ?? 0;
    e.keyEvents += keyEvents;
    e.revenue += r.metrics.totalRevenue ?? 0;
    e.sources.add(source);
    const page = r.dimensions.landingPage ?? '';
    const p = e.pages.get(page) ?? { sessions: 0, keyEvents: 0 };
    p.sessions += sessions;
    p.keyEvents += keyEvents;
    e.pages.set(page, p);
    by.set(a.assistant, e);
  }

  const prev = new Map<string, number>();
  for (const r of previous) {
    const a = aiAssistantOf(r.dimensions.sessionSource ?? '');
    if (a) prev.set(a.assistant, (prev.get(a.assistant) ?? 0) + (r.metrics.sessions ?? 0));
  }
  const withPrevious = previous.length > 0;

  const out: AiReferralSummary[] = [...by.values()].map((e) => {
    const before = prev.get(e.a.assistant) ?? 0;
    return {
      assistant: e.a.assistant,
      vendor: e.a.vendor,
      sessions: e.sessions,
      ...(withPrevious ? { previousSessions: before, change: before ? round(((e.sessions - before) / before) * 100, 1) : null } : {}),
      engagedSessions: e.engaged,
      engagementRate: e.sessions ? round(e.engaged / e.sessions) : 0,
      keyEvents: e.keyEvents,
      revenue: round(e.revenue, 2),
      sources: [...e.sources].sort(),
      topLandingPages: [...e.pages.entries()]
        .sort((x, y) => y[1].sessions - x[1].sessions)
        .slice(0, pagesPerAssistant)
        .map(([page, v]) => ({ page, ...v })),
    };
  });
  // Assistenti che portavano visite prima e ora no: restano visibili con zero sessioni.
  if (withPrevious) {
    for (const [assistant, before] of prev) {
      if (by.has(assistant) || !before) continue;
      const a = AI_ASSISTANTS.find((x) => x.assistant === assistant)!;
      out.push({ assistant, vendor: a.vendor, sessions: 0, previousSessions: before, change: -100, engagedSessions: 0, engagementRate: 0, keyEvents: 0, revenue: 0, sources: [], topLandingPages: [] });
    }
  }
  return out.sort((x, y) => y.sessions - x.sessions || (y.previousSessions ?? 0) - (x.previousSessions ?? 0));
}
