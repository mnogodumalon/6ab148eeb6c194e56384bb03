import type { Angebote, Projekte, Berater } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';

export interface AngeboteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Angebote;
  /** N:1-Ziel „Projekte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  projekteList: Projekte[];
  /** Klick auf die Projekte-Relation → overlay.push auf dessen Detail. */
  onOpenProjekte?: (record: Projekte) => void;
  /** N:1-Ziel „Berater": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beraterList: Berater[];
  /** Klick auf die Berater-Relation → overlay.push auf dessen Detail. */
  onOpenBerater?: (record: Berater) => void;
}

export function AngeboteDetails({
  record,
  projekteList,
  onOpenProjekte,
  beraterList,
  onOpenBerater,
}: AngeboteDetailsProps) {
  const projektTarget = projekteList.find(r => r.record_id === extractRecordId(record.fields.projekt));
  const beraterTarget = beraterList.find(r => r.record_id === extractRecordId(record.fields.berater));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('angebote', 'angebotsnummer')} value={record.fields.angebotsnummer} format="text" />
        <RecordField label={fieldLabel('angebote', 'angebotsjahr')} value={record.fields.angebotsjahr} format="text" />
        <RecordField label={fieldLabel('angebote', 'angebotstyp')} value={record.fields.angebotstyp} format="pill" />
        <RecordField label={fieldLabel('angebote', 'angebotsstatus')} value={record.fields.angebotsstatus} format="pill" />
        <RecordField label={fieldLabel('angebote', 'zeitrahmen_anfang')} value={record.fields.zeitrahmen_anfang} format="date" />
        <RecordField label={fieldLabel('angebote', 'zeitrahmen_ende')} value={record.fields.zeitrahmen_ende} format="date" />
        <RecordField label={fieldLabel('angebote', 'dauer')} value={record.fields.dauer} format="text" />
        <RecordField label={fieldLabel('angebote', 'kostentyp')} value={record.fields.kostentyp} format="pill" />
        <RecordField label={fieldLabel('angebote', 'kostenbetrag')} value={record.fields.kostenbetrag} format="text" />
        <RecordField label={fieldLabel('angebote', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('angebote', 'anhang')} className="md:col-span-2">
          {record.fields.anhang ? (
            <MediaThumbnail src={record.fields.anhang as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('angebote', 'projekt')}
          name={projektTarget?.fields.projektkennung ?? '—'}
          meta={[projektTarget?.fields.ansprechpartner_kunde].filter(Boolean).join(' · ') || undefined}
          onClick={projektTarget && onOpenProjekte ? () => onOpenProjekte!(projektTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('angebote', 'berater')}
          name={beraterTarget?.fields.vorname ?? '—'}
          meta={[beraterTarget?.fields.email_beruflich, beraterTarget?.fields.email_privat].filter(Boolean).join(' · ') || undefined}
          onClick={beraterTarget && onOpenBerater ? () => onOpenBerater!(beraterTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANGEBOTE} recordId={record.record_id} />
    </>
  );
}
