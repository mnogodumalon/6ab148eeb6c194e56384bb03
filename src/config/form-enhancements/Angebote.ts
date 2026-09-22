import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'angebotsnummer',
    'angebotsjahr',
    'angebotstyp',
    'angebotsstatus',
    'zeitrahmen_anfang',
    'zeitrahmen_ende',
    'dauer',
    'kostentyp',
    'kostenbetrag',
    'beschreibung',
    'projekt',
    'berater',
  ],
  defaults: {
    'zeitrahmen_anfang': { kind: 'today' },
    'angebotstyp': { kind: 'lookup', key: 'projektangebot', label: 'Projektangebot' },
    'angebotsstatus': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
