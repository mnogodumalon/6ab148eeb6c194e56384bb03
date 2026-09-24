import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'leistungsname',
    'leistungstyp',
    'einheit',
    'kostenvoranschlag',
    'beschreibung',
    'ausfuehrende_berater',
  ],
  defaults: {
    'leistungstyp': { kind: 'lookup', key: 'beratung', label: 'Beratung' },
    'einheit': { kind: 'lookup', key: 'pro_stunde', label: 'pro Stunde' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
