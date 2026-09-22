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
      "angebotstyp",
      "angebotsjahr",
      "angebotsstatus",
      "zeitrahmen_anfang",
      "zeitrahmen_ende",
      "dauer",
      "kostentyp",
      "kostenbetrag",
      "berater",
      "beschreibung"
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
      "zeiterfassungseintraege",
      "berater",
      "rechnungsdatum",
      "faelligkeitsdatum",
      "rechnungsmonat",
      "rechnungsjahr",
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
    "projektstart_monat": "intent:projekt-anlegen",
    "projektstart_jahr": "intent:projekt-anlegen",
    "projektleitung": "intent:projekt-anlegen",
    "ansprechpartner_kunde": "intent:projekt-anlegen",
    "letzter_schritt": "intent:projekt-anlegen",
    "projektnummer": "tool:projektkennung-vergeben",
    "projektkennung": "tool:projektkennung-vergeben"
  },
  "angebote": {
    "projekt": "intent:angebot-erstellen",
    "angebotstyp": "intent:angebot-erstellen",
    "angebotsjahr": "intent:angebot-erstellen",
    "angebotsstatus": "intent:angebot-erstellen",
    "zeitrahmen_anfang": "intent:angebot-erstellen",
    "zeitrahmen_ende": "intent:angebot-erstellen",
    "dauer": "intent:angebot-erstellen",
    "kostentyp": "intent:angebot-erstellen",
    "kostenbetrag": "intent:angebot-erstellen",
    "berater": "intent:angebot-erstellen",
    "beschreibung": "intent:angebot-erstellen",
    "angebotsnummer": "tool:angebotsnummer-vergeben",
    "anhang": "tool:angebot-pdf-erzeugen"
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
    "zeiterfassungseintraege": "intent:rechnung-erstellen",
    "berater": "intent:rechnung-erstellen",
    "rechnungsdatum": "intent:rechnung-erstellen",
    "faelligkeitsdatum": "intent:rechnung-erstellen",
    "rechnungsmonat": "intent:rechnung-erstellen",
    "rechnungsjahr": "intent:rechnung-erstellen",
    "nettobetrag": "intent:rechnung-erstellen",
    "mehrwertsteuer": "intent:rechnung-erstellen",
    "rechnungsstatus": "tool:ueberfaellige-rechnungen-markieren",
    "notizen": "intent:rechnung-erstellen",
    "rechnungsnummer": "tool:rechnungsnummer-und-gesamtbetrag",
    "gesamtbetrag": "tool:rechnungsnummer-und-gesamtbetrag"
  }
};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "projekt-anlegen": [
    "Legt an: projekte",
    "Automatisch: projektstatus (fester Wert „akquise“)"
  ],
  "angebot-erstellen": [
    "Legt an: angebote",
    "Automatisch: angebotsjahr (Aktuelles Kalenderjahr zum Zeitpunkt der Erfassung), angebotsstatus (fester Wert „entwurf“)"
  ],
  "stunden-erfassen": [
    "Legt an: zeiterfassung",
    "Automatisch: erfassungsmonat (Monat aus dem eingegebenen Datum als Lookup-Option (z. B. datum 2026-03-15 → maerz)), erfassungsjahr (Jahr aus dem eingegebenen Datum als Zahl (z. B. datum 2026-03-15 → 2026))"
  ],
  "rechnung-erstellen": [
    "Legt an: rechnungen",
    "Automatisch: rechnungsmonat (Monat aus dem Rechnungsdatum als Lookup-Option (z. B. rechnungsdatum 2026-03-01 → maerz)), rechnungsjahr (Jahr aus dem Rechnungsdatum als Zahl (z. B. rechnungsdatum 2026-03-01 → 2026)), rechnungsstatus (fester Wert „entwurf“)"
  ]
};

export const PLAN_SUMMARY = "inclou. ERP ist eine interne Unternehmensanwendung für die inclou. GmbH & Co. KG. Sie verwaltet Kunden, Berater:innen, den Leistungskatalog, Projekte, Zeiterfassung, Angebote und Rechnungen. Das System vergibt automatisch Nummern und Kennungen, berechnet Gesamtbeträge und markiert überfällige Rechnungen – alles ohne manuelle Eingriffe. Mitarbeitende erfassen ihre Stunden, Projektleiter:innen legen Angebote und Rechnungen an.";
