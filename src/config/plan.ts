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
    "projektstart_jahr": "intent:projekt-anlegen",
    "projektstart_monat": "intent:projekt-anlegen",
    "projektleitung": "intent:projekt-anlegen",
    "ansprechpartner_kunde": "intent:projekt-anlegen",
    "letzter_schritt": "intent:projekt-anlegen",
    "projektnummer": "tool:projektkennung-vergeben",
    "projektkennung": "tool:projektkennung-vergeben"
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
    "berater": "intent:rechnung-erstellen",
    "zeiterfassungseintraege": "intent:rechnung-erstellen",
    "rechnungsdatum": "intent:rechnung-erstellen",
    "faelligkeitsdatum": "intent:rechnung-erstellen",
    "rechnungsstatus": "tool:rechnung-ueberfaellig-setzen",
    "rechnungsmonat": "intent:rechnung-erstellen",
    "rechnungsjahr": "intent:rechnung-erstellen",
    "nettobetrag": "intent:rechnung-erstellen",
    "mehrwertsteuer": "intent:rechnung-erstellen",
    "notizen": "intent:rechnung-erstellen",
    "rechnungsnummer": "tool:rechnungsnummer-vergeben",
    "gesamtbetrag": "tool:rechnung-gesamtbetrag-bei-erstellung"
  },
  "berater": {
    "stunden_aktueller_monat": "tool:berater-stunden-aktueller-monat",
    "stunden_aktuelles_quartal": "tool:berater-stunden-aktuelles-quartal",
    "stunden_aktuelles_jahr": "tool:berater-stunden-aktuelles-jahr",
    "stunden_letzter_monat": "tool:berater-stunden-rollup-monatswechsel",
    "stunden_letztes_quartal": "tool:berater-stunden-rollup-monatswechsel",
    "stunden_letztes_jahr": "tool:berater-stunden-rollup-monatswechsel"
  }
};

export const SYSTEM_ASSIGNED: Record<string, string[]> = {
  "projekte": [
    "projektkennung",
    "projektnummer"
  ],
  "angebote": [
    "angebotsnummer",
    "anhang"
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
    "Automatisch: angebotsstatus (fester Wert „entwurf“), angebotsjahr (Aktuelles Jahr zum Zeitpunkt der Erstellung)"
  ],
  "stunden-buchen": [
    "Legt an: zeiterfassung",
    "Automatisch: erfassungsmonat (Monat aus dem eingegebenen Datum ableiten), erfassungsjahr (Jahr aus dem eingegebenen Datum ableiten)"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsstatus (fester Wert „entwurf“), rechnungsmonat (Monat aus dem Rechnungsdatum ableiten), rechnungsjahr (Jahr aus dem Rechnungsdatum ableiten)"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist eine interne Geschäftsanwendung für die inclou. GmbH & Co. KG. Sie verbindet Kundenverwaltung, Projektsteuerung, Leistungskatalog, Angebotserstellung, Zeiterfassung und Rechnungslegung in einer Plattform. Angebote werden mit automatisch vergebener Nummer erstellt und als PDF ausgegeben. Projekte erhalten eine zusammengesetzte Kennung aus Startjahr, Projektart und Projektnummer. Berater sind mit ihren Leistungen verknüpft; ihre gebuchten Stunden werden monatlich/quartalsweise/jährlich summiert. Rechnungen entstehen auf Basis von Zeiterfassungseinträgen und lassen sich als zeitlich strukturierte CSV-Tabelle exportieren.";
