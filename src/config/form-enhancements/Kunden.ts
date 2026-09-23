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
    'kundentyp': { kind: 'lookup', key: 'firma', label: 'Firma' },
    'anlagedatum': { kind: 'today' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
