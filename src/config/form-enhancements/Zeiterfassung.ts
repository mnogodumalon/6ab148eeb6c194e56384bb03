// Auto-generated. Per-entity form-enhancements config for "Zeiterfassung".
// The sandbox sub-agent (Step 0) may overwrite this file with a richer config.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'berater',
    'projekt',
    'leistung',
    'datum',
    'stunden',
    'arbeitskosten',
    'erfassungsmonat',
    'erfassungsjahr',
    'abrechenbar',
    'taetigkeit',
  ],
  defaults: {
    datum: { kind: 'today' },
    erfassungsjahr: { kind: 'currentYear' },
    abrechenbar: { kind: 'literal', value: true },
    stunden: { kind: 'literal', value: 1 },
  },
  computed: {
    'arbeitskosten': { op: 'mul', left: { kind: 'applookup', ownKey: 'berater', lookupKey: 'stundensatz' }, right: { kind: 'field', key: 'stunden' } },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
