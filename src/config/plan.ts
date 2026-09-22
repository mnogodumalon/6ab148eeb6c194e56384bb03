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
      "projektleitung",
      "projektstatus",
      "ansprechpartner_kunde",
      "letzter_schritt"
    ]
  },
  "angebot-erstellen": {
    "angebote": [
      "projekt",
      "berater",
      "angebotstyp",
      "angebotsstatus",
      "zeitrahmen_anfang",
      "zeitrahmen_ende",
      "dauer",
      "kostentyp",
      "kostenbetrag",
      "angebotsjahr",
      "beschreibung"
    ]
  },
  "stunden-buchen": {
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
      "kunde",
      "projekt",
      "zeiterfassungseintraege",
      "berater",
      "rechnungsdatum",
      "faelligkeitsdatum",
      "rechnungsstatus",
      "rechnungsmonat",
      "rechnungsjahr",
      "nettobetrag",
      "mehrwertsteuer",
      "notizen"
    ]
  }
};

export const OWNERSHIP: Record<string, Record<string, string>> = {
  "projekte": {
    "kunde": "intent:projekt-anlegen",
    "projektart": "intent:projekt-anlegen",
    "projektstart_jahr": "intent:projekt-anlegen",
    "projektstart_monat": "intent:projekt-anlegen",
    "projektleitung": "intent:projekt-anlegen",
    "projektstatus": "intent:projekt-anlegen",
    "ansprechpartner_kunde": "intent:projekt-anlegen",
    "letzter_schritt": "intent:projekt-anlegen",
    "projektnummer": "tool:projekt-kennung-vergeben",
    "projektkennung": "tool:projekt-kennung-vergeben"
  },
  "angebote": {
    "projekt": "intent:angebot-erstellen",
    "berater": "intent:angebot-erstellen",
    "angebotstyp": "intent:angebot-erstellen",
    "angebotsstatus": "intent:angebot-erstellen",
    "zeitrahmen_anfang": "intent:angebot-erstellen",
    "zeitrahmen_ende": "intent:angebot-erstellen",
    "dauer": "intent:angebot-erstellen",
    "kostentyp": "intent:angebot-erstellen",
    "kostenbetrag": "intent:angebot-erstellen",
    "angebotsjahr": "intent:angebot-erstellen",
    "beschreibung": "intent:angebot-erstellen",
    "angebotsnummer": "tool:angebotsnummer-vergeben",
    "anhang": "tool:angebot-pdf-erzeugen"
  },
  "zeiterfassung": {
    "berater": "intent:stunden-buchen",
    "projekt": "intent:stunden-buchen",
    "leistung": "intent:stunden-buchen",
    "datum": "intent:stunden-buchen",
    "stunden": "intent:stunden-buchen",
    "taetigkeit": "intent:stunden-buchen",
    "abrechenbar": "intent:stunden-buchen",
    "erfassungsmonat": "intent:stunden-buchen",
    "erfassungsjahr": "intent:stunden-buchen"
  },
  "rechnungen": {
    "kunde": "intent:rechnung-erstellen",
    "projekt": "intent:rechnung-erstellen",
    "zeiterfassungseintraege": "intent:rechnung-erstellen",
    "berater": "intent:rechnung-erstellen",
    "rechnungsdatum": "intent:rechnung-erstellen",
    "faelligkeitsdatum": "intent:rechnung-erstellen",
    "rechnungsstatus": "intent:rechnung-erstellen",
    "rechnungsmonat": "intent:rechnung-erstellen",
    "rechnungsjahr": "intent:rechnung-erstellen",
    "nettobetrag": "intent:rechnung-erstellen",
    "mehrwertsteuer": "intent:rechnung-erstellen",
    "notizen": "intent:rechnung-erstellen",
    "rechnungsnummer": "tool:rechnungsnummer-und-gesamtbetrag",
    "gesamtbetrag": "tool:rechnungsnummer-und-gesamtbetrag"
  },
  "berater": {
    "stunden_aktueller_monat": "tool:berater-stunden-aggregieren",
    "stunden_aktuelles_quartal": "tool:berater-stunden-aggregieren",
    "stunden_aktuelles_jahr": "tool:berater-stunden-aggregieren"
  }
};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "projekt-anlegen": [
    "Legt an: projekte",
    "Automatisch: projektstatus (fester Wert „akquise“)"
  ],
  "angebot-erstellen": [
    "Legt an: angebote",
    "Automatisch: angebotsstatus (fester Wert „entwurf“), angebotsjahr (Aktuelles Kalenderjahr zum Zeitpunkt der Erstellung)"
  ],
  "stunden-buchen": [
    "Legt an: zeiterfassung",
    "Automatisch: erfassungsmonat (Monat des eingegebenen Datums als Auswahlwert (z. B. januar, februar …)), erfassungsjahr (Jahr des eingegebenen Datums als Zahl)"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsstatus (fester Wert „entwurf“), rechnungsmonat (Monat des Rechnungsdatums als Auswahlwert (z. B. januar, februar …)), rechnungsjahr (Jahr des Rechnungsdatums als Zahl)"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist ein internes Verwaltungssystem für die inclou. GmbH & Co. KG. Es erfasst Kunden, Berater, Leistungen, Projekte, Angebote, Zeiterfassung und Rechnungen. Angebote werden automatisch nummeriert und als PDF ausgegeben. Rechnungen entstehen auf Basis von Zeiterfassungseinträgen. Berater sind mit Leistungen und Projekten verknüpft; ihre gebuchten Stunden werden automatisch aggregiert.";
