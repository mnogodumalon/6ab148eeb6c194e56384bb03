// The orchestrator's plan, as far as the running app needs it
// (docs/orchestrator/SPEC.md). Generated — do not edit; regenerated on every
// build and update from the stored plan. Without a plan every map is empty
// and the guard in useJourneySubmit lets everything through.
//
//   FLOW_WRITES     slug → entity → fields the flow may write (its Schreibliste)
//   OWNERSHIP       entity → field → "intent:<slug>" | "tool:<id>" — who writes it at SOME moment
//   SYSTEM_ASSIGNED entity → fields a tool fills when a record is CREATED — the
//                   value does not exist before; dialogs hide these on create and
//                   the form-polish sets no default on them. A scheduled or
//                   update-triggered tool owns its field but is NOT in here.
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
      "projektleitung",
      "ansprechpartner_kunde",
      "letzter_schritt",
      "projektstatus"
    ]
  },
  "angebot-erstellen": {
    "angebote": [
      "projekt",
      "berater",
      "angebotstyp",
      "angebotsjahr",
      "zeitrahmen_anfang",
      "zeitrahmen_ende",
      "dauer",
      "kostentyp",
      "kostenbetrag",
      "beschreibung",
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
    "projektleitung": "intent:projekt-anlegen",
    "ansprechpartner_kunde": "intent:projekt-anlegen",
    "letzter_schritt": "intent:projekt-anlegen",
    "projektstatus": "intent:projekt-anlegen",
    "projektnummer": "tool:projekt-kennung-vergeben",
    "projektkennung": "tool:projekt-kennung-vergeben"
  },
  "angebote": {
    "projekt": "intent:angebot-erstellen",
    "berater": "intent:angebot-erstellen",
    "angebotstyp": "intent:angebot-erstellen",
    "angebotsjahr": "intent:angebot-erstellen",
    "zeitrahmen_anfang": "intent:angebot-erstellen",
    "zeitrahmen_ende": "intent:angebot-erstellen",
    "dauer": "intent:angebot-erstellen",
    "kostentyp": "intent:angebot-erstellen",
    "kostenbetrag": "intent:angebot-erstellen",
    "beschreibung": "intent:angebot-erstellen",
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
    "rechnungsmonat": "intent:rechnung-erstellen",
    "rechnungsjahr": "intent:rechnung-erstellen",
    "nettobetrag": "intent:rechnung-erstellen",
    "mehrwertsteuer": "intent:rechnung-erstellen",
    "notizen": "intent:rechnung-erstellen",
    "rechnungsstatus": "tool:rechnung-ueberfaellig-markieren",
    "rechnungsnummer": "tool:rechnungsnummer-vergeben",
    "gesamtbetrag": "tool:rechnung-gesamtbetrag-bei-anlage",
    "anhang": "tool:rechnungs-pdf-generieren"
  },
  "berater": {
    "stunden_aktueller_monat": "tool:berater-stunden-aktualisieren-bei-aenderung",
    "stunden_aktuelles_quartal": "tool:berater-stunden-aktualisieren-bei-aenderung",
    "stunden_aktuelles_jahr": "tool:berater-stunden-aktualisieren-bei-aenderung",
    "stunden_letzter_monat": "tool:berater-stunden-aktualisieren-bei-aenderung",
    "stunden_letztes_quartal": "tool:berater-stunden-aktualisieren-bei-aenderung",
    "stunden_letztes_jahr": "tool:berater-stunden-aktualisieren-bei-aenderung"
  }
};

export const SYSTEM_ASSIGNED: Record<string, string[]> = {
  "projekte": [
    "projektkennung",
    "projektnummer"
  ],
  "angebote": [
    "angebotsnummer"
  ],
  "rechnungen": [
    "gesamtbetrag",
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
    "Automatisch: angebotsjahr (Aktuelles Kalenderjahr beim Anlegen des Angebots), angebotsstatus (fester Wert „entwurf“)"
  ],
  "stunden-erfassen": [
    "Legt an: zeiterfassung",
    "Automatisch: erfassungsmonat (Monat des eingegebenen Datums als Lookup-Option), erfassungsjahr (Jahr des eingegebenen Datums)"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsstatus (fester Wert „entwurf“)"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist das interne Verwaltungssystem der inclou. GmbH & Co. KG. Es verbindet Kundenstammdaten, Beraterverwaltung, Leistungskatalog, Projektsteuerung, Angebotserstellung, Zeiterfassung und Rechnungsstellung in einer Plattform. Kernziel ist die durchgehende Verknüpfung vom ersten Kundenkontakt über Angebot und Projekt bis zur abgerechneten Rechnung – mit automatisch vergebenen Nummern, generierten PDF-Dokumenten und einem monatlich strukturierten Rechnungsexport.";
