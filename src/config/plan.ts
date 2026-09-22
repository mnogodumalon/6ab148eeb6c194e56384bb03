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
      "projektstatus",
      "projektstart_monat",
      "projektstart_jahr",
      "projektleitung",
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
      "angebotsjahr",
      "zeitrahmen_anfang",
      "zeitrahmen_ende",
      "dauer",
      "kostentyp",
      "kostenbetrag",
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
      "abrechenbar"
    ]
  },
  "rechnung-erstellen": {
    "rechnungen": [
      "kunde",
      "projekt",
      "berater",
      "zeiterfassungseintraege",
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
    "projektstatus": "intent:projekt-anlegen",
    "projektstart_monat": "intent:projekt-anlegen",
    "projektstart_jahr": "intent:projekt-anlegen",
    "projektleitung": "intent:projekt-anlegen",
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
    "angebotsjahr": "intent:angebot-erstellen",
    "zeitrahmen_anfang": "intent:angebot-erstellen",
    "zeitrahmen_ende": "intent:angebot-erstellen",
    "dauer": "intent:angebot-erstellen",
    "kostentyp": "intent:angebot-erstellen",
    "kostenbetrag": "intent:angebot-erstellen",
    "beschreibung": "intent:angebot-erstellen",
    "angebotsnummer": "tool:angebotsnummer-vergeben",
    "anhang": "tool:angebot-pdf-generieren"
  },
  "zeiterfassung": {
    "berater": "intent:stunden-buchen",
    "projekt": "intent:stunden-buchen",
    "leistung": "intent:stunden-buchen",
    "datum": "intent:stunden-buchen",
    "stunden": "intent:stunden-buchen",
    "taetigkeit": "intent:stunden-buchen",
    "abrechenbar": "intent:stunden-buchen",
    "erfassungsmonat": "tool:zeiterfassung-erfassungsmonat-setzen",
    "erfassungsjahr": "tool:zeiterfassung-erfassungsmonat-setzen"
  },
  "rechnungen": {
    "kunde": "intent:rechnung-erstellen",
    "projekt": "intent:rechnung-erstellen",
    "berater": "intent:rechnung-erstellen",
    "zeiterfassungseintraege": "intent:rechnung-erstellen",
    "rechnungsdatum": "intent:rechnung-erstellen",
    "faelligkeitsdatum": "intent:rechnung-erstellen",
    "rechnungsstatus": "tool:rechnung-ueberfaellig-markieren",
    "rechnungsmonat": "intent:rechnung-erstellen",
    "rechnungsjahr": "intent:rechnung-erstellen",
    "nettobetrag": "intent:rechnung-erstellen",
    "mehrwertsteuer": "intent:rechnung-erstellen",
    "notizen": "intent:rechnung-erstellen",
    "rechnungsnummer": "tool:rechnungsnummer-vergeben",
    "gesamtbetrag": "tool:rechnung-gesamtbetrag-bei-erstellung",
    "anhang": "tool:rechnung-pdf-generieren"
  },
  "berater": {
    "stunden_aktueller_monat": "tool:berater-stunden-monatlich-reset",
    "stunden_aktuelles_quartal": "tool:berater-stunden-monatlich-reset",
    "stunden_aktuelles_jahr": "tool:berater-stunden-monatlich-reset",
    "stunden_letzter_monat": "tool:berater-stunden-monatlich-reset",
    "stunden_letztes_quartal": "tool:berater-stunden-monatlich-reset",
    "stunden_letztes_jahr": "tool:berater-stunden-monatlich-reset"
  },
  "kunden": {
    "anlagedatum": "tool:kunden-anlagedatum-setzen"
  }
};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "projekt-anlegen": [
    "Legt an: projekte",
    "Automatisch: projektstatus (fester Wert „akquise“)"
  ],
  "angebot-erstellen": [
    "Legt an: angebote",
    "Automatisch: angebotsstatus (fester Wert „entwurf“), angebotsjahr (Aktuelles Jahr zum Zeitpunkt der Erfassung)"
  ],
  "stunden-buchen": [
    "Legt an: zeiterfassung"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsstatus (fester Wert „entwurf“), rechnungsmonat (Monat aus dem eingegebenen Rechnungsdatum als lookup-Option (z. B. januar, februar …)), rechnungsjahr (Jahr aus dem eingegebenen Rechnungsdatum als Zahl)"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist ein internes Verwaltungssystem für die inclou. GmbH & Co. KG. Es erfasst Kunden, Berater, Leistungen, Projekte, Angebote, Zeiterfassung und Rechnungen. Angebote werden automatisch nummeriert und als PDF ausgegeben. Projekte erhalten eine zusammengesetzte Projektkennung. Rechnungen entstehen auf Basis von Zeiterfassungseinträgen und Projekten. Stundenaggregationen pro Berater werden automatisch aktuell gehalten.";
