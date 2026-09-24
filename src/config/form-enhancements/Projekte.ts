import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'projektkennung',
    'projektnummer',
    'projektart',
    'projektstatus',
    { row: ['projektstart_monat', 'projektstart_jahr'], cols: '1fr 1fr' },
    'kunde',
    'ansprechpartner_kunde',
    'projektleitung',
    'letzter_schritt',
  ],
  defaults: {
    'projektart': { kind: 'lookup', key: 'it_beratung', label: 'IT-Beratung' },
    'projektstatus': { kind: 'lookup', key: 'in_bearbeitung', label: 'In Bearbeitung' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
