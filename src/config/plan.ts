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
      "projektstatus"
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
  "stunden-erfassen": {
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
      "berater",
      "zeiterfassungseintraege",
      "rechnungsdatum",
      "faelligkeitsdatum",
      "nettobetrag",
      "mehrwertsteuer",
      "notizen",
      "rechnungsmonat",
      "rechnungsjahr",
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
    "projektnummer": "tool:projekt-kennung-nummer",
    "projektkennung": "tool:projekt-kennung-nummer"
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
    "angebotsnummer": "tool:angebotsnummer-vergeben",
    "anhang": "tool:angebot-pdf-generieren"
  },
  "zeiterfassung": {
    "berater": "intent:stunden-erfassen",
    "projekt": "intent:stunden-erfassen",
    "leistung": "intent:stunden-erfassen",
    "datum": "intent:stunden-erfassen",
    "stunden": "intent:stunden-erfassen",
    "taetigkeit": "intent:stunden-erfassen",
    "abrechenbar": "intent:stunden-erfassen",
    "erfassungsmonat": "intent:stunden-erfassen",
    "erfassungsjahr": "intent:stunden-erfassen"
  },
  "rechnungen": {
    "kunde": "intent:rechnung-erstellen",
    "projekt": "intent:rechnung-erstellen",
    "berater": "intent:rechnung-erstellen",
    "zeiterfassungseintraege": "intent:rechnung-erstellen",
    "rechnungsdatum": "intent:rechnung-erstellen",
    "faelligkeitsdatum": "intent:rechnung-erstellen",
    "nettobetrag": "intent:rechnung-erstellen",
    "mehrwertsteuer": "intent:rechnung-erstellen",
    "notizen": "intent:rechnung-erstellen",
    "rechnungsmonat": "intent:rechnung-erstellen",
    "rechnungsjahr": "intent:rechnung-erstellen",
    "rechnungsstatus": "intent:rechnung-erstellen",
    "rechnungsnummer": "tool:rechnungsnummer-vergeben",
    "gesamtbetrag": "tool:rechnungsnummer-vergeben"
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
    "Automatisch: angebotsjahr (Jahr aus dem Feld zeitrahmen_anfang ableiten), angebotsstatus (fester Wert „entwurf“)"
  ],
  "stunden-erfassen": [
    "Legt an: zeiterfassung",
    "Automatisch: erfassungsmonat (Monat aus dem Feld datum ableiten (Monatsname als Option)), erfassungsjahr (Jahr aus dem Feld datum ableiten)"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsmonat (Monat aus dem Feld rechnungsdatum ableiten (Monatsname als Option)), rechnungsjahr (Jahr aus dem Feld rechnungsdatum ableiten), rechnungsstatus (fester Wert „entwurf“)"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist ein internes Verwaltungssystem für die inclou. GmbH & Co. KG. Es bildet den gesamten Beratungs- und Projektbetrieb ab: von der Kundenpflege über Angebote, Projekte und Leistungskatalog bis hin zur Zeiterfassung und Rechnungsstellung. Berater werden mit ihren Leistungen, Stundensätzen und gebuchten Zeiten geführt. Angebote werden automatisch als PDF ausgegeben. Rechnungen entstehen aus Zeiterfassungseinträgen und Projekten.";
