// Auto-generated. Per-entity form-enhancements config for "Projekte".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["projektkennung", "projektnummer"], "cols": "2fr 1fr"}, {"row": ["projektart", "projektstatus"], "cols": "1fr 1fr"}, "kunde", "projektleitung", {"row": ["projektstart_monat", "projektstart_jahr"], "cols": "2fr 1fr"}, "ansprechpartner_kunde", "letzter_schritt"],
  defaults: {
    'projektstatus': { kind: 'lookup', key: 'akquise', label: 'Akquise' },
    'projektstart_jahr': { kind: 'currentYear' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
