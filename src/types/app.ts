import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Kunden {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kundenname?: string;
    kundentyp?: LookupValue;
    email?: string;
    anlagedatum?: string; // Format: YYYY-MM-DD oder ISO String
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    rechnungsadresse_gleich?: boolean;
    rechnungsstrasse?: string;
    rechnungshausnummer?: string;
    rechnungsplz?: string;
    rechnungsort?: string;
    ansprechpartner_titel?: string;
    ansprechpartner_vorname?: string;
    ansprechpartner_nachname?: string;
    ansprechpartner_email?: string;
    bevorzugte_kontaktart?: LookupValue;
    letzter_kontakt_datum?: string; // Format: YYYY-MM-DD oder ISO String
    letzter_kontakt_ansprechpartner?: string;
    notizen?: string;
  };
}

export interface Berater {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    titel?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    email_beruflich?: string;
    email_privat?: string;
    einstiegsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    stundensatz?: number;
    stunden_aktueller_monat?: number;
    stunden_aktuelles_quartal?: number;
    stunden_aktuelles_jahr?: number;
    stunden_letzter_monat?: number;
    stunden_letztes_quartal?: number;
    stunden_letztes_jahr?: number;
    sonstiges?: string;
    leistungen?: RecordUrl[];
    zugewiesene_projekte?: RecordUrl[];
  };
}

export interface Leistungskatalog {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    leistungsname?: string;
    leistungstyp?: LookupValue;
    beschreibung?: string;
    kostenvoranschlag?: number;
    einheit?: LookupValue;
    ausfuehrende_berater?: RecordUrl[];
  };
}

export interface Projekte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    projektkennung?: string;
    projektnummer?: number;
    projektart?: LookupValue;
    projektstatus?: LookupValue;
    projektstart_monat?: LookupValue;
    projektstart_jahr?: number;
    kunde?: RecordUrl; // applookup -> URL zu 'Kunden' Record
    ansprechpartner_kunde?: string;
    letzter_schritt?: string;
    projektleitung?: RecordUrl; // applookup -> URL zu 'Berater' Record
  };
}

export interface Angebote {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    angebotsnummer?: number;
    angebotsjahr?: number;
    angebotstyp?: LookupValue;
    angebotsstatus?: LookupValue;
    zeitrahmen_anfang?: string; // Format: YYYY-MM-DD oder ISO String
    zeitrahmen_ende?: string; // Format: YYYY-MM-DD oder ISO String
    dauer?: string;
    kostentyp?: LookupValue;
    kostenbetrag?: number;
    beschreibung?: string;
    anhang?: string;
    projekt?: RecordUrl; // applookup -> URL zu 'Projekte' Record
    berater?: RecordUrl; // applookup -> URL zu 'Berater' Record
  };
}

export interface Zeiterfassung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    berater?: RecordUrl; // applookup -> URL zu 'Berater' Record
    projekt?: RecordUrl; // applookup -> URL zu 'Projekte' Record
    leistung?: RecordUrl; // applookup -> URL zu 'Leistungskatalog' Record
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    stunden?: number;
    erfassungsmonat?: LookupValue;
    erfassungsjahr?: number;
    abrechenbar?: boolean;
    taetigkeit?: string;
  };
}

export interface Rechnungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    rechnungsnummer?: string;
    rechnungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    faelligkeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    rechnungsstatus?: LookupValue;
    rechnungsmonat?: LookupValue;
    rechnungsjahr?: number;
    kunde?: RecordUrl; // applookup -> URL zu 'Kunden' Record
    nettobetrag?: number;
    mehrwertsteuer?: number;
    gesamtbetrag?: number;
    notizen?: string;
    anhang?: string;
    projekt?: RecordUrl; // applookup -> URL zu 'Projekte' Record
    berater?: RecordUrl[];
    zeiterfassungseintraege?: RecordUrl[];
  };
}

