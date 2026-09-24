// Auto-generated. Per-entity form-enhancements config for "Projekte".
// The sandbox sub-agent (Step 0) may overwrite this file with a richer config.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'projektkennung',
    'projektnummer',
    'projektart',
    'projektstatus',
    { row: ['projektstart_monat', 'projektstart_jahr'] },
    'kunde',
    'ansprechpartner_kunde',
    'projektleitung',
    'letzter_schritt',
  ],
  defaults: {
    projektstatus: { kind: 'lookup', key: 'in_bearbeitung', label: 'In Bearbeitung' },
    projektstart_jahr: { kind: 'currentYear' },
    projektart: { kind: 'lookup', key: 'konzeption', label: 'Konzeption' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
