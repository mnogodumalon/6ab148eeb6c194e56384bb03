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
      "ansprechpartner_kunde",
      "projektleitung",
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
  "rechnung-anlegen": {
    "rechnungen": [
      "projekt",
      "kunde",
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
    "ansprechpartner_kunde": "intent:projekt-anlegen",
    "projektleitung": "intent:projekt-anlegen",
    "letzter_schritt": "intent:projekt-anlegen",
    "projektnummer": "tool:projekt-nummer-vergeben",
    "projektkennung": "tool:projekt-nummer-vergeben"
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
    "projekt": "intent:rechnung-anlegen",
    "kunde": "intent:rechnung-anlegen",
    "berater": "intent:rechnung-anlegen",
    "zeiterfassungseintraege": "intent:rechnung-anlegen",
    "rechnungsdatum": "intent:rechnung-anlegen",
    "faelligkeitsdatum": "intent:rechnung-anlegen",
    "rechnungsstatus": "tool:rechnung-ueberfaellig-markieren",
    "rechnungsmonat": "intent:rechnung-anlegen",
    "rechnungsjahr": "intent:rechnung-anlegen",
    "nettobetrag": "intent:rechnung-anlegen",
    "mehrwertsteuer": "intent:rechnung-anlegen",
    "notizen": "intent:rechnung-anlegen",
    "rechnungsnummer": "tool:rechnungsnummer-vergeben",
    "gesamtbetrag": "tool:rechnung-gesamtbetrag-berechnen",
    "anhang": "tool:rechnung-pdf-erzeugen"
  },
  "berater": {
    "stunden_aktueller_monat": "tool:berater-stunden-bei-update",
    "stunden_aktuelles_quartal": "tool:berater-stunden-bei-update",
    "stunden_aktuelles_jahr": "tool:berater-stunden-bei-update",
    "stunden_letzter_monat": "tool:berater-stunden-bei-update",
    "stunden_letztes_quartal": "tool:berater-stunden-bei-update",
    "stunden_letztes_jahr": "tool:berater-stunden-bei-update"
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
  "zeit-erfassen": [
    "Legt an: zeiterfassung",
    "Automatisch: erfassungsmonat (Monat aus dem eingegebenen Datum ableiten), erfassungsjahr (Jahr aus dem eingegebenen Datum ableiten)"
  ],
  "rechnung-anlegen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsstatus (fester Wert „entwurf“), rechnungsmonat (Monat aus dem Rechnungsdatum ableiten), rechnungsjahr (Jahr aus dem Rechnungsdatum ableiten)"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist ein internes Verwaltungssystem für die inclou. GmbH & Co. KG. Es bildet den gesamten Beratungs- und Projektbetrieb ab: Kundenstamm, Beratende mit ihren Leistungsangeboten und Stundensätzen, Leistungskatalog, Projekte (nach Status), Angebote mit PDF-Erzeugung, Zeiterfassung der Berater:innen und Rechnungsstellung auf Basis der erfassten Zeiten.";
