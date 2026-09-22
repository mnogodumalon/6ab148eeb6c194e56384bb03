import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'projektkennung',
    'projektnummer',
    'projektart',
    'projektstatus',
    { row: ['projektstart_monat', 'projektstart_jahr'] },
    'kunde',
    'ansprechpartner_kunde',
    'projektleitung',
    'letzter_schritt',
  ],
  defaults: {
    'projektstatus': { kind: 'lookup', key: 'akquise', label: 'Akquise' },
    'projektart': { kind: 'lookup', key: 'it_beratung', label: 'IT-Beratung' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
