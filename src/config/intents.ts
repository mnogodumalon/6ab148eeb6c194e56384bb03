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
import { IconUserPlus, IconFolderPlus, IconFileText, IconClockPlus, IconReceiptEuro, IconRefresh } from '@tabler/icons-react';
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
  { path: '/intents/kunde-anlegen', label: { de: 'Kunden anlegen', en: 'Create customer' }, icon: IconUserPlus, description: 'Legt einen neuen Kunden mit allen Stammdaten an, inkl. Rechnungsadresse und Ansprechpartner.' },
  { path: '/intents/projekt-anlegen', label: { de: 'Projekt anlegen', en: 'Create project' }, icon: IconFolderPlus, description: 'Legt ein neues Projekt an, verknüpft es mit einem Kunden und einer Projektleitung, und setzt den Anfangsstatus.' },
  { path: '/intents/angebot-erstellen', label: { de: 'Angebot erstellen', en: 'Create offer' }, icon: IconFileText, description: 'Erstellt ein Angebot zu einem Projekt mit Typ, Zeitrahmen, Kosten und zuständigem Berater. Die Angebotsnummer wird automatisch vergeben.' },
  { path: '/intents/zeit-buchen', label: { de: 'Zeit buchen', en: 'Log time' }, icon: IconClockPlus, description: 'Erfasst geleistete Stunden eines Beraters auf ein Projekt und eine Leistung.' },
  { path: '/intents/rechnung-erstellen', label: { de: 'Rechnung erstellen', en: 'Create invoice' }, icon: IconReceiptEuro, description: 'Erstellt eine Rechnung auf Basis von Zeiterfassungseinträgen, Projekt und Kunde. Nettobetrag, MwSt. und Gesamtbetrag werden eingetragen.' },
  { path: '/intents/projektstatus-aendern', label: { de: 'Projektstatus ändern', en: 'Change project status' }, icon: IconRefresh, description: 'Ändert den Status eines Projekts (Akquise → In Bearbeitung → Abgeschlossen) und aktualisiert den letzten Stand.' },
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
export const INTENTS_PENDING_SINCE: string | null = '2026-09-24T12:04:35+00:00';
export const PENDING_MAX_MINUTES = 30;
