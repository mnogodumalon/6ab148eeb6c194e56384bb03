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
    'projekt',
    'berater',
    'beschreibung',
  ],
  defaults: {
    'angebotsjahr': { kind: 'currentYear' },
    'angebotstyp': { kind: 'lookup', key: 'projektangebot', label: 'Projektangebot' },
    'angebotsstatus': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
    'zeitrahmen_anfang': { kind: 'today' },
    'zeitrahmen_ende': { kind: 'todayOffset', days: 14 },
  },
  computed: {
    '_dauer_tage': { kind: 'dateDiff', from: 'zeitrahmen_anfang', to: 'zeitrahmen_ende', unit: 'days' },
  },
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
