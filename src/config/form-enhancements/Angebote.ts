// Auto-generated. Per-entity form-enhancements config for "Angebote".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["angebotsnummer", "angebotsjahr"], "cols": "2fr 1fr"}, "angebotstyp", "angebotsstatus", {"row": ["zeitrahmen_anfang", "zeitrahmen_ende"], "cols": "1fr 1fr"}, "dauer", {"row": ["kostentyp", "kostenbetrag"], "cols": "1fr 1fr"}, "projekt", "berater", "beschreibung"],
  defaults: {
    'zeitrahmen_anfang': { kind: 'today' },
    'angebotsstatus': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
  },
  computed: {
    '_angebot_dauer_tage': { kind: 'dateDiff', from: 'zeitrahmen_anfang', to: 'zeitrahmen_ende', unit: 'days' },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
