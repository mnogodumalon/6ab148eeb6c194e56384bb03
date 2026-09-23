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
    'projektstatus': { kind: 'lookup', key: 'in_bearbeitung', label: 'In Bearbeitung' },
    'projektstart_jahr': { kind: 'currentYear' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
