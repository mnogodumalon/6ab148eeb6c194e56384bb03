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
      "projektstart_monat",
      "projektstart_jahr",
      "ansprechpartner_kunde",
      "projektleitung",
      "projektstatus",
      "letzter_schritt"
    ]
  },
  "angebot-erstellen": {
    "angebote": [
      "projekt",
      "berater",
      "angebotstyp",
      "zeitrahmen_anfang",
      "zeitrahmen_ende",
      "dauer",
      "kostentyp",
      "kostenbetrag",
      "beschreibung",
      "angebotsjahr",
      "angebotsstatus"
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
      "rechnungsmonat",
      "rechnungsjahr",
      "nettobetrag",
      "mehrwertsteuer",
      "notizen",
      "rechnungsstatus"
    ]
  }
};

export const OWNERSHIP: Record<string, Record<string, string>> = {
  "projekte": {
    "kunde": "intent:projekt-anlegen",
    "projektart": "intent:projekt-anlegen",
    "projektstart_monat": "intent:projekt-anlegen",
    "projektstart_jahr": "intent:projekt-anlegen",
    "ansprechpartner_kunde": "intent:projekt-anlegen",
    "projektleitung": "intent:projekt-anlegen",
    "projektstatus": "intent:projekt-anlegen",
    "letzter_schritt": "intent:projekt-anlegen",
    "projektnummer": "tool:projektnummer-vergeben",
    "projektkennung": "tool:projektnummer-vergeben"
  },
  "angebote": {
    "projekt": "intent:angebot-erstellen",
    "berater": "intent:angebot-erstellen",
    "angebotstyp": "intent:angebot-erstellen",
    "zeitrahmen_anfang": "intent:angebot-erstellen",
    "zeitrahmen_ende": "intent:angebot-erstellen",
    "dauer": "intent:angebot-erstellen",
    "kostentyp": "intent:angebot-erstellen",
    "kostenbetrag": "intent:angebot-erstellen",
    "beschreibung": "intent:angebot-erstellen",
    "angebotsjahr": "intent:angebot-erstellen",
    "angebotsstatus": "intent:angebot-erstellen",
    "angebotsnummer": "tool:angebotsnummer-vergeben"
  },
  "rechnungen": {
    "kunde": "intent:rechnung-erstellen",
    "projekt": "intent:rechnung-erstellen",
    "zeiterfassungseintraege": "intent:rechnung-erstellen",
    "berater": "intent:rechnung-erstellen",
    "rechnungsdatum": "intent:rechnung-erstellen",
    "faelligkeitsdatum": "intent:rechnung-erstellen",
    "rechnungsmonat": "intent:rechnung-erstellen",
    "rechnungsjahr": "intent:rechnung-erstellen",
    "nettobetrag": "intent:rechnung-erstellen",
    "mehrwertsteuer": "intent:rechnung-erstellen",
    "notizen": "intent:rechnung-erstellen",
    "rechnungsstatus": "intent:rechnung-erstellen",
    "rechnungsnummer": "tool:rechnungsnummer-vergeben"
  }
};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "projekt-anlegen": [
    "Legt an: projekte",
    "Automatisch: projektstatus (fester Wert „akquise“)"
  ],
  "angebot-erstellen": [
    "Legt an: angebote",
    "Automatisch: angebotsstatus (fester Wert „entwurf“)"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsstatus (fester Wert „entwurf“)"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist eine interne Geschäftssoftware für die inclou. GmbH & Co. KG. Sie erfasst Kunden, Projekte, Berater, Leistungen, Angebote, Zeiterfassung und Rechnungen in einem zusammenhängenden System. Berater buchen Stunden auf Projekte, Angebote werden Projekten zugeordnet und nummeriert, Rechnungen entstehen auf Basis der erfassten Zeiten.";
