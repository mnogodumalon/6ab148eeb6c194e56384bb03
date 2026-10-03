import type { Berater, Leistungskatalog, Projekte, Angebote, Zeiterfassung, Rechnungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface BeraterDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Berater;
  /** N:1-Ziel „Leistungskatalog": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  leistungskatalogList: Leistungskatalog[];
  /** Reserviert — Leistungskatalog ist hier nur über ein Mehrfach-Feld verknüpft (Text-Join, keine Einzel-Relation); Übergabe erlaubt, aber ohne Wirkung. */
  onOpenLeistungskatalog?: (record: Leistungskatalog) => void;
  /** N:1-Ziel „Projekte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  projekteList: Projekte[];
  /** Reserviert — Projekte ist hier nur über ein Mehrfach-Feld verknüpft (Text-Join, keine Einzel-Relation); Übergabe erlaubt, aber ohne Wirkung. */
  onOpenProjekte?: (record: Projekte) => void;
  /** 1:N „Leistungskatalog" (ausfuehrende_berater): VOLLE Liste — der Block filtert auf diesen Record. */
  leistungskatalogAusfuehrendeBeraterList: Leistungskatalog[];
  /** Zeilen-Klick → overlay.push auf das Leistungskatalog-Detail (nie der Edit-Dialog). */
  onOpenLeistungskatalogAusfuehrendeBerater: (record: Leistungskatalog) => void;
  /** Kontextuelles „+": öffnet den Leistungskatalog-Dialog mit diesem Record vorgesetzt. */
  onAddLeistungskatalogAusfuehrendeBerater: () => void;
  /** „Vorhandene wählen": Listenfeld-Rückbezug — hängt diesen Record an einen bestehenden Leistungskatalog-Datensatz. */
  onPickLeistungskatalogAusfuehrendeBerater?: () => void;
  /** 1:N „Projekte" (projektleitung): VOLLE Liste — der Block filtert auf diesen Record. */
  projekteProjektleitungList: Projekte[];
  /** Zeilen-Klick → overlay.push auf das Projekte-Detail (nie der Edit-Dialog). */
  onOpenProjekteProjektleitung: (record: Projekte) => void;
  /** Kontextuelles „+": öffnet den Projekte-Dialog mit diesem Record vorgesetzt. */
  onAddProjekteProjektleitung: () => void;
  /** 1:N „Angebote" (berater): VOLLE Liste — der Block filtert auf diesen Record. */
  angeboteList: Angebote[];
  /** Zeilen-Klick → overlay.push auf das Angebote-Detail (nie der Edit-Dialog). */
  onOpenAngebote: (record: Angebote) => void;
  /** Kontextuelles „+": öffnet den Angebote-Dialog mit diesem Record vorgesetzt. */
  onAddAngebote: () => void;
  /** 1:N „Zeiterfassung" (berater): VOLLE Liste — der Block filtert auf diesen Record. */
  zeiterfassungList: Zeiterfassung[];
  /** Zeilen-Klick → overlay.push auf das Zeiterfassung-Detail (nie der Edit-Dialog). */
  onOpenZeiterfassung: (record: Zeiterfassung) => void;
  /** Kontextuelles „+": öffnet den Zeiterfassung-Dialog mit diesem Record vorgesetzt. */
  onAddZeiterfassung: () => void;
  /** 1:N „Rechnungen" (berater): VOLLE Liste — der Block filtert auf diesen Record. */
  rechnungenList: Rechnungen[];
  /** Zeilen-Klick → overlay.push auf das Rechnungen-Detail (nie der Edit-Dialog). */
  onOpenRechnungen: (record: Rechnungen) => void;
  /** Kontextuelles „+": öffnet den Rechnungen-Dialog mit diesem Record vorgesetzt. */
  onAddRechnungen: () => void;
  /** „Vorhandene wählen": Listenfeld-Rückbezug — hängt diesen Record an einen bestehenden Rechnungen-Datensatz. */
  onPickRechnungen?: () => void;
}

