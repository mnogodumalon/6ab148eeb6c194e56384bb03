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
    "angebotsnummer"
  ],
  "rechnungen": [
    "rechnungsnummer"
  ]
};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "projekt-anlegen": [
    "Legt an: projekte",
    "Automatisch: projektstatus (fester Wert „akquise“)"
  ],
  "angebot-erstellen": [
    "Legt an: angebote",
    "Automatisch: angebotsjahr (Aktuelles Kalenderjahr zum Zeitpunkt der Erstellung), angebotsstatus (fester Wert „entwurf“)"
  ],
  "zeit-buchen": [
    "Legt an: zeiterfassung",
    "Automatisch: erfassungsmonat (Monat aus dem eingegebenen Datum als Lookup-Schlüssel (z.B. januar, februar …)), erfassungsjahr (Jahr aus dem eingegebenen Datum als vierstellige Zahl)"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsstatus (fester Wert „entwurf“)"
  ],
  "kunden-anlegen": [
    "Legt an: kunden",
    "Automatisch: anlagedatum (heutiges Datum, automatisch)"
  ],
  "projektstatus-aendern": [
    "Ändert: projekte"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist das interne Verwaltungssystem der inclou. GmbH & Co. KG. Es bildet den vollständigen Beratungsbetrieb ab: Kundenstamm, Leistungskatalog, Beraterprofile, Projekte, Angebote, Zeiterfassung und Rechnungsstellung. Kernziel ist es, aus erfassten Zeiten und Projekten strukturierte Angebote und Rechnungen zu erzeugen und die gebuchten Stunden je Berater automatisch aktuell zu halten.";
