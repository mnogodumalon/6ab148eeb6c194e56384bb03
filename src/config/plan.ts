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
  "angebote": [
    "angebotsjahr",
    "angebotsnummer"
  ],
  "projekte": [
    "projektnummer"
  ],
  "rechnungen": [
    "gesamtbetrag",
    "nettobetrag",
    "rechnungsnummer"
  ]
};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "angebot-erstellen": [
    "Legt an: angebote",
    "Automatisch: angebotsstatus (fester Wert „entwurf“)"
  ],
  "projekt-anlegen": [
    "Legt an: projekte",
    "Automatisch: projektstatus (fester Wert „akquise“), projektkennung (Startjahr, Kürzel der Projektart und laufende Projektnummer, z. B. 2026-IT-0104)"
  ],
  "zeit-erfassen": [
    "Legt an: zeiterfassung",
    "Automatisch: erfassungsmonat (Monat des eingegebenen Datums als Monatsoption), erfassungsjahr (Jahr des eingegebenen Datums)"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: kunde (übernommen aus projekte.kunde), rechnungsdatum (heutiges Datum, automatisch), rechnungsstatus (fester Wert „entwurf“)"
  ],
  "rechnung-versenden": [
    "Ändert: rechnungen"
  ]
};

export const PLAN_SUMMARY = "inclou ist ein ERP für die Beratungsfirma inclou GmbH & Co. KG. Es verwaltet Kunden, Berater, den Leistungskatalog und Projekte. Angebote werden jahresweise nummeriert, Arbeitsstunden erfasst und daraus Rechnungen erstellt.";
