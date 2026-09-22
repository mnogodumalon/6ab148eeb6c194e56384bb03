import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'leistungsname',
    'leistungstyp',
    'beschreibung',
    'kostenvoranschlag',
    'einheit',
    'ausfuehrende_berater',
  ],
  defaults: {
    'leistungstyp': { kind: 'lookup', key: 'beratung', label: 'Beratung' },
    'einheit': { kind: 'lookup', key: 'pauschal', label: 'pauschal' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
