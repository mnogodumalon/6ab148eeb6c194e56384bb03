// Auto-generated. Per-entity form-enhancements config for "Kunden".
// The sandbox sub-agent (Step 0) may overwrite this file with a richer config.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'kundenname',
    'kundentyp',
    'email',
    'anlagedatum',
    { row: ['strasse', 'hausnummer'], cols: '2fr 1fr' },
    { row: ['plz', 'ort'], cols: '1fr 2fr' },
    'rechnungsadresse_gleich',
    { row: ['rechnungsstrasse', 'rechnungshausnummer'], cols: '2fr 1fr' },
    { row: ['rechnungsplz', 'rechnungsort'], cols: '1fr 2fr' },
    'ansprechpartner_titel',
    { row: ['ansprechpartner_vorname', 'ansprechpartner_nachname'] },
    'ansprechpartner_email',
    'bevorzugte_kontaktart',
    'letzter_kontakt_datum',
    'letzter_kontakt_ansprechpartner',
    'notizen',
  ],
  defaults: {
    anlagedatum: { kind: 'today' },
    kundentyp: { kind: 'lookup', key: 'firma', label: 'Firma' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
