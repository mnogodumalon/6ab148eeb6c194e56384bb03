import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'projektkennung',
    'projektnummer',
    'projektart',
    'projektstatus',
    'kunde',
    'projektleitung',
    'projektstart_monat',
    'projektstart_jahr',
    'ansprechpartner_kunde',
    'letzter_schritt',
  ],
  defaults: {
    'projektstatus': { kind: 'lookup', key: 'in_bearbeitung', label: 'In Bearbeitung' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
