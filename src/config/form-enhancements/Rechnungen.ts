import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'rechnungsnummer',
    'rechnungsdatum',
    'faelligkeitsdatum',
    'rechnungsstatus',
    { row: ['rechnungsmonat', 'rechnungsjahr'], cols: '2fr 1fr' },
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
    'faelligkeitsdatum': { kind: 'todayOffset', days: 14 },
    'rechnungsjahr': { kind: 'currentYear' },
    'rechnungsstatus': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
    'mehrwertsteuer': { kind: 'literal', value: 19 },
  },
  computed: {
    '_mwst_betrag': { op: 'mul', left: { kind: 'field', key: 'nettobetrag' }, right: { op: 'div', left: { kind: 'field', key: 'mehrwertsteuer' }, right: { kind: 'literal', value: 100 } } },
    'gesamtbetrag': { op: 'add', left: { kind: 'field', key: 'nettobetrag' }, right: { kind: 'field', key: '_mwst_betrag' } },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
