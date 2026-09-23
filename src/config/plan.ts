// The orchestrator's plan, as far as the running app needs it
// (docs/orchestrator/SPEC.md). Generated — do not edit; regenerated on every
// build and update from the stored plan. Without a plan every map is empty.
//
//   SYSTEM_ASSIGNED entity → fields a tool fills when a record is CREATED — the
//                   value does not exist before; dialogs hide these on create and
//                   the form-polish sets no default on them. A scheduled or
//                   update-triggered tool owns its field but is NOT in here.
//   PLAN_SENTENCES  slug → the plan in the owner's words (flows' field page)
//
// The runtime write guard (FLOW_WRITES/OWNERSHIP, planGuard.ts) left on
// 23.09.2026: a flow page composes against its generated hook, whose submit
// plan IS the Schreibliste — there is no way to spell a write outside it.

export const SYSTEM_ASSIGNED: Record<string, string[]> = {
  "projekte": [
    "projektkennung",
    "projektnummer"
  ],
  "angebote": [
    "angebotsjahr",
    "angebotsnummer",
    "anhang"
  ],
  "rechnungen": [
    "anhang",
    "rechnungsnummer"
  ]
};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "projekt-anlegen": [
    "Legt an: projekte",
    "Automatisch: projektstatus (fester Wert „akquise“)"
  ],
  "stunden-buchen": [
    "Legt an: zeiterfassung",
    "Automatisch: erfassungsmonat (Monat aus dem Feld Datum ableiten und den passenden Schlüssel setzen (z. B. datum im Mä …), erfassungsjahr (Jahr aus dem Feld Datum ableiten)"
  ],
  "angebot-erstellen": [
    "Legt an: angebote",
    "Automatisch: angebotsstatus (fester Wert „entwurf“)"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: kunde (übernommen aus projekte.kunde), rechnungsdatum (heutiges Datum, automatisch), rechnungsstatus (fester Wert „entwurf“)"
  ],
  "kunde-anlegen": [
    "Legt an: kunden",
    "Automatisch: anlagedatum (heutiges Datum, automatisch)"
  ],
  "projektstatus-aendern": [
    "Ändert: projekte"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist das interne Verwaltungssystem der inclou. GmbH & Co. KG. Es bildet den gesamten Beratungsbetrieb ab: Kundenstamm, Leistungskatalog, Berater:innen mit Stundensätzen und Kapazitäten, Projekte mit Statusverfolgung, Zeiterfassung, Angebotserstellung mit PDF-Ausgabe und Rechnungslegung auf Basis erfasster Stunden.";