export const APP_IDS = {
  KUNDEN: '6ab148a7707af1b6affb4771',
  BERATER: '6ab148ad9378ece97fb50ced',
  LEISTUNGSKATALOG: '6ab148ae52ffb4b84f473863',
  PROJEKTE: '6ab148af36b757073eb3183a',
  ANGEBOTE: '6ab148b0d087ac36583e9ef7',
  ZEITERFASSUNG: '6ab148b0118a9fc527d51ebc',
  RECHNUNGEN: '6ab148b15cf3a5b2b26d0873',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'kunden': {
    kundentyp: [{ key: "firma", get label() { return lookupLabel('kunden', 'kundentyp', "firma") ?? "Firma"; } }, { key: "behoerde", get label() { return lookupLabel('kunden', 'kundentyp', "behoerde") ?? "Behörde"; } }, { key: "sonstiges", get label() { return lookupLabel('kunden', 'kundentyp', "sonstiges") ?? "Sonstiges"; } }, { key: "einzelperson", get label() { return lookupLabel('kunden', 'kundentyp', "einzelperson") ?? "Einzelperson"; } }],
    bevorzugte_kontaktart: [{ key: "email", get label() { return lookupLabel('kunden', 'bevorzugte_kontaktart', "email") ?? "E-Mail"; } }, { key: "telefon", get label() { return lookupLabel('kunden', 'bevorzugte_kontaktart', "telefon") ?? "Telefon"; } }, { key: "post", get label() { return lookupLabel('kunden', 'bevorzugte_kontaktart', "post") ?? "Post"; } }, { key: "persoenlich", get label() { return lookupLabel('kunden', 'bevorzugte_kontaktart', "persoenlich") ?? "Persönlich"; } }],
  },
  'berater': {
    status: [{ key: "aktiv", get label() { return lookupLabel('berater', 'status', "aktiv") ?? "Aktiv"; } }, { key: "urlaub", get label() { return lookupLabel('berater', 'status', "urlaub") ?? "Urlaub"; } }, { key: "elternzeit", get label() { return lookupLabel('berater', 'status', "elternzeit") ?? "Elternzeit"; } }, { key: "sonstiges", get label() { return lookupLabel('berater', 'status', "sonstiges") ?? "Sonstiges"; } }],
  },
  'leistungskatalog': {
    leistungstyp: [{ key: "beratung", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "beratung") ?? "Beratung"; } }, { key: "entwicklung", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "entwicklung") ?? "Entwicklung"; } }, { key: "schulung", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "schulung") ?? "Schulung"; } }, { key: "support", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "support") ?? "Support"; } }, { key: "konzeption", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "konzeption") ?? "Konzeption"; } }, { key: "sonstiges", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "sonstiges") ?? "Sonstiges"; } }],
    einheit: [{ key: "pro_stunde", get label() { return lookupLabel('leistungskatalog', 'einheit', "pro_stunde") ?? "pro Stunde"; } }, { key: "pro_tag", get label() { return lookupLabel('leistungskatalog', 'einheit', "pro_tag") ?? "pro Tag"; } }, { key: "pauschal", get label() { return lookupLabel('leistungskatalog', 'einheit', "pauschal") ?? "pauschal"; } }, { key: "pro_monat", get label() { return lookupLabel('leistungskatalog', 'einheit', "pro_monat") ?? "pro Monat"; } }],
  },
  'projekte': {
    projektart: [{ key: "it_beratung", get label() { return lookupLabel('projekte', 'projektart', "it_beratung") ?? "IT-Beratung"; } }, { key: "entwicklung", get label() { return lookupLabel('projekte', 'projektart', "entwicklung") ?? "Entwicklung"; } }, { key: "schulung", get label() { return lookupLabel('projekte', 'projektart', "schulung") ?? "Schulung"; } }, { key: "konzeption", get label() { return lookupLabel('projekte', 'projektart', "konzeption") ?? "Konzeption"; } }, { key: "support", get label() { return lookupLabel('projekte', 'projektart', "support") ?? "Support"; } }, { key: "sonstiges", get label() { return lookupLabel('projekte', 'projektart', "sonstiges") ?? "Sonstiges"; } }],
    projektstatus: [{ key: "in_bearbeitung", get label() { return lookupLabel('projekte', 'projektstatus', "in_bearbeitung") ?? "In Bearbeitung"; } }, { key: "akquise", get label() { return lookupLabel('projekte', 'projektstatus', "akquise") ?? "Akquise"; } }, { key: "abgeschlossen", get label() { return lookupLabel('projekte', 'projektstatus', "abgeschlossen") ?? "Abgeschlossen"; } }],
    projektstart_monat: [{ key: "januar", get label() { return lookupLabel('projekte', 'projektstart_monat', "januar") ?? "Januar"; } }, { key: "februar", get label() { return lookupLabel('projekte', 'projektstart_monat', "februar") ?? "Februar"; } }, { key: "maerz", get label() { return lookupLabel('projekte', 'projektstart_monat', "maerz") ?? "März"; } }, { key: "april", get label() { return lookupLabel('projekte', 'projektstart_monat', "april") ?? "April"; } }, { key: "mai", get label() { return lookupLabel('projekte', 'projektstart_monat', "mai") ?? "Mai"; } }, { key: "juni", get label() { return lookupLabel('projekte', 'projektstart_monat', "juni") ?? "Juni"; } }, { key: "juli", get label() { return lookupLabel('projekte', 'projektstart_monat', "juli") ?? "Juli"; } }, { key: "august", get label() { return lookupLabel('projekte', 'projektstart_monat', "august") ?? "August"; } }, { key: "september", get label() { return lookupLabel('projekte', 'projektstart_monat', "september") ?? "September"; } }, { key: "oktober", get label() { return lookupLabel('projekte', 'projektstart_monat', "oktober") ?? "Oktober"; } }, { key: "november", get label() { return lookupLabel('projekte', 'projektstart_monat', "november") ?? "November"; } }, { key: "dezember", get label() { return lookupLabel('projekte', 'projektstart_monat', "dezember") ?? "Dezember"; } }],
  },
  'angebote': {
    angebotstyp: [{ key: "dienstleistungsangebot", get label() { return lookupLabel('angebote', 'angebotstyp', "dienstleistungsangebot") ?? "Dienstleistungsangebot"; } }, { key: "wartungsvertrag", get label() { return lookupLabel('angebote', 'angebotstyp', "wartungsvertrag") ?? "Wartungsvertrag"; } }, { key: "projektangebot", get label() { return lookupLabel('angebote', 'angebotstyp', "projektangebot") ?? "Projektangebot"; } }, { key: "rahmenvertrag", get label() { return lookupLabel('angebote', 'angebotstyp', "rahmenvertrag") ?? "Rahmenvertrag"; } }, { key: "sonstiges", get label() { return lookupLabel('angebote', 'angebotstyp', "sonstiges") ?? "Sonstiges"; } }],
    angebotsstatus: [{ key: "entwurf", get label() { return lookupLabel('angebote', 'angebotsstatus', "entwurf") ?? "Entwurf"; } }, { key: "versendet", get label() { return lookupLabel('angebote', 'angebotsstatus', "versendet") ?? "Versendet"; } }, { key: "angenommen", get label() { return lookupLabel('angebote', 'angebotsstatus', "angenommen") ?? "Angenommen"; } }, { key: "abgelehnt", get label() { return lookupLabel('angebote', 'angebotsstatus', "abgelehnt") ?? "Abgelehnt"; } }],
    kostentyp: [{ key: "einmalig", get label() { return lookupLabel('angebote', 'kostentyp', "einmalig") ?? "Einmalig"; } }, { key: "monatlich", get label() { return lookupLabel('angebote', 'kostentyp', "monatlich") ?? "Monatlich"; } }, { key: "jaehrlich", get label() { return lookupLabel('angebote', 'kostentyp', "jaehrlich") ?? "Jährlich"; } }, { key: "quartalsweise", get label() { return lookupLabel('angebote', 'kostentyp', "quartalsweise") ?? "Quartalsweise"; } }, { key: "sonstiges", get label() { return lookupLabel('angebote', 'kostentyp', "sonstiges") ?? "Sonstiges"; } }],
  },
  'zeiterfassung': {
    erfassungsmonat: [{ key: "februar", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "februar") ?? "Februar"; } }, { key: "maerz", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "maerz") ?? "März"; } }, { key: "april", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "april") ?? "April"; } }, { key: "mai", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "mai") ?? "Mai"; } }, { key: "juni", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "juni") ?? "Juni"; } }, { key: "juli", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "juli") ?? "Juli"; } }, { key: "august", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "august") ?? "August"; } }, { key: "september", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "september") ?? "September"; } }, { key: "oktober", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "oktober") ?? "Oktober"; } }, { key: "november", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "november") ?? "November"; } }, { key: "dezember", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "dezember") ?? "Dezember"; } }, { key: "januar", get label() { return lookupLabel('zeiterfassung', 'erfassungsmonat', "januar") ?? "Januar"; } }],
  },
  'rechnungen': {
    rechnungsstatus: [{ key: "entwurf", get label() { return lookupLabel('rechnungen', 'rechnungsstatus', "entwurf") ?? "Entwurf"; } }, { key: "versendet", get label() { return lookupLabel('rechnungen', 'rechnungsstatus', "versendet") ?? "Versendet"; } }, { key: "bezahlt", get label() { return lookupLabel('rechnungen', 'rechnungsstatus', "bezahlt") ?? "Bezahlt"; } }, { key: "ueberfaellig", get label() { return lookupLabel('rechnungen', 'rechnungsstatus', "ueberfaellig") ?? "Überfällig"; } }, { key: "storniert", get label() { return lookupLabel('rechnungen', 'rechnungsstatus', "storniert") ?? "Storniert"; } }],
    rechnungsmonat: [{ key: "januar", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "januar") ?? "Januar"; } }, { key: "februar", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "februar") ?? "Februar"; } }, { key: "maerz", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "maerz") ?? "März"; } }, { key: "april", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "april") ?? "April"; } }, { key: "mai", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "mai") ?? "Mai"; } }, { key: "juni", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "juni") ?? "Juni"; } }, { key: "juli", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "juli") ?? "Juli"; } }, { key: "august", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "august") ?? "August"; } }, { key: "september", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "september") ?? "September"; } }, { key: "oktober", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "oktober") ?? "Oktober"; } }, { key: "november", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "november") ?? "November"; } }, { key: "dezember", get label() { return lookupLabel('rechnungen', 'rechnungsmonat', "dezember") ?? "Dezember"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kunden': {
    'kundenname': 'string/text',
    'kundentyp': 'lookup/select',
    'email': 'string/email',
    'anlagedatum': 'date/date',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'rechnungsadresse_gleich': 'bool',
    'rechnungsstrasse': 'string/text',
    'rechnungshausnummer': 'string/text',
    'rechnungsplz': 'string/text',
    'rechnungsort': 'string/text',
    'ansprechpartner_titel': 'string/text',
    'ansprechpartner_vorname': 'string/text',
    'ansprechpartner_nachname': 'string/text',
    'ansprechpartner_email': 'string/email',
    'bevorzugte_kontaktart': 'lookup/select',
    'letzter_kontakt_datum': 'date/date',
    'letzter_kontakt_ansprechpartner': 'string/text',
    'notizen': 'string/textarea',
  },
  'berater': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'titel': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'email_beruflich': 'string/email',
    'email_privat': 'string/email',
    'einstiegsdatum': 'date/date',
    'status': 'lookup/select',
    'stundensatz': 'number',
    'stunden_aktueller_monat': 'number',
    'stunden_aktuelles_quartal': 'number',
    'stunden_aktuelles_jahr': 'number',
    'stunden_letzter_monat': 'number',
    'stunden_letztes_quartal': 'number',
    'stunden_letztes_jahr': 'number',
    'sonstiges': 'string/textarea',
    'leistungen': 'multipleapplookup/select',
    'zugewiesene_projekte': 'multipleapplookup/select',
  },
  'leistungskatalog': {
    'leistungsname': 'string/text',
    'leistungstyp': 'lookup/select',
    'beschreibung': 'string/textarea',
    'kostenvoranschlag': 'number',
    'einheit': 'lookup/select',
    'ausfuehrende_berater': 'multipleapplookup/select',
  },
  'projekte': {
    'projektkennung': 'string/text',
    'projektnummer': 'number',
    'projektart': 'lookup/select',
    'projektstatus': 'lookup/select',
    'projektstart_monat': 'lookup/select',
    'projektstart_jahr': 'number',
    'kunde': 'applookup/select',
    'ansprechpartner_kunde': 'string/text',
    'letzter_schritt': 'string/textarea',
    'projektleitung': 'applookup/select',
  },
  'angebote': {
    'angebotsnummer': 'number',
    'angebotsjahr': 'number',
    'angebotstyp': 'lookup/select',
    'angebotsstatus': 'lookup/select',
    'zeitrahmen_anfang': 'date/date',
    'zeitrahmen_ende': 'date/date',
    'dauer': 'string/text',
    'kostentyp': 'lookup/select',
    'kostenbetrag': 'number',
    'beschreibung': 'string/textarea',
    'anhang': 'file',
    'projekt': 'applookup/select',
    'berater': 'applookup/select',
  },
  'zeiterfassung': {
    'berater': 'applookup/select',
    'projekt': 'applookup/select',
    'leistung': 'applookup/select',
    'datum': 'date/date',
    'stunden': 'number',
    'erfassungsmonat': 'lookup/select',
    'erfassungsjahr': 'number',
    'abrechenbar': 'bool',
    'taetigkeit': 'string/textarea',
  },
  'rechnungen': {
    'rechnungsnummer': 'string/text',
    'rechnungsdatum': 'date/date',
    'faelligkeitsdatum': 'date/date',
    'rechnungsstatus': 'lookup/select',
    'rechnungsmonat': 'lookup/select',
    'rechnungsjahr': 'number',
    'kunde': 'applookup/select',
    'nettobetrag': 'number',
    'mehrwertsteuer': 'number',
    'gesamtbetrag': 'number',
    'notizen': 'string/textarea',
    'anhang': 'file',
    'projekt': 'applookup/select',
    'berater': 'multipleapplookup/select',
    'zeiterfassungseintraege': 'multipleapplookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
  'berater': [
    { field: 'ausfuehrende_berater', entity: 'leistungskatalog' },
    { field: 'projektleitung', entity: 'projekte' },
    { field: 'berater', entity: 'angebote' },
    { field: 'berater', entity: 'zeiterfassung' },
    { field: 'berater', entity: 'rechnungen' },
  ],
  'projekte': [
    { field: 'zugewiesene_projekte', entity: 'berater' },
    { field: 'projekt', entity: 'angebote' },
    { field: 'projekt', entity: 'zeiterfassung' },
    { field: 'projekt', entity: 'rechnungen' },
  ],
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKunden = StripLookup<Kunden['fields']>;
export type CreateBerater = StripLookup<Berater['fields']>;
export type CreateLeistungskatalog = StripLookup<Leistungskatalog['fields']>;
export type CreateProjekte = StripLookup<Projekte['fields']>;
export type CreateAngebote = StripLookup<Angebote['fields']>;
export type CreateZeiterfassung = StripLookup<Zeiterfassung['fields']>;
export type CreateRechnungen = StripLookup<Rechnungen['fields']>;