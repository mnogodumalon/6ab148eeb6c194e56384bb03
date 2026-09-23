import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'berater',
    'projekt',
    'leistung',
    'datum',
    'stunden',
    'erfassungsmonat',
    'erfassungsjahr',
    'abrechenbar',
    'taetigkeit',
  ],
  defaults: {
    'datum': { kind: 'today' },
    'erfassungsjahr': { kind: 'currentYear' },
    'stunden': { kind: 'literal', value: 8 },
    'abrechenbar': { kind: 'literal', value: true },
  },
  computed: {
    '_arbeitskosten': { op: 'mul', left: { kind: 'applookup', ownKey: 'berater', lookupKey: 'stundensatz' }, right: { kind: 'field', key: 'stunden' } },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
