// Auto-generated. Per-entity form-enhancements config for "Berater".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["vorname", "nachname"], "cols": "1fr 1fr"}, "titel", "email_beruflich", "email_privat", "status", {"row": ["strasse", "hausnummer"], "cols": "2fr 1fr"}, {"row": ["plz", "ort"], "cols": "1fr 2fr"}, "einstiegsdatum", "stundensatz", {"row": ["stunden_aktueller_monat", "stunden_letzter_monat"], "cols": "1fr 1fr"}, {"row": ["stunden_aktuelles_quartal", "stunden_letztes_quartal"], "cols": "1fr 1fr"}, {"row": ["stunden_aktuelles_jahr", "stunden_letztes_jahr"], "cols": "1fr 1fr"}, "leistungen", "zugewiesene_projekte", "sonstiges"],
  defaults: {
    'einstiegsdatum': { kind: 'today' },
    'status': { kind: 'lookup', key: 'aktiv', label: 'Aktiv' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
