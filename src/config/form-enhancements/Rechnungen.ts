import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'rechnungsnummer',
    'rechnungsdatum',
    'faelligkeitsdatum',
    'rechnungsstatus',
    { row: ['rechnungsmonat', 'rechnungsjahr'] },
    'kunde',
    'projekt',
    'berater',
    'zeiterfassungseintraege',
    'nettobetrag',
    'mehrwertsteuer',
    'gesamtbetrag',
    'notizen',
  ],
  defaults: {
    'rechnungsdatum': { kind: 'today' },
    'faelligkeitsdatum': { kind: 'todayOffset', days: 14 },
    'rechnungsstatus': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
    'mehrwertsteuer': { kind: 'literal', value: 19 },
    'rechnungsjahr': { kind: 'literal', value: 2026 },
  },
  computed: {
    '_mwst_betrag': { op: 'div', left: { op: 'mul', left: { kind: 'field', key: 'nettobetrag' }, right: { kind: 'field', key: 'mehrwertsteuer' } }, right: { kind: 'literal', value: 100 } },
    'gesamtbetrag': { op: 'mul', left: { kind: 'field', key: 'nettobetrag' }, right: { op: 'add', left: { kind: 'literal', value: 1 }, right: { op: 'div', left: { kind: 'field', key: 'mehrwertsteuer' }, right: { kind: 'literal', value: 100 } } } },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
