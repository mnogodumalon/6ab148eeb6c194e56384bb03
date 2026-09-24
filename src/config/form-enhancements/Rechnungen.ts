import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'rechnungsnummer',
    'rechnungsdatum',
    'faelligkeitsdatum',
    'rechnungsstatus',
    'rechnungsmonat',
    'rechnungsjahr',
    'kunde',
    'projekt',
    'nettobetrag',
    'mehrwertsteuer',
    'gesamtbetrag',
    'berater',
    'zeiterfassungseintraege',
    'notizen',
  ],
  defaults: {
    'rechnungsdatum': { kind: 'today' },
    'rechnungsjahr': { kind: 'currentYear' },
    'rechnungsstatus': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
