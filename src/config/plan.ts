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
      "zeitrahmen_anfang",
      "zeitrahmen_ende",
      "dauer",
      "kostentyp",
      "kostenbetrag",
      "beschreibung",
      "angebotsstatus",
      "angebotsjahr"
    ]
  },
  "stunden-erfassen": {
    "zeiterfassung": [
      "berater",
      "projekt",
      "leistung",
      "datum",
      "stunden",
      "abrechenbar",
      "taetigkeit",
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
      "rechnungsmonat",
      "rechnungsjahr",
      "rechnungsstatus",
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
    "zeitrahmen_anfang": "intent:angebot-erstellen",
    "zeitrahmen_ende": "intent:angebot-erstellen",
    "dauer": "intent:angebot-erstellen",
    "kostentyp": "intent:angebot-erstellen",
    "kostenbetrag": "intent:angebot-erstellen",
    "beschreibung": "intent:angebot-erstellen",
    "angebotsstatus": "intent:angebot-erstellen",
    "angebotsjahr": "intent:angebot-erstellen",
    "angebotsnummer": "tool:angebotsnummer-vergeben",
    "anhang": "tool:angebots-pdf-erzeugen"
  },
  "zeiterfassung": {
    "berater": "intent:stunden-erfassen",
    "projekt": "intent:stunden-erfassen",
    "leistung": "intent:stunden-erfassen",
    "datum": "intent:stunden-erfassen",
    "stunden": "intent:stunden-erfassen",
    "abrechenbar": "intent:stunden-erfassen",
    "taetigkeit": "intent:stunden-erfassen",
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
    "rechnungsmonat": "intent:rechnung-erstellen",
    "rechnungsjahr": "intent:rechnung-erstellen",
    "rechnungsstatus": "intent:rechnung-erstellen",
    "notizen": "intent:rechnung-erstellen",
    "rechnungsnummer": "tool:rechnungsnummer-vergeben"
  },
  "berater": {
    "stunden_aktueller_monat": "tool:berater-stunden-aktualisieren",
    "stunden_aktuelles_quartal": "tool:berater-stunden-aktualisieren",
    "stunden_aktuelles_jahr": "tool:berater-stunden-aktualisieren"
  }
};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "projekt-anlegen": [
    "Legt an: projekte",
    "Automatisch: projektstatus (fester Wert „akquise“)"
  ],
  "angebot-erstellen": [
    "Legt an: angebote",
    "Automatisch: angebotsstatus (fester Wert „entwurf“), angebotsjahr (Aktuelles Jahr aus dem Systemdatum)"
  ],
  "stunden-erfassen": [
    "Legt an: zeiterfassung",
    "Automatisch: erfassungsmonat (Monatsname des eingegebenen Datums), erfassungsjahr (Jahr des eingegebenen Datums)"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsmonat (Monatsname des Rechnungsdatums), rechnungsjahr (Jahr des Rechnungsdatums), rechnungsstatus (fester Wert „entwurf“)"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist eine interne Plattform für die inclou. GmbH & Co. KG. Sie verwaltet Kunden, Berater, den Leistungskatalog, Projekte, Angebote, Zeiterfassung und Rechnungen. Das System vergibt Nummern und Kennungen automatisch, generiert Angebots-PDFs und hält Berater-Stundentotals aktuell.";
