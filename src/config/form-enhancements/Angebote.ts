// Auto-generated. Per-entity form-enhancements config for "Angebote".
// The sandbox sub-agent (Step 0) may overwrite this file with a richer config.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'angebotsnummer',
    'angebotsjahr',
    'angebotstyp',
    'angebotsstatus',
    { row: ['zeitrahmen_anfang', 'zeitrahmen_ende'] },
    'dauer',
    'kostentyp',
    'kostenbetrag',
    'beschreibung',
    'projekt',
    'berater',
  ],
  defaults: {
    zeitrahmen_anfang: { kind: 'today' },
    zeitrahmen_ende: { kind: 'todayOffset', days: 7 },
    angebotstyp: { kind: 'lookup', key: 'projektangebot', label: 'Projektangebot' },
    angebotsstatus: { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
    kostentyp: { kind: 'lookup', key: 'einmalig', label: 'Einmalig' },
  },
  computed: {
    'dauer': { kind: 'dateDiff', from: 'zeitrahmen_anfang', to: 'zeitrahmen_ende', unit: 'days' },
    '_angebot_dauer_tage': { kind: 'dateDiff', from: 'zeitrahmen_anfang', to: 'zeitrahmen_ende', unit: 'days' },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
