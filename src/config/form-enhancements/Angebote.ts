import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'angebotsnummer',
    'angebotsjahr',
    'angebotstyp',
    'angebotsstatus',
    { row: ['zeitrahmen_anfang', 'zeitrahmen_ende'], cols: '1fr 1fr' },
    'dauer',
    'kostentyp',
    'kostenbetrag',
    'beschreibung',
    'projekt',
    'berater',
  ],
  defaults: {
    'zeitrahmen_anfang': { kind: 'today' },
    'zeitrahmen_ende': { kind: 'todayOffset', days: 14 },
    'angebotstyp': { kind: 'lookup', key: 'dienstleistungsangebot', label: 'Dienstleistungsangebot' },
    'angebotsstatus': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
