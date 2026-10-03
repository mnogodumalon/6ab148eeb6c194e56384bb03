// Auto-generated. Per-entity form-enhancements config for "Rechnungen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["rechnungsnummer", "kunde", "projekt", {"row": ["rechnungsdatum", "faelligkeitsdatum"], "cols": "1fr 1fr"}, {"row": ["rechnungsmonat", "rechnungsjahr"], "cols": "2fr 1fr"}, "rechnungsstatus", {"row": ["nettobetrag", "mehrwertsteuer"], "cols": "2fr 1fr"}, "gesamtbetrag", "berater", "zeiterfassungseintraege", "notizen"],
  defaults: {
    'rechnungsdatum': { kind: 'today' },
    'faelligkeitsdatum': { kind: 'todayOffset', days: 14 },
    'rechnungsstatus': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
    'rechnungsjahr': { kind: 'currentYear' },
    'mehrwertsteuer': { kind: 'literal', value: 19 },
  },
  computed: {},
  numberFields: {
    'mehrwertsteuer': { max: 30 },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
