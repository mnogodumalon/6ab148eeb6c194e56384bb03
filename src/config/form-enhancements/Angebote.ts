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
    'angebotstyp': { kind: 'lookup', key: 'dienstleistungsangebot', label: 'Dienstleistungsangebot' },
    'angebotsstatus': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
    'zeitrahmen_anfang': { kind: 'today' },
    'zeitrahmen_ende': { kind: 'todayOffset', days: 7 },
    'kostentyp': { kind: 'lookup', key: 'einmalig', label: 'Einmalig' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
