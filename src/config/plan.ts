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
      "projektstatus",
      "projektstart_jahr",
      "projektstart_monat",
      "projektleitung",
      "ansprechpartner_kunde",
      "letzter_schritt"
    ]
  },
  "angebot-erstellen": {
    "angebote": [
      "projekt",
      "angebotstyp",
      "angebotsstatus",
      "zeitrahmen_anfang",
      "zeitrahmen_ende",
      "dauer",
      "kostentyp",
      "kostenbetrag",
      "beschreibung",
      "berater",
      "anhang"
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
      "abrechenbar"
    ]
  },
  "rechnung-erstellen": {
    "rechnungen": [
      "kunde",
      "projekt",
      "rechnungsdatum",
      "faelligkeitsdatum",
      "zeiterfassungseintraege",
      "berater",
      "nettobetrag",
      "mehrwertsteuer",
      "rechnungsstatus",
      "notizen"
    ]
  }
};

export const OWNERSHIP: Record<string, Record<string, string>> = {
  "projekte": {
    "kunde": "intent:projekt-anlegen",
    "projektart": "intent:projekt-anlegen",
    "projektstatus": "intent:projekt-anlegen",
    "projektstart_jahr": "intent:projekt-anlegen",
    "projektstart_monat": "intent:projekt-anlegen",
    "projektleitung": "intent:projekt-anlegen",
    "ansprechpartner_kunde": "intent:projekt-anlegen",
    "letzter_schritt": "intent:projekt-anlegen",
    "projektnummer": "tool:projekt-kennung-und-nummer",
    "projektkennung": "tool:projekt-kennung-und-nummer"
  },
  "angebote": {
    "projekt": "intent:angebot-erstellen",
    "angebotstyp": "intent:angebot-erstellen",
    "angebotsstatus": "intent:angebot-erstellen",
    "zeitrahmen_anfang": "intent:angebot-erstellen",
    "zeitrahmen_ende": "intent:angebot-erstellen",
    "dauer": "intent:angebot-erstellen",
    "kostentyp": "intent:angebot-erstellen",
    "kostenbetrag": "intent:angebot-erstellen",
    "beschreibung": "intent:angebot-erstellen",
    "berater": "intent:angebot-erstellen",
    "anhang": "tool:angebot-pdf",
    "angebotsnummer": "tool:angebot-nummer-und-jahr",
    "angebotsjahr": "tool:angebot-nummer-und-jahr"
  },
  "zeiterfassung": {
    "berater": "intent:stunden-erfassen",
    "projekt": "intent:stunden-erfassen",
    "leistung": "intent:stunden-erfassen",
    "datum": "intent:stunden-erfassen",
    "stunden": "intent:stunden-erfassen",
    "taetigkeit": "intent:stunden-erfassen",
    "abrechenbar": "intent:stunden-erfassen",
    "erfassungsmonat": "tool:zeiterfassung-monat-jahr",
    "erfassungsjahr": "tool:zeiterfassung-monat-jahr"
  },
  "rechnungen": {
    "kunde": "intent:rechnung-erstellen",
    "projekt": "intent:rechnung-erstellen",
    "rechnungsdatum": "intent:rechnung-erstellen",
    "faelligkeitsdatum": "intent:rechnung-erstellen",
    "zeiterfassungseintraege": "intent:rechnung-erstellen",
    "berater": "intent:rechnung-erstellen",
    "nettobetrag": "intent:rechnung-erstellen",
    "mehrwertsteuer": "intent:rechnung-erstellen",
    "rechnungsstatus": "tool:rechnung-ueberfaellig",
    "notizen": "intent:rechnung-erstellen",
    "rechnungsnummer": "tool:rechnung-nummer-und-monat-jahr",
    "rechnungsmonat": "tool:rechnung-nummer-und-monat-jahr",
    "rechnungsjahr": "tool:rechnung-nummer-und-monat-jahr",
    "gesamtbetrag": "tool:rechnung-gesamtbetrag-bei-aenderung"
  },
  "berater": {
    "stunden_aktueller_monat": "tool:berater-stunden-aggregation",
    "stunden_aktuelles_quartal": "tool:berater-stunden-aggregation",
    "stunden_aktuelles_jahr": "tool:berater-stunden-aggregation",
    "stunden_letzter_monat": "tool:berater-stunden-aggregation",
    "stunden_letztes_quartal": "tool:berater-stunden-aggregation",
    "stunden_letztes_jahr": "tool:berater-stunden-aggregation"
  }
};

export const SYSTEM_ASSIGNED: Record<string, string[]> = {
  "projekte": [
    "projektkennung",
    "projektnummer"
  ],
  "angebote": [
    "angebotsjahr",
    "angebotsnummer"
  ],
  "rechnungen": [
    "gesamtbetrag",
    "rechnungsjahr",
    "rechnungsmonat",
    "rechnungsnummer"
  ],
  "zeiterfassung": [
    "erfassungsjahr",
    "erfassungsmonat"
  ]
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
  "stunden-erfassen": [
    "Legt an: zeiterfassung"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsstatus (fester Wert „entwurf“)"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist das interne Unternehmens-ERP der inclou. GmbH & Co. KG. Es verwaltet Kunden, Berater, den Leistungskatalog, Projekte, Angebote, Zeiterfassung und Rechnungen. Kernanliegen: Angebote mit automatischer Nummerierung und PDF-Ausgabe, Projektverfolgung nach Status, monatliche Zeiterfassung je Berater und Projekt, sowie Rechnungserstellung auf Basis der erfassten Zeiten.";
