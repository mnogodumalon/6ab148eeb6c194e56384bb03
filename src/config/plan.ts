// The orchestrator's plan, as far as the running app needs it
// (docs/orchestrator/SPEC.md). Generated — do not edit; regenerated on every
// build and update from the stored plan. Without a plan every map is empty
// and the guard in useJourneySubmit lets everything through.
//
//   FLOW_WRITES     slug → entity → fields the flow may write (its Schreibliste)
//   OWNERSHIP       entity → field → "intent:<slug>" | "tool:<id>"
//   PLAN_SENTENCES  slug → the plan in the owner's words (flows' field page)

export type FlowWrites = Record<string, string[]>;

export const HAS_PLAN = true;

export const FLOW_WRITES: Record<string, FlowWrites> = {
  "projekt-anlegen": {
    "projekte": [
      "kunde",
      "projektart",
      "projektstart_jahr",
      "projektstart_monat",
      "ansprechpartner_kunde",
      "projektleitung",
      "projektstatus"
    ]
  },
  "angebot-erstellen": {
    "angebote": [
      "projekt",
      "angebotstyp",
      "zeitrahmen_anfang",
      "zeitrahmen_ende",
      "dauer",
      "kostentyp",
      "kostenbetrag",
      "berater",
      "beschreibung",
      "angebotsjahr",
      "angebotsstatus"
    ]
  },
  "zeit-erfassen": {
    "zeiterfassung": [
      "berater",
      "projekt",
      "leistung",
      "datum",
      "stunden",
      "taetigkeit",
      "abrechenbar",
      "erfassungsmonat",
      "erfassungsjahr"
    ]
  },
  "rechnung-erstellen": {
    "rechnungen": [
      "projekt",
      "kunde",
      "rechnungsdatum",
      "faelligkeitsdatum",
      "rechnungsmonat",
      "rechnungsjahr",
      "nettobetrag",
      "mehrwertsteuer",
      "zeiterfassungseintraege",
      "berater",
      "notizen",
      "rechnungsstatus"
    ]
  }
};

export const OWNERSHIP: Record<string, Record<string, string>> = {
  "projekte": {
    "kunde": "intent:projekt-anlegen",
    "projektart": "intent:projekt-anlegen",
    "projektstart_jahr": "intent:projekt-anlegen",
    "projektstart_monat": "intent:projekt-anlegen",
    "ansprechpartner_kunde": "intent:projekt-anlegen",
    "projektleitung": "intent:projekt-anlegen",
    "projektstatus": "intent:projekt-anlegen",
    "projektnummer": "tool:projekt-kennung-vergeben",
    "projektkennung": "tool:projekt-kennung-vergeben"
  },
  "angebote": {
    "projekt": "intent:angebot-erstellen",
    "angebotstyp": "intent:angebot-erstellen",
    "zeitrahmen_anfang": "intent:angebot-erstellen",
    "zeitrahmen_ende": "intent:angebot-erstellen",
    "dauer": "intent:angebot-erstellen",
    "kostentyp": "intent:angebot-erstellen",
    "kostenbetrag": "intent:angebot-erstellen",
    "berater": "intent:angebot-erstellen",
    "beschreibung": "intent:angebot-erstellen",
    "angebotsjahr": "intent:angebot-erstellen",
    "angebotsstatus": "intent:angebot-erstellen",
    "angebotsnummer": "tool:angebotsnummer-vergeben",
    "anhang": "tool:angebot-pdf-generieren"
  },
  "zeiterfassung": {
    "berater": "intent:zeit-erfassen",
    "projekt": "intent:zeit-erfassen",
    "leistung": "intent:zeit-erfassen",
    "datum": "intent:zeit-erfassen",
    "stunden": "intent:zeit-erfassen",
    "taetigkeit": "intent:zeit-erfassen",
    "abrechenbar": "intent:zeit-erfassen",
    "erfassungsmonat": "intent:zeit-erfassen",
    "erfassungsjahr": "intent:zeit-erfassen"
  },
  "rechnungen": {
    "projekt": "intent:rechnung-erstellen",
    "kunde": "intent:rechnung-erstellen",
    "rechnungsdatum": "intent:rechnung-erstellen",
    "faelligkeitsdatum": "intent:rechnung-erstellen",
    "rechnungsmonat": "intent:rechnung-erstellen",
    "rechnungsjahr": "intent:rechnung-erstellen",
    "nettobetrag": "intent:rechnung-erstellen",
    "mehrwertsteuer": "intent:rechnung-erstellen",
    "zeiterfassungseintraege": "intent:rechnung-erstellen",
    "berater": "intent:rechnung-erstellen",
    "notizen": "intent:rechnung-erstellen",
    "rechnungsstatus": "intent:rechnung-erstellen",
    "rechnungsnummer": "tool:rechnungsnummer-und-betrag",
    "gesamtbetrag": "tool:rechnungsnummer-und-betrag"
  },
  "berater": {
    "stunden_aktueller_monat": "tool:berater-stunden-aggregieren",
    "stunden_aktuelles_quartal": "tool:berater-stunden-aggregieren",
    "stunden_aktuelles_jahr": "tool:berater-stunden-aggregieren",
    "stunden_letzter_monat": "tool:berater-stunden-aggregieren",
    "stunden_letztes_quartal": "tool:berater-stunden-aggregieren",
    "stunden_letztes_jahr": "tool:berater-stunden-aggregieren"
  }
};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "projekt-anlegen": [
    "Legt an: projekte",
    "Automatisch: projektstatus (fester Wert „akquise“)"
  ],
  "angebot-erstellen": [
    "Legt an: angebote",
    "Automatisch: angebotsjahr (Aktuelles Kalenderjahr beim Anlegen des Angebots), angebotsstatus (fester Wert „entwurf“)"
  ],
  "zeit-erfassen": [
    "Legt an: zeiterfassung",
    "Automatisch: datum (heutiges Datum, automatisch), erfassungsmonat (Monat des eingegebenen Datums als Auswahlwert (z. B. 'januar')), erfassungsjahr (Jahr des eingegebenen Datums als Zahl)"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsdatum (heutiges Datum, automatisch), rechnungsstatus (fester Wert „entwurf“)"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist eine interne Unternehmenssoftware für die inclou. GmbH & Co. KG. Sie verwaltet Kunden, Berater, den Leistungskatalog, Projekte, Angebote, Zeiterfassung und Rechnungen. Angebote werden automatisch nummeriert und als PDF ausgegeben. Rechnungen entstehen aus Zeiterfassungseinträgen und Projektdaten. Berater sind mit Leistungen verknüpft und ihre gebuchten Stunden werden aggregiert.";
