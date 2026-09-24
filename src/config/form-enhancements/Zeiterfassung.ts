import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'berater',
    'projekt',
    'leistung',
    'datum',
    'stunden',
    'abrechenbar',
    'erfassungsmonat',
    'erfassungsjahr',
    'taetigkeit',
  ],
  defaults: {
    'datum': { kind: 'today' },
    'stunden': { kind: 'literal', value: 1 },
    'abrechenbar': { kind: 'literal', value: true },
  },
  computed: {
    '_arbeitswert': { op: 'mul', left: { kind: 'applookup', ownKey: 'berater', lookupKey: 'stundensatz' }, right: { kind: 'field', key: 'stunden' } },
  },
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
