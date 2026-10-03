import type { Rechnungen, Kunden, Projekte, Berater, Zeiterfassung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';

export interface RechnungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Rechnungen;
  /** N:1-Ziel „Kunden": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kundenList: Kunden[];
  /** Klick auf die Kunden-Relation → overlay.push auf dessen Detail. */
  onOpenKunden?: (record: Kunden) => void;
  /** N:1-Ziel „Projekte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  projekteList: Projekte[];
  /** Klick auf die Projekte-Relation → overlay.push auf dessen Detail. */
  onOpenProjekte?: (record: Projekte) => void;
  /** N:1-Ziel „Berater": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beraterList: Berater[];
  /** Reserviert — Berater ist hier nur über ein Mehrfach-Feld verknüpft (Text-Join, keine Einzel-Relation); Übergabe erlaubt, aber ohne Wirkung. */
  onOpenBerater?: (record: Berater) => void;
  /** N:1-Ziel „Zeiterfassung": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  zeiterfassungList: Zeiterfassung[];
  /** Reserviert — Zeiterfassung ist hier nur über ein Mehrfach-Feld verknüpft (Text-Join, keine Einzel-Relation); Übergabe erlaubt, aber ohne Wirkung. */
  onOpenZeiterfassung?: (record: Zeiterfassung) => void;
}

export function RechnungenDetails({
  record,
  kundenList,
  onOpenKunden,
  projekteList,
  onOpenProjekte,
  beraterList,
  zeiterfassungList,
}: RechnungenDetailsProps) {
  const kundeTarget = kundenList.find(r => r.record_id === extractRecordId(record.fields.kunde));
  const projektTarget = projekteList.find(r => r.record_id === extractRecordId(record.fields.projekt));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('rechnungen', 'rechnungsnummer')} value={record.fields.rechnungsnummer} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'rechnungsdatum')} value={record.fields.rechnungsdatum} format="date" />
        <RecordField label={fieldLabel('rechnungen', 'faelligkeitsdatum')} value={record.fields.faelligkeitsdatum} format="date" />
        <RecordField label={fieldLabel('rechnungen', 'rechnungsstatus')} value={record.fields.rechnungsstatus} format="pill" />
        <RecordField label={fieldLabel('rechnungen', 'rechnungsmonat')} value={record.fields.rechnungsmonat} format="pill" />
        <RecordField label={fieldLabel('rechnungen', 'rechnungsjahr')} value={record.fields.rechnungsjahr} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'nettobetrag')} value={record.fields.nettobetrag} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'mehrwertsteuer')} value={record.fields.mehrwertsteuer} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'gesamtbetrag')} value={record.fields.gesamtbetrag} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'notizen')} value={record.fields.notizen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('rechnungen', 'anhang')} className="md:col-span-2">
          {record.fields.anhang ? (
            <MediaThumbnail src={record.fields.anhang as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('rechnungen', 'berater')} value={Array.isArray(record.fields.berater) ? record.fields.berater.map((u: unknown) => beraterList.find(t => t.record_id === extractRecordId(u))?.fields.vorname ?? '—').join(', ') : null} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'zeiterfassungseintraege')} value={Array.isArray(record.fields.zeiterfassungseintraege) ? record.fields.zeiterfassungseintraege.map((u: unknown) => zeiterfassungList.find(t => t.record_id === extractRecordId(u))?.fields.taetigkeit ?? '—').join(', ') : null} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('rechnungen', 'kunde')}
          name={kundeTarget?.fields.kundenname ?? '—'}
          meta={[kundeTarget?.fields.email, kundeTarget?.fields.ansprechpartner_email].filter(Boolean).join(' · ') || undefined}
          onClick={kundeTarget && onOpenKunden ? () => onOpenKunden!(kundeTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('rechnungen', 'projekt')}
          name={projektTarget?.fields.projektkennung ?? '—'}
          meta={[projektTarget?.fields.ansprechpartner_kunde].filter(Boolean).join(' · ') || undefined}
          onClick={projektTarget && onOpenProjekte ? () => onOpenProjekte!(projektTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.RECHNUNGEN} recordId={record.record_id} />
    </>
  );
}