export function BeraterDetails({
  record,
  leistungskatalogList,
  projekteList,
  leistungskatalogAusfuehrendeBeraterList,
  onOpenLeistungskatalogAusfuehrendeBerater,
  onAddLeistungskatalogAusfuehrendeBerater,
  onPickLeistungskatalogAusfuehrendeBerater,
  projekteProjektleitungList,
  onOpenProjekteProjektleitung,
  onAddProjekteProjektleitung,
  angeboteList,
  onOpenAngebote,
  onAddAngebote,
  zeiterfassungList,
  onOpenZeiterfassung,
  onAddZeiterfassung,
  rechnungenList,
  onOpenRechnungen,
  onAddRechnungen,
  onPickRechnungen,
}: BeraterDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('berater', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('berater', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('berater', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('berater', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('berater', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('berater', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('berater', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('berater', 'email_beruflich')} value={record.fields.email_beruflich} format="email" />
        <RecordField label={fieldLabel('berater', 'email_privat')} value={record.fields.email_privat} format="email" />
        <RecordField label={fieldLabel('berater', 'einstiegsdatum')} value={record.fields.einstiegsdatum} format="date" />
        <RecordField label={fieldLabel('berater', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('berater', 'stundensatz')} value={record.fields.stundensatz} format="text" />
        <RecordField label={fieldLabel('berater', 'stunden_aktueller_monat')} value={record.fields.stunden_aktueller_monat} format="text" />
        <RecordField label={fieldLabel('berater', 'stunden_aktuelles_quartal')} value={record.fields.stunden_aktuelles_quartal} format="text" />
        <RecordField label={fieldLabel('berater', 'stunden_aktuelles_jahr')} value={record.fields.stunden_aktuelles_jahr} format="text" />
        <RecordField label={fieldLabel('berater', 'stunden_letzter_monat')} value={record.fields.stunden_letzter_monat} format="text" />
        <RecordField label={fieldLabel('berater', 'stunden_letztes_quartal')} value={record.fields.stunden_letztes_quartal} format="text" />
        <RecordField label={fieldLabel('berater', 'stunden_letztes_jahr')} value={record.fields.stunden_letztes_jahr} format="text" />
        <RecordField label={fieldLabel('berater', 'sonstiges')} value={record.fields.sonstiges} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('berater', 'leistungen')} value={Array.isArray(record.fields.leistungen) ? record.fields.leistungen.map((u: unknown) => leistungskatalogList.find(t => t.record_id === extractRecordId(u))?.fields.leistungsname ?? '—').join(', ') : null} format="text" />
        <RecordField label={fieldLabel('berater', 'zugewiesene_projekte')} value={Array.isArray(record.fields.zugewiesene_projekte) ? record.fields.zugewiesene_projekte.map((u: unknown) => projekteList.find(t => t.record_id === extractRecordId(u))?.fields.projektkennung ?? '—').join(', ') : null} format="text" />
      </RecordSection>

      <SatelliteSection
        title={`${appLabel('leistungskatalog')} · ${fieldLabel('leistungskatalog', 'ausfuehrende_berater')}`}
        items={leistungskatalogAusfuehrendeBeraterList.filter(r => Array.isArray(r.fields.ausfuehrende_berater) && r.fields.ausfuehrende_berater.some((u: unknown) => extractRecordId(u) === record.record_id))}
        map={r => ({ name: r.fields.leistungsname ?? appLabel('leistungskatalog'), meta: undefined })}
        onOpen={onOpenLeistungskatalogAusfuehrendeBerater}
        onAdd={onAddLeistungskatalogAusfuehrendeBerater}
        onPick={onPickLeistungskatalogAusfuehrendeBerater}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={`${appLabel('projekte')} · ${fieldLabel('projekte', 'projektleitung')}`}
        items={projekteProjektleitungList.filter(r => extractRecordId(r.fields.projektleitung) === record.record_id)}
        map={r => ({ name: r.fields.projektkennung ?? appLabel('projekte'), meta: undefined })}
        onOpen={onOpenProjekteProjektleitung}
        onAdd={onAddProjekteProjektleitung}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('angebote')}
        items={angeboteList.filter(r => extractRecordId(r.fields.berater) === record.record_id)}
        map={r => ({ name: r.fields.dauer ?? appLabel('angebote'), meta: r.fields.zeitrahmen_anfang })}
        onOpen={onOpenAngebote}
        onAdd={onAddAngebote}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('zeiterfassung')}
        items={zeiterfassungList.filter(r => extractRecordId(r.fields.berater) === record.record_id)}
        map={r => ({ name: appLabel('zeiterfassung'), meta: r.fields.datum })}
        onOpen={onOpenZeiterfassung}
        onAdd={onAddZeiterfassung}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('rechnungen')}
        items={rechnungenList.filter(r => Array.isArray(r.fields.berater) && r.fields.berater.some((u: unknown) => extractRecordId(u) === record.record_id))}
        map={r => ({ name: r.fields.rechnungsnummer ?? appLabel('rechnungen'), meta: r.fields.rechnungsdatum })}
        onOpen={onOpenRechnungen}
        onAdd={onAddRechnungen}
        onPick={onPickRechnungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.BERATER} recordId={record.record_id} />
    </>
  );
}
