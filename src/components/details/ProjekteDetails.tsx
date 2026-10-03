import type { Projekte, Kunden, Berater, Angebote, Zeiterfassung, Rechnungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface ProjekteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Projekte;
  /** N:1-Ziel „Kunden": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kundenList: Kunden[];
  /** Klick auf die Kunden-Relation → overlay.push auf dessen Detail. */
  onOpenKunden?: (record: Kunden) => void;
  /** N:1-Ziel „Berater": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beraterList: Berater[];
  /** Klick auf die Berater-Relation → overlay.push auf dessen Detail. */
  onOpenBerater?: (record: Berater) => void;
  /** 1:N „Berater" (zugewiesene_projekte): VOLLE Liste — der Block filtert auf diesen Record. */
  beraterZugewieseneProjekteList: Berater[];
  /** Zeilen-Klick → overlay.push auf das Berater-Detail (nie der Edit-Dialog). */
  onOpenBeraterZugewieseneProjekte: (record: Berater) => void;
  /** Kontextuelles „+": öffnet den Berater-Dialog mit diesem Record vorgesetzt. */
  onAddBeraterZugewieseneProjekte: () => void;
  /** „Vorhandene wählen": Listenfeld-Rückbezug — hängt diesen Record an einen bestehenden Berater-Datensatz. */
  onPickBeraterZugewieseneProjekte?: () => void;
  /** 1:N „Angebote" (projekt): VOLLE Liste — der Block filtert auf diesen Record. */
  angeboteList: Angebote[];
  /** Zeilen-Klick → overlay.push auf das Angebote-Detail (nie der Edit-Dialog). */
  onOpenAngebote: (record: Angebote) => void;
  /** Kontextuelles „+": öffnet den Angebote-Dialog mit diesem Record vorgesetzt. */
  onAddAngebote: () => void;
  /** 1:N „Zeiterfassung" (projekt): VOLLE Liste — der Block filtert auf diesen Record. */
  zeiterfassungList: Zeiterfassung[];
  /** Zeilen-Klick → overlay.push auf das Zeiterfassung-Detail (nie der Edit-Dialog). */
  onOpenZeiterfassung: (record: Zeiterfassung) => void;
  /** Kontextuelles „+": öffnet den Zeiterfassung-Dialog mit diesem Record vorgesetzt. */
  onAddZeiterfassung: () => void;
  /** 1:N „Rechnungen" (projekt): VOLLE Liste — der Block filtert auf diesen Record. */
  rechnungenList: Rechnungen[];
  /** Zeilen-Klick → overlay.push auf das Rechnungen-Detail (nie der Edit-Dialog). */
  onOpenRechnungen: (record: Rechnungen) => void;
  /** Kontextuelles „+": öffnet den Rechnungen-Dialog mit diesem Record vorgesetzt. */
  onAddRechnungen: () => void;
}

export function ProjekteDetails({
  record,
  kundenList,
  onOpenKunden,
  beraterList,
  onOpenBerater,
  beraterZugewieseneProjekteList,
  onOpenBeraterZugewieseneProjekte,
  onAddBeraterZugewieseneProjekte,
  onPickBeraterZugewieseneProjekte,
  angeboteList,
  onOpenAngebote,
  onAddAngebote,
  zeiterfassungList,
  onOpenZeiterfassung,
  onAddZeiterfassung,
  rechnungenList,
  onOpenRechnungen,
  onAddRechnungen,
}: ProjekteDetailsProps) {
  const kundeTarget = kundenList.find(r => r.record_id === extractRecordId(record.fields.kunde));
  const projektleitungTarget = beraterList.find(r => r.record_id === extractRecordId(record.fields.projektleitung));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('projekte', 'projektkennung')} value={record.fields.projektkennung} format="text" />
        <RecordField label={fieldLabel('projekte', 'projektnummer')} value={record.fields.projektnummer} format="text" />
        <RecordField label={fieldLabel('projekte', 'projektart')} value={record.fields.projektart} format="pill" />
        <RecordField label={fieldLabel('projekte', 'projektstatus')} value={record.fields.projektstatus} format="pill" />
        <RecordField label={fieldLabel('projekte', 'projektstart_monat')} value={record.fields.projektstart_monat} format="pill" />
        <RecordField label={fieldLabel('projekte', 'projektstart_jahr')} value={record.fields.projektstart_jahr} format="text" />
        <RecordField label={fieldLabel('projekte', 'ansprechpartner_kunde')} value={record.fields.ansprechpartner_kunde} format="text" />
        <RecordField label={fieldLabel('projekte', 'letzter_schritt')} value={record.fields.letzter_schritt} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('projekte', 'kunde')}
          name={kundeTarget?.fields.kundenname ?? '—'}
          meta={[kundeTarget?.fields.email, kundeTarget?.fields.ansprechpartner_email].filter(Boolean).join(' · ') || undefined}
          onClick={kundeTarget && onOpenKunden ? () => onOpenKunden!(kundeTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('projekte', 'projektleitung')}
          name={projektleitungTarget?.fields.vorname ?? '—'}
          meta={[projektleitungTarget?.fields.email_beruflich, projektleitungTarget?.fields.email_privat].filter(Boolean).join(' · ') || undefined}
          onClick={projektleitungTarget && onOpenBerater ? () => onOpenBerater!(projektleitungTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={`${appLabel('berater')} · ${fieldLabel('berater', 'zugewiesene_projekte')}`}
        items={beraterZugewieseneProjekteList.filter(r => Array.isArray(r.fields.zugewiesene_projekte) && r.fields.zugewiesene_projekte.some((u: unknown) => extractRecordId(u) === record.record_id))}
        map={r => ({ name: r.fields.vorname ?? appLabel('berater'), meta: r.fields.einstiegsdatum })}
        onOpen={onOpenBeraterZugewieseneProjekte}
        onAdd={onAddBeraterZugewieseneProjekte}
        onPick={onPickBeraterZugewieseneProjekte}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('angebote')}
        items={angeboteList.filter(r => extractRecordId(r.fields.projekt) === record.record_id)}
        map={r => ({ name: r.fields.dauer ?? appLabel('angebote'), meta: r.fields.zeitrahmen_anfang })}
        onOpen={onOpenAngebote}
        onAdd={onAddAngebote}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('zeiterfassung')}
        items={zeiterfassungList.filter(r => extractRecordId(r.fields.projekt) === record.record_id)}
        map={r => ({ name: appLabel('zeiterfassung'), meta: r.fields.datum })}
        onOpen={onOpenZeiterfassung}
        onAdd={onAddZeiterfassung}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('rechnungen')}
        items={rechnungenList.filter(r => extractRecordId(r.fields.projekt) === record.record_id)}
        map={r => ({ name: r.fields.rechnungsnummer ?? appLabel('rechnungen'), meta: r.fields.rechnungsdatum })}
        onOpen={onOpenRechnungen}
        onAdd={onAddRechnungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.PROJEKTE} recordId={record.record_id} />
    </>
  );
}
