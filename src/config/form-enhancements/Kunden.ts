import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'kundenname',
    'kundentyp',
    'email',
    'anlagedatum',
    { row: ['strasse', 'hausnummer'], cols: '3fr 1fr' },
    { row: ['plz', 'ort'], cols: '1fr 2fr' },
    'rechnungsadresse_gleich',
    { row: ['rechnungsstrasse', 'rechnungshausnummer'], cols: '3fr 1fr' },
    { row: ['rechnungsplz', 'rechnungsort'], cols: '1fr 2fr' },
    'ansprechpartner_titel',
    { row: ['ansprechpartner_vorname', 'ansprechpartner_nachname'], cols: '1fr 1fr' },
    'ansprechpartner_email',
    'bevorzugte_kontaktart',
    'letzter_kontakt_datum',
    'letzter_kontakt_ansprechpartner',
    'notizen',
  ],
  defaults: {
    'anlagedatum': { kind: 'today' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
