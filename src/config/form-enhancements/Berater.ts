import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    { row: ['vorname', 'nachname'], cols: '1fr 1fr' },
    'titel',
    { row: ['strasse', 'hausnummer'], cols: '2fr 1fr' },
    { row: ['plz', 'ort'], cols: '1fr 2fr' },
    'email_beruflich',
    'email_privat',
    'einstiegsdatum',
    'status',
    'stundensatz',
    'stunden_aktueller_monat',
    'stunden_aktuelles_quartal',
    'stunden_aktuelles_jahr',
    'stunden_letzter_monat',
    'stunden_letztes_quartal',
    'stunden_letztes_jahr',
    'sonstiges',
    'leistungen',
    'zugewiesene_projekte',
  ],
  defaults: {
    'einstiegsdatum': { kind: 'today' },
    'status': { kind: 'lookup', key: 'aktiv', label: 'Aktiv' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
