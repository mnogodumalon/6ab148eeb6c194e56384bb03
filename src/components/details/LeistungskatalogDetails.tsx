import type { Leistungskatalog, Berater, Zeiterfassung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface LeistungskatalogDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Leistungskatalog;
  /** N:1-Ziel „Berater": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beraterList: Berater[];
  /** Reserviert — Berater ist hier nur über ein Mehrfach-Feld verknüpft (Text-Join, keine Einzel-Relation); Übergabe erlaubt, aber ohne Wirkung. */
  onOpenBerater?: (record: Berater) => void;
  /** 1:N „Berater" (leistungen): VOLLE Liste — der Block filtert auf diesen Record. */
  beraterLeistungenList: Berater[];
  /** Zeilen-Klick → overlay.push auf das Berater-Detail (nie der Edit-Dialog). */
  onOpenBeraterLeistungen: (record: Berater) => void;
  /** Kontextuelles „+": öffnet den Berater-Dialog mit diesem Record vorgesetzt. */
  onAddBeraterLeistungen: () => void;
  /** „Vorhandene wählen": Listenfeld-Rückbezug — hängt diesen Record an einen bestehenden Berater-Datensatz. */
  onPickBeraterLeistungen?: () => void;
  /** 1:N „Zeiterfassung" (leistung): VOLLE Liste — der Block filtert auf diesen Record. */
  zeiterfassungList: Zeiterfassung[];
  /** Zeilen-Klick → overlay.push auf das Zeiterfassung-Detail (nie der Edit-Dialog). */
  onOpenZeiterfassung: (record: Zeiterfassung) => void;
  /** Kontextuelles „+": öffnet den Zeiterfassung-Dialog mit diesem Record vorgesetzt. */
  onAddZeiterfassung: () => void;
}

export function LeistungskatalogDetails({
  record,
  beraterList,
  beraterLeistungenList,
  onOpenBeraterLeistungen,
  onAddBeraterLeistungen,
  onPickBeraterLeistungen,
  zeiterfassungList,
  onOpenZeiterfassung,
  onAddZeiterfassung,
}: LeistungskatalogDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('leistungskatalog', 'leistungsname')} value={record.fields.leistungsname} format="text" />
        <RecordField label={fieldLabel('leistungskatalog', 'leistungstyp')} value={record.fields.leistungstyp} format="pill" />
        <RecordField label={fieldLabel('leistungskatalog', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('leistungskatalog', 'kostenvoranschlag')} value={record.fields.kostenvoranschlag} format="text" />
        <RecordField label={fieldLabel('leistungskatalog', 'einheit')} value={record.fields.einheit} format="pill" />
        <RecordField label={fieldLabel('leistungskatalog', 'ausfuehrende_berater')} value={Array.isArray(record.fields.ausfuehrende_berater) ? record.fields.ausfuehrende_berater.map((u: unknown) => beraterList.find(t => t.record_id === extractRecordId(u))?.fields.vorname ?? '—').join(', ') : null} format="text" />
      </RecordSection>

      <SatelliteSection
        title={`${appLabel('berater')} · ${fieldLabel('berater', 'leistungen')}`}
        items={beraterLeistungenList.filter(r => Array.isArray(r.fields.leistungen) && r.fields.leistungen.some((u: unknown) => extractRecordId(u) === record.record_id))}
        map={r => ({ name: r.fields.vorname ?? appLabel('berater'), meta: r.fields.einstiegsdatum })}
        onOpen={onOpenBeraterLeistungen}
        onAdd={onAddBeraterLeistungen}
        onPick={onPickBeraterLeistungen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('zeiterfassung')}
        items={zeiterfassungList.filter(r => extractRecordId(r.fields.leistung) === record.record_id)}
        map={r => ({ name: appLabel('zeiterfassung'), meta: r.fields.datum })}
        onOpen={onOpenZeiterfassung}
        onAdd={onAddZeiterfassung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.LEISTUNGSKATALOG} recordId={record.record_id} />
    </>
  );
}
