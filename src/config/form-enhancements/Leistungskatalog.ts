// Auto-generated. Per-entity form-enhancements config for "Leistungskatalog".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["leistungsname", "leistungstyp", {"row": ["kostenvoranschlag", "einheit"], "cols": "1fr 1fr"}, "ausfuehrende_berater", "beschreibung"],
  defaults: {},
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
