// Auto-generated. Per-entity form-enhancements config for "Kunden".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["kundenname", {"row": ["kundentyp", "anlagedatum"], "cols": "1fr 1fr"}, "email", {"row": ["strasse", "hausnummer"], "cols": "2fr 1fr"}, {"row": ["plz", "ort"], "cols": "1fr 2fr"}, "rechnungsadresse_gleich", {"row": ["rechnungsstrasse", "rechnungshausnummer"], "cols": "2fr 1fr"}, {"row": ["rechnungsplz", "rechnungsort"], "cols": "1fr 2fr"}, {"row": ["ansprechpartner_titel", "ansprechpartner_vorname"], "cols": "1fr 2fr"}, "ansprechpartner_nachname", "ansprechpartner_email", "bevorzugte_kontaktart", {"row": ["letzter_kontakt_datum", "letzter_kontakt_ansprechpartner"], "cols": "1fr 1fr"}, "notizen"],
  defaults: {
    'anlagedatum': { kind: 'today' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
