import type { Zeiterfassung, Berater, Projekte, Leistungskatalog, Rechnungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface ZeiterfassungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Zeiterfassung;
  /** N:1-Ziel „Berater": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beraterList: Berater[];
  /** Klick auf die Berater-Relation → overlay.push auf dessen Detail. */
  onOpenBerater?: (record: Berater) => void;
  /** N:1-Ziel „Projekte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  projekteList: Projekte[];
  /** Klick auf die Projekte-Relation → overlay.push auf dessen Detail. */
  onOpenProjekte?: (record: Projekte) => void;
  /** N:1-Ziel „Leistungskatalog": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  leistungskatalogList: Leistungskatalog[];
  /** Klick auf die Leistungskatalog-Relation → overlay.push auf dessen Detail. */
  onOpenLeistungskatalog?: (record: Leistungskatalog) => void;
  /** 1:N „Rechnungen" (zeiterfassungseintraege): VOLLE Liste — der Block filtert auf diesen Record. */
  rechnungenList: Rechnungen[];
  /** Zeilen-Klick → overlay.push auf das Rechnungen-Detail (nie der Edit-Dialog). */
  onOpenRechnungen: (record: Rechnungen) => void;
  /** Kontextuelles „+": öffnet den Rechnungen-Dialog mit diesem Record vorgesetzt. */
  onAddRechnungen: () => void;
  /** „Vorhandene wählen": Listenfeld-Rückbezug — hängt diesen Record an einen bestehenden Rechnungen-Datensatz. */
  onPickRechnungen?: () => void;
}

export function ZeiterfassungDetails({
  record,
  beraterList,
  onOpenBerater,
  projekteList,
  onOpenProjekte,
  leistungskatalogList,
  onOpenLeistungskatalog,
  rechnungenList,
  onOpenRechnungen,
  onAddRechnungen,
  onPickRechnungen,
}: ZeiterfassungDetailsProps) {
  const beraterTarget = beraterList.find(r => r.record_id === extractRecordId(record.fields.berater));
  const projektTarget = projekteList.find(r => r.record_id === extractRecordId(record.fields.projekt));
  const leistungTarget = leistungskatalogList.find(r => r.record_id === extractRecordId(record.fields.leistung));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('zeiterfassung', 'datum')} value={record.fields.datum} format="date" />
        <RecordField label={fieldLabel('zeiterfassung', 'stunden')} value={record.fields.stunden} format="text" />
        <RecordField label={fieldLabel('zeiterfassung', 'erfassungsmonat')} value={record.fields.erfassungsmonat} format="pill" />
        <RecordField label={fieldLabel('zeiterfassung', 'erfassungsjahr')} value={record.fields.erfassungsjahr} format="text" />
        <RecordField label={fieldLabel('zeiterfassung', 'abrechenbar')} value={record.fields.abrechenbar} format="bool" />
        <RecordField label={fieldLabel('zeiterfassung', 'taetigkeit')} value={record.fields.taetigkeit} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('zeiterfassung', 'berater')}
          name={beraterTarget?.fields.vorname ?? '—'}
          meta={[beraterTarget?.fields.email_beruflich, beraterTarget?.fields.email_privat].filter(Boolean).join(' · ') || undefined}
          onClick={beraterTarget && onOpenBerater ? () => onOpenBerater!(beraterTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('zeiterfassung', 'projekt')}
          name={projektTarget?.fields.projektkennung ?? '—'}
          meta={[projektTarget?.fields.ansprechpartner_kunde].filter(Boolean).join(' · ') || undefined}
          onClick={projektTarget && onOpenProjekte ? () => onOpenProjekte!(projektTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('zeiterfassung', 'leistung')}
          name={leistungTarget?.fields.leistungsname ?? '—'}
          meta={undefined}
          onClick={leistungTarget && onOpenLeistungskatalog ? () => onOpenLeistungskatalog!(leistungTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('rechnungen')}
        items={rechnungenList.filter(r => Array.isArray(r.fields.zeiterfassungseintraege) && r.fields.zeiterfassungseintraege.some((u: unknown) => extractRecordId(u) === record.record_id))}
        map={r => ({ name: r.fields.rechnungsnummer ?? appLabel('rechnungen'), meta: r.fields.rechnungsdatum })}
        onOpen={onOpenRechnungen}
        onAdd={onAddRechnungen}
        onPick={onPickRechnungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.ZEITERFASSUNG} recordId={record.record_id} />
    </>
  );
}
