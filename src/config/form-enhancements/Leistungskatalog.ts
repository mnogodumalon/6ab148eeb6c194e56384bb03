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
    'leistungstyp': { kind: 'lookup', key: 'beratung', label: 'Beratung' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
