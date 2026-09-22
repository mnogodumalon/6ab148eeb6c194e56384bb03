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
    'projekt',
    'berater',
    'beschreibung',
  ],
  defaults: {
    'angebotstyp': { kind: 'lookup', key: 'dienstleistungsangebot', label: 'Dienstleistungsangebot' },
    'angebotsstatus': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
    'zeitrahmen_anfang': { kind: 'today' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
