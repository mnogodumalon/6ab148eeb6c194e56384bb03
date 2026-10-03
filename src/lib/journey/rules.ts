/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'kunden' | 'berater' | 'leistungskatalog' | 'projekte' | 'angebote' | 'zeiterfassung' | 'rechnungen';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "kunden": "kundenname" | "email" | "strasse" | "hausnummer" | "plz" | "ort" | "rechnungsstrasse" | "rechnungshausnummer" | "rechnungsplz" | "rechnungsort" | "ansprechpartner_titel" | "ansprechpartner_vorname" | "ansprechpartner_nachname" | "ansprechpartner_email" | "letzter_kontakt_ansprechpartner" | "notizen";
  "berater": "vorname" | "nachname" | "titel" | "strasse" | "hausnummer" | "plz" | "ort" | "email_beruflich" | "email_privat" | "sonstiges";
  "leistungskatalog": "leistungsname" | "beschreibung";
  "projekte": "projektkennung" | "ansprechpartner_kunde" | "letzter_schritt";
  "angebote": "dauer" | "beschreibung";
  "zeiterfassung": "taetigkeit";
  "rechnungen": "rechnungsnummer" | "notizen";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "kunden": never;
  "berater": "leistungen" | "zugewiesene_projekte";
  "leistungskatalog": "ausfuehrende_berater";
  "projekte": "kunde" | "projektleitung";
  "angebote": "projekt" | "berater";
  "zeiterfassung": "berater" | "projekt" | "leistung";
  "rechnungen": "kunde" | "projekt" | "berater" | "zeiterfassungseintraege";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it (`file` is upload-only, never via a journey). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "kunden": {
    "key": "kunden",
    "appId": "6ab148a7707af1b6affb4771",
    "label": "Kunden",
    "pascal": "Kunden",
    "single": "KundenEntry"
  },
  "berater": {
    "key": "berater",
    "appId": "6ab148ad9378ece97fb50ced",
    "label": "Berater",
    "pascal": "Berater",
    "single": "BeraterEntry"
  },
  "leistungskatalog": {
    "key": "leistungskatalog",
    "appId": "6ab148ae52ffb4b84f473863",
    "label": "Leistungskatalog",
    "pascal": "Leistungskatalog",
    "single": "LeistungskatalogEntry"
  },
  "projekte": {
    "key": "projekte",
    "appId": "6ab148af36b757073eb3183a",
    "label": "Projekte",
    "pascal": "Projekte",
    "single": "ProjekteEntry"
  },
  "angebote": {
    "key": "angebote",
    "appId": "6ab148b0d087ac36583e9ef7",
    "label": "Angebote",
    "pascal": "Angebote",
    "single": "AngeboteEntry"
  },
  "zeiterfassung": {
    "key": "zeiterfassung",
    "appId": "6ab148b0118a9fc527d51ebc",
    "label": "Zeiterfassung",
    "pascal": "Zeiterfassung",
    "single": "ZeiterfassungEntry"
  },
  "rechnungen": {
    "key": "rechnungen",
    "appId": "6ab148b15cf3a5b2b26d0873",
    "label": "Rechnungen",
    "pascal": "Rechnungen",
    "single": "RechnungenEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "kunden": {
    "kundenname": {
      "key": "kundenname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Name / Firmenname",
      "writable": true,
      "maxLength": 4000
    },
    "kundentyp": {
      "key": "kundentyp",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Kundentyp",
      "writable": true,
      "options": [
        "firma",
        "behoerde",
        "sonstiges",
        "einzelperson"
      ]
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": true,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "anlagedatum": {
      "key": "anlagedatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Anlagedatum",
      "writable": true
    },
    "strasse": {
      "key": "strasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Straße",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-line1"
    },
    "hausnummer": {
      "key": "hausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "plz": {
      "key": "plz",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Postleitzahl",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Ort",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "rechnungsadresse_gleich": {
      "key": "rechnungsadresse_gleich",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Rechnungsadresse ist identisch mit der Adresse",
      "writable": true
    },
    "rechnungsstrasse": {
      "key": "rechnungsstrasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rechnungsstraße",
      "writable": true,
      "maxLength": 4000
    },
    "rechnungshausnummer": {
      "key": "rechnungshausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rechnungs-Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "rechnungsplz": {
      "key": "rechnungsplz",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rechnungs-Postleitzahl",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "rechnungsort": {
      "key": "rechnungsort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rechnungsort",
      "writable": true,
      "maxLength": 4000
    },
    "ansprechpartner_titel": {
      "key": "ansprechpartner_titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Titel des Ansprechpartners",
      "writable": true,
      "maxLength": 4000
    },
    "ansprechpartner_vorname": {
      "key": "ansprechpartner_vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Vorname des Ansprechpartners",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "ansprechpartner_nachname": {
      "key": "ansprechpartner_nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Nachname des Ansprechpartners",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "ansprechpartner_email": {
      "key": "ansprechpartner_email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail des Ansprechpartners",
      "writable": true,
      "autoComplete": "email"
    },
    "bevorzugte_kontaktart": {
      "key": "bevorzugte_kontaktart",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Bevorzugte Kontaktart",
      "writable": true,
      "options": [
        "email",
        "telefon",
        "post",
        "persoenlich"
      ]
    },
    "letzter_kontakt_datum": {
      "key": "letzter_kontakt_datum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Datum des letzten Kontakts",
      "writable": true
    },
    "letzter_kontakt_ansprechpartner": {
      "key": "letzter_kontakt_ansprechpartner",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ansprechpartner beim letzten Kontakt",
      "writable": true,
      "maxLength": 4000
    },
    "notizen": {
      "key": "notizen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Notizen",
      "writable": true
    }
  },
  "berater": {
    "vorname": {
      "key": "vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "nachname": {
      "key": "nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "titel": {
      "key": "titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Titel (optional)",
      "writable": true,
      "maxLength": 4000
    },
    "strasse": {
      "key": "strasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Straße",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-line1"
    },
    "hausnummer": {
      "key": "hausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "plz": {
      "key": "plz",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Postleitzahl",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ort",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "email_beruflich": {
      "key": "email_beruflich",
      "fulltype": "string/email",
      "kind": "email",
      "required": true,
      "label": "E-Mail (beruflich)",
      "writable": true,
      "autoComplete": "email"
    },
    "email_privat": {
      "key": "email_privat",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail (privat)",
      "writable": true,
      "autoComplete": "email"
    },
    "einstiegsdatum": {
      "key": "einstiegsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Einstiegsdatum",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "aktiv",
        "urlaub",
        "elternzeit",
        "sonstiges"
      ]
    },
    "stundensatz": {
      "key": "stundensatz",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Stundensatz (€/h)",
      "writable": true,
      "format": "currency"
    },
    "stunden_aktueller_monat": {
      "key": "stunden_aktueller_monat",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – aktueller Monat",
      "writable": true
    },
    "stunden_aktuelles_quartal": {
      "key": "stunden_aktuelles_quartal",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – aktuelles Quartal",
      "writable": true
    },
    "stunden_aktuelles_jahr": {
      "key": "stunden_aktuelles_jahr",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – aktuelles Jahr",
      "writable": true
    },
    "stunden_letzter_monat": {
      "key": "stunden_letzter_monat",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – letzter Monat",
      "writable": true
    },
    "stunden_letztes_quartal": {
      "key": "stunden_letztes_quartal",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – letztes Quartal",
      "writable": true
    },
    "stunden_letztes_jahr": {
      "key": "stunden_letztes_jahr",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – letztes Jahr",
      "writable": true
    },
    "sonstiges": {
      "key": "sonstiges",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Sonstige Anmerkungen",
      "writable": true
    },
    "leistungen": {
      "key": "leistungen",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Zugeordnete Leistungen",
      "writable": true,
      "targetAppId": "6ab148ae52ffb4b84f473863",
      "targetEntity": "leistungskatalog"
    },
    "zugewiesene_projekte": {
      "key": "zugewiesene_projekte",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Aktuell zugewiesene Projekte",
      "writable": true,
      "targetAppId": "6ab148af36b757073eb3183a",
      "targetEntity": "projekte"
    }
  },
  "leistungskatalog": {
    "leistungsname": {
      "key": "leistungsname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Leistungsname",
      "writable": true,
      "maxLength": 4000
    },
    "leistungstyp": {
      "key": "leistungstyp",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Leistungstyp",
      "writable": true,
      "options": [
        "beratung",
        "entwicklung",
        "schulung",
        "support",
        "konzeption",
        "sonstiges"
      ]
    },
    "beschreibung": {
      "key": "beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung",
      "writable": true
    },
    "kostenvoranschlag": {
      "key": "kostenvoranschlag",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Normaler Kostenvoranschlag (€)",
      "writable": true,
      "format": "currency"
    },
    "einheit": {
      "key": "einheit",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Abrechnungseinheit",
      "writable": true,
      "options": [
        "pro_stunde",
        "pro_tag",
        "pauschal",
        "pro_monat"
      ]
    },
    "ausfuehrende_berater": {
      "key": "ausfuehrende_berater",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Ausführende Berater",
      "writable": true,
      "targetAppId": "6ab148ad9378ece97fb50ced",
      "targetEntity": "berater"
    }
  },
  "projekte": {
    "projektkennung": {
      "key": "projektkennung",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Projektkennung",
      "writable": true,
      "maxLength": 4000
    },
    "projektnummer": {
      "key": "projektnummer",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Projektnummer",
      "writable": true
    },
    "projektart": {
      "key": "projektart",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Projektart",
      "writable": true,
      "options": [
        "it_beratung",
        "entwicklung",
        "schulung",
        "konzeption",
        "support",
        "sonstiges"
      ]
    },
    "projektstatus": {
      "key": "projektstatus",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Projektstatus",
      "writable": true,
      "options": [
        "in_bearbeitung",
        "akquise",
        "abgeschlossen"
      ]
    },
    "projektstart_monat": {
      "key": "projektstart_monat",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Startmonat",
      "writable": true,
      "options": [
        "januar",
        "februar",
        "maerz",
        "april",
        "mai",
        "juni",
        "juli",
        "august",
        "september",
        "oktober",
        "november",
        "dezember"
      ]
    },
    "projektstart_jahr": {
      "key": "projektstart_jahr",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Startjahr",
      "writable": true
    },
    "kunde": {
      "key": "kunde",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Kunde",
      "writable": true,
      "targetAppId": "6ab148a7707af1b6affb4771",
      "targetEntity": "kunden"
    },
    "ansprechpartner_kunde": {
      "key": "ansprechpartner_kunde",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ansprechpartner beim Kunden",
      "writable": true,
      "maxLength": 4000
    },
    "letzter_schritt": {
      "key": "letzter_schritt",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Letzter Schritt / aktueller Stand",
      "writable": true
    },
    "projektleitung": {
      "key": "projektleitung",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Projektleitung",
      "writable": true,
      "targetAppId": "6ab148ad9378ece97fb50ced",
      "targetEntity": "berater"
    }
  },
  "angebote": {
    "angebotsnummer": {
      "key": "angebotsnummer",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Angebotsnummer",
      "writable": true
    },
    "angebotsjahr": {
      "key": "angebotsjahr",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Jahr",
      "writable": true
    },
    "angebotstyp": {
      "key": "angebotstyp",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Angebotstyp",
      "writable": true,
      "options": [
        "dienstleistungsangebot",
        "wartungsvertrag",
        "projektangebot",
        "rahmenvertrag",
        "sonstiges"
      ]
    },
    "angebotsstatus": {
      "key": "angebotsstatus",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Angebotsstatus",
      "writable": true,
      "options": [
        "entwurf",
        "versendet",
        "angenommen",
        "abgelehnt"
      ]
    },
    "zeitrahmen_anfang": {
      "key": "zeitrahmen_anfang",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Beginn",
      "writable": true
    },
    "zeitrahmen_ende": {
      "key": "zeitrahmen_ende",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Ende (optional)",
      "writable": true
    },
    "dauer": {
      "key": "dauer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Dauer",
      "writable": true,
      "maxLength": 4000
    },
    "kostentyp": {
      "key": "kostentyp",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Kostentyp",
      "writable": true,
      "options": [
        "einmalig",
        "monatlich",
        "jaehrlich",
        "quartalsweise",
        "sonstiges"
      ]
    },
    "kostenbetrag": {
      "key": "kostenbetrag",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Kostenbetrag (€)",
      "writable": true,
      "format": "currency"
    },
    "beschreibung": {
      "key": "beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung / Leistungsumfang",
      "writable": true
    },
    "anhang": {
      "key": "anhang",
      "fulltype": "file",
      "kind": "file",
      "required": false,
      "label": "Anhang (z. B. Angebots-Template)",
      "writable": false
    },
    "projekt": {
      "key": "projekt",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Zugewiesenes Projekt",
      "writable": true,
      "targetAppId": "6ab148af36b757073eb3183a",
      "targetEntity": "projekte"
    },
    "berater": {
      "key": "berater",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Zuständiger Berater",
      "writable": true,
      "targetAppId": "6ab148ad9378ece97fb50ced",
      "targetEntity": "berater"
    }
  },
  "zeiterfassung": {
    "berater": {
      "key": "berater",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Berater",
      "writable": true,
      "targetAppId": "6ab148ad9378ece97fb50ced",
      "targetEntity": "berater"
    },
    "projekt": {
      "key": "projekt",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Projekt",
      "writable": true,
      "targetAppId": "6ab148af36b757073eb3183a",
      "targetEntity": "projekte"
    },
    "leistung": {
      "key": "leistung",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Erbrachte Leistung",
      "writable": true,
      "targetAppId": "6ab148ae52ffb4b84f473863",
      "targetEntity": "leistungskatalog"
    },
    "datum": {
      "key": "datum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Datum",
      "writable": true
    },
    "stunden": {
      "key": "stunden",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Anzahl Stunden",
      "writable": true
    },
    "erfassungsmonat": {
      "key": "erfassungsmonat",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Abrechnungsmonat",
      "writable": true,
      "options": [
        "februar",
        "maerz",
        "april",
        "mai",
        "juni",
        "juli",
        "august",
        "september",
        "oktober",
        "november",
        "dezember",
        "januar"
      ]
    },
    "erfassungsjahr": {
      "key": "erfassungsjahr",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Abrechnungsjahr",
      "writable": true
    },
    "abrechenbar": {
      "key": "abrechenbar",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Abrechenbar",
      "writable": true
    },
    "taetigkeit": {
      "key": "taetigkeit",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Tätigkeitsbeschreibung",
      "writable": true
    }
  },
  "rechnungen": {
    "rechnungsnummer": {
      "key": "rechnungsnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Rechnungsnummer",
      "writable": true,
      "maxLength": 4000
    },
    "rechnungsdatum": {
      "key": "rechnungsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Rechnungsdatum",
      "writable": true
    },
    "faelligkeitsdatum": {
      "key": "faelligkeitsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Fälligkeitsdatum",
      "writable": true
    },
    "rechnungsstatus": {
      "key": "rechnungsstatus",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Rechnungsstatus",
      "writable": true,
      "options": [
        "entwurf",
        "versendet",
        "bezahlt",
        "ueberfaellig",
        "storniert"
      ]
    },
    "rechnungsmonat": {
      "key": "rechnungsmonat",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Abrechnungsmonat",
      "writable": true,
      "options": [
        "januar",
        "februar",
        "maerz",
        "april",
        "mai",
        "juni",
        "juli",
        "august",
        "september",
        "oktober",
        "november",
        "dezember"
      ]
    },
    "rechnungsjahr": {
      "key": "rechnungsjahr",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Abrechnungsjahr",
      "writable": true
    },
    "kunde": {
      "key": "kunde",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Kunde",
      "writable": true,
      "targetAppId": "6ab148a7707af1b6affb4771",
      "targetEntity": "kunden"
    },
    "nettobetrag": {
      "key": "nettobetrag",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Nettobetrag (€)",
      "writable": true,
      "format": "currency"
    },
    "mehrwertsteuer": {
      "key": "mehrwertsteuer",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Mehrwertsteuer (%)",
      "writable": true
    },
    "gesamtbetrag": {
      "key": "gesamtbetrag",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gesamtbetrag (€)",
      "writable": true,
      "format": "currency"
    },
    "notizen": {
      "key": "notizen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Notizen",
      "writable": true
    },
    "anhang": {
      "key": "anhang",
      "fulltype": "file",
      "kind": "file",
      "required": false,
      "label": "Rechnungsdokument (PDF)",
      "writable": false
    },
    "projekt": {
      "key": "projekt",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Projekt",
      "writable": true,
      "targetAppId": "6ab148af36b757073eb3183a",
      "targetEntity": "projekte"
    },
    "berater": {
      "key": "berater",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Beteiligte Berater",
      "writable": true,
      "targetAppId": "6ab148ad9378ece97fb50ced",
      "targetEntity": "berater"
    },
    "zeiterfassungseintraege": {
      "key": "zeiterfassungseintraege",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Zeiterfassungseinträge",
      "writable": true,
      "targetAppId": "6ab148b0118a9fc527d51ebc",
      "targetEntity": "zeiterfassung"
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "kunden": [
    {
      "kind": "choice",
      "field": "kundentyp",
      "count": 4
    },
    {
      "kind": "choice",
      "field": "bevorzugte_kontaktart",
      "count": 4
    }
  ],
  "berater": [
    {
      "kind": "choice",
      "field": "status",
      "count": 4
    },
    {
      "kind": "record",
      "field": "leistungen",
      "targetEntity": "leistungskatalog"
    },
    {
      "kind": "record",
      "field": "zugewiesene_projekte",
      "targetEntity": "projekte"
    }
  ],
  "leistungskatalog": [
    {
      "kind": "choice",
      "field": "leistungstyp",
      "count": 6
    },
    {
      "kind": "choice",
      "field": "einheit",
      "count": 4
    },
    {
      "kind": "record",
      "field": "ausfuehrende_berater",
      "targetEntity": "berater"
    }
  ],
  "projekte": [
    {
      "kind": "choice",
      "field": "projektart",
      "count": 6
    },
    {
      "kind": "choice",
      "field": "projektstatus",
      "count": 3
    },
    {
      "kind": "record",
      "field": "kunde",
      "targetEntity": "kunden"
    },
    {
      "kind": "record",
      "field": "projektleitung",
      "targetEntity": "berater"
    }
  ],
  "angebote": [
    {
      "kind": "choice",
      "field": "angebotstyp",
      "count": 5
    },
    {
      "kind": "choice",
      "field": "angebotsstatus",
      "count": 4
    },
    {
      "kind": "choice",
      "field": "kostentyp",
      "count": 5
    },
    {
      "kind": "record",
      "field": "projekt",
      "targetEntity": "projekte"
    },
    {
      "kind": "record",
      "field": "berater",
      "targetEntity": "berater"
    }
  ],
  "zeiterfassung": [
    {
      "kind": "record",
      "field": "berater",
      "targetEntity": "berater"
    },
    {
      "kind": "record",
      "field": "projekt",
      "targetEntity": "projekte"
    },
    {
      "kind": "record",
      "field": "leistung",
      "targetEntity": "leistungskatalog"
    }
  ],
  "rechnungen": [
    {
      "kind": "choice",
      "field": "rechnungsstatus",
      "count": 5
    },
    {
      "kind": "record",
      "field": "kunde",
      "targetEntity": "kunden"
    },
    {
      "kind": "record",
      "field": "projekt",
      "targetEntity": "projekte"
    },
    {
      "kind": "record",
      "field": "berater",
      "targetEntity": "berater"
    },
    {
      "kind": "record",
      "field": "zeiterfassungseintraege",
      "targetEntity": "zeiterfassung"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "kunden": [
    "kundenname"
  ],
  "berater": [
    "vorname",
    "nachname"
  ],
  "leistungskatalog": [
    "leistungsname"
  ],
  "projekte": [
    "projektkennung"
  ],
  "angebote": [
    "dauer"
  ],
  "zeiterfassung": [
    "taetigkeit"
  ],
  "rechnungen": [
    "rechnungsnummer"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
function displayPart(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
