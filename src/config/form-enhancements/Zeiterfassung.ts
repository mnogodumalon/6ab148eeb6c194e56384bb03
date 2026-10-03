// Auto-generated. Per-entity form-enhancements config for "Zeiterfassung".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["berater", "projekt"], "cols": "1fr 1fr"}, "leistung", {"row": ["datum", "stunden"], "cols": "2fr 1fr"}, {"row": ["erfassungsmonat", "erfassungsjahr"], "cols": "2fr 1fr"}, "abrechenbar", "taetigkeit"],
  defaults: {
    'datum': { kind: 'today' },
    'erfassungsjahr': { kind: 'currentYear' },
    'abrechenbar': { kind: 'literal', value: true },
  },
  computed: {
    '_zeiterfassung_betrag': { op: 'mul', left: { kind: 'field', key: 'stunden' }, right: { kind: 'applookup', ownKey: 'berater', lookupKey: 'stundensatz' } },
  },
  numberFields: {
    'stunden': { max: 24 },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
