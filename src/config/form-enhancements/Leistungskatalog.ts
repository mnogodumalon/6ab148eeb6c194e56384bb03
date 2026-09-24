// Auto-generated. Per-entity form-enhancements config for "Leistungskatalog".
// The sandbox sub-agent (Step 0) may overwrite this file with a richer config.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'leistungsname',
    'leistungstyp',
    'einheit',
    'beschreibung',
    'kostenvoranschlag',
    'ausfuehrende_berater',
  ],
  defaults: {
    leistungstyp: { kind: 'lookup', key: 'beratung', label: 'Beratung' },
    einheit: { kind: 'lookup', key: 'pauschal', label: 'pauschal' },
    kostenvoranschlag: { kind: 'literal', value: 0 },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
