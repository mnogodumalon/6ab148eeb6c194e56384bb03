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
    '_mehrwertsteuer_betrag',
    'gesamtbetrag',
    'berater',
    'zeiterfassungseintraege',
    'notizen',
  ],
  defaults: {
    'rechnungsdatum': { kind: 'today' },
    'faelligkeitsdatum': { kind: 'todayOffset', days: 14 },
    'rechnungsstatus': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
    'mehrwertsteuer': { kind: 'literal', value: 19 },
  },
  computed: {
    '_mehrwertsteuer_betrag': { op: 'div', left: { op: 'mul', left: { kind: 'field', key: 'nettobetrag' }, right: { kind: 'field', key: 'mehrwertsteuer' } }, right: { kind: 'literal', value: 100 } },
    'gesamtbetrag': { op: 'add', left: { kind: 'field', key: 'nettobetrag' }, right: { kind: 'field', key: '_mehrwertsteuer_betrag' } },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
