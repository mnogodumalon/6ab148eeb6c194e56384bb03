import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'projektkennung',
    'projektnummer',
    'projektart',
    'projektstatus',
    'projektstart_monat',
    'projektstart_jahr',
    'kunde',
    'ansprechpartner_kunde',
    'projektleitung',
    'letzter_schritt',
  ],
  defaults: {
    'projektart': { kind: 'lookup', key: 'it_beratung', label: 'IT-Beratung' },
    'projektstatus': { kind: 'lookup', key: 'akquise', label: 'Akquise' },
    'projektstart_jahr': { kind: 'literal', value: new Date().getFullYear() },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
