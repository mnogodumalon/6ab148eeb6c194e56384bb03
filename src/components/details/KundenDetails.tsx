import type { Kunden, Projekte, Rechnungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface KundenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kunden;
  /** 1:N „Projekte" (kunde): VOLLE Liste — der Block filtert auf diesen Record. */
  projekteList: Projekte[];
  /** Zeilen-Klick → overlay.push auf das Projekte-Detail (nie der Edit-Dialog). */
  onOpenProjekte: (record: Projekte) => void;
  /** Kontextuelles „+": öffnet den Projekte-Dialog mit diesem Record vorgesetzt. */
  onAddProjekte: () => void;
  /** 1:N „Rechnungen" (kunde): VOLLE Liste — der Block filtert auf diesen Record. */
  rechnungenList: Rechnungen[];
  /** Zeilen-Klick → overlay.push auf das Rechnungen-Detail (nie der Edit-Dialog). */
  onOpenRechnungen: (record: Rechnungen) => void;
  /** Kontextuelles „+": öffnet den Rechnungen-Dialog mit diesem Record vorgesetzt. */
  onAddRechnungen: () => void;
}

export function KundenDetails({
  record,
  projekteList,
  onOpenProjekte,
  onAddProjekte,
  rechnungenList,
  onOpenRechnungen,
  onAddRechnungen,
}: KundenDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kunden', 'kundenname')} value={record.fields.kundenname} format="text" />
        <RecordField label={fieldLabel('kunden', 'kundentyp')} value={record.fields.kundentyp} format="pill" />
        <RecordField label={fieldLabel('kunden', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('kunden', 'anlagedatum')} value={record.fields.anlagedatum} format="date" />
        <RecordField label={fieldLabel('kunden', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('kunden', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('kunden', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('kunden', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('kunden', 'rechnungsadresse_gleich')} value={record.fields.rechnungsadresse_gleich} format="bool" />
        <RecordField label={fieldLabel('kunden', 'rechnungsstrasse')} value={record.fields.rechnungsstrasse} format="text" />
        <RecordField label={fieldLabel('kunden', 'rechnungshausnummer')} value={record.fields.rechnungshausnummer} format="text" />
        <RecordField label={fieldLabel('kunden', 'rechnungsplz')} value={record.fields.rechnungsplz} format="text" />
        <RecordField label={fieldLabel('kunden', 'rechnungsort')} value={record.fields.rechnungsort} format="text" />
        <RecordField label={fieldLabel('kunden', 'ansprechpartner_titel')} value={record.fields.ansprechpartner_titel} format="text" />
        <RecordField label={fieldLabel('kunden', 'ansprechpartner_vorname')} value={record.fields.ansprechpartner_vorname} format="text" />
        <RecordField label={fieldLabel('kunden', 'ansprechpartner_nachname')} value={record.fields.ansprechpartner_nachname} format="text" />
        <RecordField label={fieldLabel('kunden', 'ansprechpartner_email')} value={record.fields.ansprechpartner_email} format="email" />
        <RecordField label={fieldLabel('kunden', 'bevorzugte_kontaktart')} value={record.fields.bevorzugte_kontaktart} format="pill" />
        <RecordField label={fieldLabel('kunden', 'letzter_kontakt_datum')} value={record.fields.letzter_kontakt_datum} format="date" />
        <RecordField label={fieldLabel('kunden', 'letzter_kontakt_ansprechpartner')} value={record.fields.letzter_kontakt_ansprechpartner} format="text" />
        <RecordField label={fieldLabel('kunden', 'notizen')} value={record.fields.notizen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('projekte')}
        items={projekteList.filter(r => extractRecordId(r.fields.kunde) === record.record_id)}
        map={r => ({ name: r.fields.projektkennung ?? appLabel('projekte'), meta: undefined })}
        onOpen={onOpenProjekte}
        onAdd={onAddProjekte}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('rechnungen')}
        items={rechnungenList.filter(r => extractRecordId(r.fields.kunde) === record.record_id)}
        map={r => ({ name: r.fields.rechnungsnummer ?? appLabel('rechnungen'), meta: r.fields.rechnungsdatum })}
        onOpen={onOpenRechnungen}
        onAdd={onAddRechnungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KUNDEN} recordId={record.record_id} />
    </>
  );
}
