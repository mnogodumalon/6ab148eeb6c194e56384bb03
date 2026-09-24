/**
 * Required-field messages — WRITTEN BY THE BUILD AGENT, never by a heuristic.
 *
 * The layer knows two things about an empty required field: that it is
 * required and what its label is. Out of that it can only say „„Anreise" ist
 * ein Pflichtfeld". What the person should do instead („Bitte einen Gast
 * auswählen.") is meaning, and meaning is the agent's: the Phase-2 orchestrator
 * writes one short instruction per required field — what is needed, not why — to
 * `.intents-staging/messages.json`, the integration step validates it against
 * the app metadata and renders it into the block below. Scaffold updates keep
 * the block. Do not edit outside the markers.
 *
 * Every door reads this and nothing else: `useStepForm` (flows and public
 * pages), the generated {Entity}Dialog and the public form's server-error line.
 * A field without a sentence falls back to the label sentence — never to a
 * bare „Dieses Feld ist erforderlich".
 *
 * Required fields per entity (from the base view):
 *   - kunden: kundenname (Name / Firmenname), kundentyp (Kundentyp), email (E-Mail), anlagedatum (Anlagedatum), strasse (Straße), hausnummer (Hausnummer), plz (Postleitzahl), ort (Ort)
 *   - berater: vorname (Vorname), nachname (Nachname), email_beruflich (E-Mail (beruflich)), status (Status)
 *   - leistungskatalog: leistungsname (Leistungsname), leistungstyp (Leistungstyp)
 *   - projekte: projektkennung (Projektkennung), projektnummer (Projektnummer), projektart (Projektart), projektstatus (Projektstatus), kunde (Kunde)
 *   - angebote: angebotsnummer (Angebotsnummer), angebotsjahr (Jahr), angebotstyp (Angebotstyp), zeitrahmen_anfang (Beginn)
 *   - zeiterfassung: berater (Berater), projekt (Projekt), datum (Datum), stunden (Anzahl Stunden)
 *   - rechnungen: rechnungsnummer (Rechnungsnummer), rechnungsdatum (Rechnungsdatum), kunde (Kunde), projekt (Projekt)
 */
import { t, tx } from '@/i18n';
import { labelOf, type EntityKey } from './rules';

/** The writable fields of each entity — the keys a message may address (generated). */
export interface MessageFields {
  "kunden": "kundenname" | "kundentyp" | "email" | "anlagedatum" | "strasse" | "hausnummer" | "plz" | "ort" | "rechnungsadresse_gleich" | "rechnungsstrasse" | "rechnungshausnummer" | "rechnungsplz" | "rechnungsort" | "ansprechpartner_titel" | "ansprechpartner_vorname" | "ansprechpartner_nachname" | "ansprechpartner_email" | "bevorzugte_kontaktart" | "letzter_kontakt_datum" | "letzter_kontakt_ansprechpartner" | "notizen";
  "berater": "vorname" | "nachname" | "titel" | "strasse" | "hausnummer" | "plz" | "ort" | "email_beruflich" | "email_privat" | "einstiegsdatum" | "status" | "stundensatz" | "stunden_aktueller_monat" | "stunden_aktuelles_quartal" | "stunden_aktuelles_jahr" | "stunden_letzter_monat" | "stunden_letztes_quartal" | "stunden_letztes_jahr" | "sonstiges" | "leistungen" | "zugewiesene_projekte";
  "leistungskatalog": "leistungsname" | "leistungstyp" | "beschreibung" | "kostenvoranschlag" | "einheit" | "ausfuehrende_berater";
  "projekte": "projektkennung" | "projektnummer" | "projektart" | "projektstatus" | "projektstart_monat" | "projektstart_jahr" | "kunde" | "ansprechpartner_kunde" | "letzter_schritt" | "projektleitung";
  "angebote": "angebotsnummer" | "angebotsjahr" | "angebotstyp" | "angebotsstatus" | "zeitrahmen_anfang" | "zeitrahmen_ende" | "dauer" | "kostentyp" | "kostenbetrag" | "beschreibung" | "projekt" | "berater";
  "zeiterfassung": "berater" | "projekt" | "leistung" | "datum" | "stunden" | "erfassungsmonat" | "erfassungsjahr" | "abrechenbar" | "taetigkeit";
  "rechnungen": "rechnungsnummer" | "rechnungsdatum" | "faelligkeitsdatum" | "rechnungsstatus" | "rechnungsmonat" | "rechnungsjahr" | "kunde" | "nettobetrag" | "mehrwertsteuer" | "gesamtbetrag" | "notizen" | "projekt" | "berater" | "zeiterfassungseintraege";
}
export type MessageFieldKey<E extends EntityKey> = E extends keyof MessageFields ? MessageFields[E] : never;

export const REQUIRED_MESSAGES: { [E in EntityKey]?: Partial<Record<MessageFieldKey<E>, string>> } = {
  // <custom:messages>
  kunden: { kundenname: "Bitte den Namen oder Firmennamen eingeben.", kundentyp: "Bitte den Kundentyp auswählen.", email: "Bitte die E-Mail-Adresse eingeben.", anlagedatum: "Bitte das Anlagedatum angeben.", strasse: "Bitte die Straße eingeben.", hausnummer: "Bitte die Hausnummer eingeben.", plz: "Bitte die Postleitzahl eingeben.", ort: "Bitte den Ort eingeben." },
  berater: { vorname: "Bitte den Vornamen eingeben.", nachname: "Bitte den Nachnamen eingeben.", email_beruflich: "Bitte die berufliche E-Mail-Adresse eingeben.", status: "Bitte den Status auswählen." },
  leistungskatalog: { leistungsname: "Bitte den Leistungsnamen eingeben.", leistungstyp: "Bitte den Leistungstyp auswählen." },
  projekte: { projektkennung: "Bitte die Projektkennung eingeben.", projektart: "Bitte die Projektart auswählen.", projektstatus: "Bitte den Projektstatus auswählen.", kunde: "Bitte einen Kunden auswählen." },
  angebote: { angebotsnummer: "Bitte die Angebotsnummer eingeben.", angebotsjahr: "Bitte das Jahr des Angebots eingeben.", angebotstyp: "Bitte den Angebotstyp auswählen.", zeitrahmen_anfang: "Bitte das Beginndatum angeben." },
  zeiterfassung: { berater: "Bitte einen Berater auswählen.", projekt: "Bitte ein Projekt auswählen.", datum: "Bitte das Datum des Eintrags angeben.", stunden: "Bitte die Anzahl der Stunden eingeben." },
  rechnungen: { rechnungsnummer: "Bitte die Rechnungsnummer eingeben.", rechnungsdatum: "Bitte das Rechnungsdatum angeben.", kunde: "Bitte einen Kunden auswählen.", projekt: "Bitte ein Projekt auswählen.", nettobetrag: "Bitte den Nettobetrag eingeben.", mehrwertsteuer: "Bitte den Mehrwertsteuerbetrag eingeben." },
  // </custom:messages>
};

/** The sentence shown when `key` of `entity` is required and empty — the
 *  agent's own text (translated at runtime like every page string), else the
 *  label sentence. Call it while rendering, not at module scope. */
export function requiredMessage(entity: EntityKey, key: string): string {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  if (own && own.trim()) return tx(own);
  return t('v_required', { label: labelOf(entity, key) });
}

/** True when the agent wrote a sentence for the field. */
export function hasOwnMessage(entity: EntityKey, key: string): boolean {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  return Boolean(own && own.trim());
}
