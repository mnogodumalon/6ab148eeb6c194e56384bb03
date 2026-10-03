/**
 * intents.ts — registry of intent workflow pages (Phase 2).
 *
 * The intents orchestrator REGISTERS every page it creates here; the sidebar
 * section (IntentsNav) renders automatically from this list — no Layout edit
 * needed. Keep `path` identical to the route added in App.tsx's
 * `<custom:routes>` block.
 *
 * ONLY write inside the marker blocks — everything outside is scaffold and is
 * overwritten on the next /build/update.
 *
 *   <custom:intent-imports>
 *   import { IconCalendarPlus } from '@tabler/icons-react';
 *   </custom:intent-imports>
 *   …
 *   <custom:intents>
 *   { path: '/intents/neue-buchung', label: { de: 'Neue Buchung', en: 'New booking' }, icon: IconCalendarPlus, description: { de: 'Buchung in 3 Schritten anlegen', en: 'Create a booking in 3 steps' } },
 *   </custom:intents>
 */
import type { ComponentType } from 'react';

// <custom:intent-imports>
import { IconFileText, IconBriefcase, IconClockPlus, IconFileInvoice, IconSend } from '@tabler/icons-react';
// </custom:intent-imports>

export interface IntentLink {
  /** Route path as wired in App.tsx (HashRouter), e.g. '/intents/neue-buchung'. */
  path: string;
  /**
   * Short sidebar label (1–3 words). Preferred: both UI languages
   * ({ de, en } — the runtime switcher picks the active one; cs stays
   * readable for legacy entries). A plain string stays valid and renders as-is.
   */
  label: string | { de?: string; en?: string; cs?: string };
  /** Tabler icon COMPONENT reference (not rendered JSX), e.g. IconCalendarPlus. */
  icon?: ComponentType<{ size?: number | string; className?: string; stroke?: number | string }>;
  /**
   * One-line purpose. Same shape as `label`: prefer both UI languages so a
   * language switch reaches it; a plain string stays valid.
   */
  description?: string | { de?: string; en?: string; cs?: string };
}

export const INTENTS: IntentLink[] = [
  // <custom:intents>
  { path: '/intents/angebot-erstellen', label: { de: 'Angebot erstellen', en: 'Create offer' }, icon: IconFileText, description: { de: 'Ein Angebot für ein Projekt anlegen: Projekt wählen, Typ, Zeitrahmen und Kosten erfassen.', en: 'Create a quote for a project: select the project, then enter type, timeframe and costs.' } },
  { path: '/intents/projekt-anlegen', label: { de: 'Projekt anlegen', en: 'Create project' }, icon: IconBriefcase, description: { de: 'Ein neues Projekt für einen Kunden mit Art, Start und Projektleitung anlegen.', en: 'Create a new project for a customer with type, start, and project manager.' } },
  { path: '/intents/zeit-erfassen', label: { de: 'Stunden erfassen', en: 'Log hours' }, icon: IconClockPlus, description: { de: 'Stunden eines Beraters auf ein Projekt und eine Leistung buchen.', en: 'Book a consultant\'s hours to a project and a service.' } },
  { path: '/intents/rechnung-erstellen', label: { de: 'Rechnung aus Zeiteinträgen erstellen', en: 'Create invoice from time entries' }, icon: IconFileInvoice, description: { de: 'Abrechenbare Zeiteinträge eines Projekts auswählen und daraus eine Rechnung im Entwurf anlegen.', en: 'Select billable time entries of a project and create a draft invoice from them.' } },
  { path: '/intents/rechnung-versenden', label: { de: 'Rechnung versenden', en: 'Send invoice' }, icon: IconSend, description: { de: 'Eine Rechnung im Entwurf prüfen und auf Versendet bzw. Bezahlt setzen.', en: 'Review a draft invoice and set it to Sent or Paid.' } },
  // </custom:intents>
];

/**
 * True only in the Phase-1 deploy bundle (the service flips it): the sidebar
 * then shows ghost rows ("werden erstellt…") until Phase 2 registers the real
 * pages and sets this back to false. Lives OUTSIDE the custom markers on
 * purpose — a scaffold update resets it to false (self-healing if Phase 2
 * never ran).
 */
export const INTENTS_PENDING = false;

/**
 * When the Phase-1 bundle was deployed (ISO, set by the service together with
 * INTENTS_PENDING). The sidebar stops showing the ghost row PENDING_MAX_MINUTES
 * later on its own: a Phase 2 that ended red (or never ran) used to leave a
 * pulsing "werden erstellt …" in every deployed Phase-1 bundle forever — no
 * code path redeploys Phase 1 without the flag (live 03.09.2026).
 */
export const INTENTS_PENDING_SINCE: string | null = null;
export const PENDING_MAX_MINUTES = 30;
