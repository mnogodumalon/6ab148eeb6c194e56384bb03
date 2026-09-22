/**
 * Occupancy semantics — DECIDED BY THE BUILD AGENT, never by a heuristic.
 *
 * The Phase-2 orchestrator writes its decision to `.intents-staging/occupancy.json`
 * (stay pair, booked resource, statuses that do not occupy); the integration
 * step validates it against the app metadata and renders it into the block
 * below. Scaffold updates keep the block. Do not edit outside the markers.
 *
 * Both doors read this and nothing else: `occupancyFor` (internal flows AND
 * public pages) and the owner service (the public grant's occupancy read).
 * No rule for an entity = no availability calendar, no occupancy claim —
 * a plain date field pair is shown instead.
 *
 * Facts from the metadata — candidates, NOT decisions:
 *   - kunden: lookups kundentyp[firma|behoerde|sonstiges|einzelperson], bevorzugte_kontaktart[email|telefon|post|persoenlich]
 *   - berater: applookups leistungen→leistungskatalog, zugewiesene_projekte→projekte · lookups status[aktiv|urlaub|elternzeit|sonstiges]
 *   - leistungskatalog: applookups ausfuehrende_berater→berater · lookups leistungstyp[beratung|entwicklung|schulung|support|konzeption|sonstiges], einheit[pro_stunde|pro_tag|pauschal|pro_monat]
 *   - projekte: applookups kunde→kunden, projektleitung→berater · lookups projektart[it_beratung|entwicklung|schulung|konzeption|support|sonstiges], projektstatus[in_bearbeitung|akquise|abgeschlossen], projektstart_monat[januar|februar|maerz|april|mai|juni|juli|august|september|oktober|november|dezember]
 *   - angebote: applookups projekt→projekte, berater→berater · lookups angebotstyp[dienstleistungsangebot|wartungsvertrag|projektangebot|rahmenvertrag|sonstiges], angebotsstatus[entwurf|versendet|angenommen|abgelehnt], kostentyp[einmalig|monatlich|jaehrlich|quartalsweise|sonstiges]
 *   - zeiterfassung: applookups berater→berater, projekt→projekte, leistung→leistungskatalog · lookups erfassungsmonat[februar|maerz|april|mai|juni|juli|august|september|oktober|november|dezember|januar]
 *   - rechnungen: applookups kunde→kunden, projekt→projekte, berater→berater, zeiterfassungseintraege→zeiterfassung · lookups rechnungsstatus[entwurf|versendet|bezahlt|ueberfaellig|storniert], rechnungsmonat[januar|februar|maerz|april|mai|juni|juli|august|september|oktober|november|dezember]
 */
import type { EntityKey } from '@/lib/journey/rules';

export interface OccupancyRule {
  /** Arrival / departure fields (the departure day is exclusive). */
  from: string;
  to: string;
  /** applookup field naming the booked RESOURCE (room, vehicle, court).
   *  Omit when the entity itself is the one resource (a single holiday flat). */
  resource?: string;
  /** lookup field + the keys that mean "does NOT occupy" (cancelled, no-show). */
  statusField?: string;
  freeKeys?: string[];
}

export const OCCUPANCY: Partial<Record<EntityKey, OccupancyRule>> = {
  // <custom:occupancy>
  // </custom:occupancy>
};
