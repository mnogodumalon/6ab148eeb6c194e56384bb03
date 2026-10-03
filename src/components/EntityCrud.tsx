/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'kunden'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.kunden.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.kunden.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.kunden.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.kunden              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   kunden: kundenname, kundentyp, email, anlagedatum, strasse, hausnummer, plz, ort, …  ·  ← projekte (list + contextual +) · ← rechnungen (list + contextual +)
 *   berater: vorname, nachname, titel, strasse, hausnummer, plz, ort, email_beruflich, …  ·  → leistungskatalog · → projekte · ← leistungskatalog (list + contextual + + choose existing) · ← projekte (list + contextual +) · ← angebote (list + contextual +) · ← zeiterfassung (list + contextual +) · ← rechnungen (list + contextual + + choose existing)
 *   leistungskatalog: leistungsname, leistungstyp, beschreibung, kostenvoranschlag, einheit, ausfuehrende_berater  ·  → berater · ← berater (list + contextual + + choose existing) · ← zeiterfassung (list + contextual +)
 *   projekte: projektkennung, projektnummer, projektart, projektstatus, projektstart_monat, projektstart_jahr, kunde, ansprechpartner_kunde, …  ·  → kunden · → berater · ← berater (list + contextual + + choose existing) · ← angebote (list + contextual +) · ← zeiterfassung (list + contextual +) · ← rechnungen (list + contextual +)
 *   angebote: angebotsnummer, angebotsjahr, angebotstyp, angebotsstatus, zeitrahmen_anfang, zeitrahmen_ende, dauer, kostentyp, …  ·  → projekte · → berater
 *   zeiterfassung: berater, projekt, leistung, datum, stunden, erfassungsmonat, erfassungsjahr, abrechenbar, …  ·  → berater · → projekte · → leistungskatalog · ← rechnungen (list + contextual + + choose existing)
 *   rechnungen: rechnungsnummer, rechnungsdatum, faelligkeitsdatum, rechnungsstatus, rechnungsmonat, rechnungsjahr, kunde, nettobetrag, …  ·  → kunden · → projekte · → berater · → zeiterfassung
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Kunden, Berater, Leistungskatalog, Projekte, Angebote, Zeiterfassung, Rechnungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordIds } from '@/services/livingAppsService';
import { enrichBerater, enrichLeistungskatalog, enrichProjekte, enrichAngebote, enrichZeiterfassung, enrichRechnungen } from '@/lib/enrich';
import type { EnrichedBerater, EnrichedLeistungskatalog, EnrichedProjekte, EnrichedAngebote, EnrichedZeiterfassung, EnrichedRechnungen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { KundenDialog, type KundenDialogDefaults } from '@/components/dialogs/KundenDialog';
import { KundenDetails } from '@/components/details/KundenDetails';
import { BeraterDialog, type BeraterDialogDefaults } from '@/components/dialogs/BeraterDialog';
import { BeraterDetails } from '@/components/details/BeraterDetails';
import { LeistungskatalogDialog, type LeistungskatalogDialogDefaults } from '@/components/dialogs/LeistungskatalogDialog';
import { LeistungskatalogDetails } from '@/components/details/LeistungskatalogDetails';
import { ProjekteDialog, type ProjekteDialogDefaults } from '@/components/dialogs/ProjekteDialog';
import { ProjekteDetails } from '@/components/details/ProjekteDetails';
import { AngeboteDialog, type AngeboteDialogDefaults } from '@/components/dialogs/AngeboteDialog';
import { AngeboteDetails } from '@/components/details/AngeboteDetails';
import { ZeiterfassungDialog, type ZeiterfassungDialogDefaults } from '@/components/dialogs/ZeiterfassungDialog';
import { ZeiterfassungDetails } from '@/components/details/ZeiterfassungDetails';
import { RechnungenDialog, type RechnungenDialogDefaults } from '@/components/dialogs/RechnungenDialog';
import { RechnungenDetails } from '@/components/details/RechnungenDetails';
import { PickExistingDialog } from '@/components/PickExistingDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'kunden'; record: Kunden }
  | { type: 'berater'; record: EnrichedBerater }
  | { type: 'leistungskatalog'; record: EnrichedLeistungskatalog }
  | { type: 'projekte'; record: EnrichedProjekte }
  | { type: 'angebote'; record: EnrichedAngebote }
  | { type: 'zeiterfassung'; record: EnrichedZeiterfassung }
  | { type: 'rechnungen'; record: EnrichedRechnungen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  kunden: EntityCrudApi<Kunden, KundenDialogDefaults>;
  berater: EntityCrudApi<Berater, BeraterDialogDefaults>;
  leistungskatalog: EntityCrudApi<Leistungskatalog, LeistungskatalogDialogDefaults>;
  projekte: EntityCrudApi<Projekte, ProjekteDialogDefaults>;
  angebote: EntityCrudApi<Angebote, AngeboteDialogDefaults>;
  zeiterfassung: EntityCrudApi<Zeiterfassung, ZeiterfassungDialogDefaults>;
  rechnungen: EntityCrudApi<Rechnungen, RechnungenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { kunden: Kunden[]; berater: EnrichedBerater[]; leistungskatalog: EnrichedLeistungskatalog[]; projekte: EnrichedProjekte[]; angebote: EnrichedAngebote[]; zeiterfassung: EnrichedZeiterfassung[]; rechnungen: EnrichedRechnungen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [kundenDialog, setKundenDialog] = useState<{ defaults?: KundenDialogDefaults; editing?: Kunden } | null>(null);
  const [beraterDialog, setBeraterDialog] = useState<{ defaults?: BeraterDialogDefaults; editing?: Berater } | null>(null);
  const [leistungskatalogDialog, setLeistungskatalogDialog] = useState<{ defaults?: LeistungskatalogDialogDefaults; editing?: Leistungskatalog } | null>(null);
  const [projekteDialog, setProjekteDialog] = useState<{ defaults?: ProjekteDialogDefaults; editing?: Projekte } | null>(null);
  const [angeboteDialog, setAngeboteDialog] = useState<{ defaults?: AngeboteDialogDefaults; editing?: Angebote } | null>(null);
  const [zeiterfassungDialog, setZeiterfassungDialog] = useState<{ defaults?: ZeiterfassungDialogDefaults; editing?: Zeiterfassung } | null>(null);
  const [rechnungenDialog, setRechnungenDialog] = useState<{ defaults?: RechnungenDialogDefaults; editing?: Rechnungen } | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug leistungskatalog.ausfuehrende_berater → berater: hält die Hub-record_id.
  const [pickBeraterLeistungskatalogAusfuehrendeBerater, setPickBeraterLeistungskatalogAusfuehrendeBerater] = useState<string | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug rechnungen.berater → berater: hält die Hub-record_id.
  const [pickBeraterRechnungen, setPickBeraterRechnungen] = useState<string | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug berater.leistungen → leistungskatalog: hält die Hub-record_id.
  const [pickLeistungskatalogBeraterLeistungen, setPickLeistungskatalogBeraterLeistungen] = useState<string | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug berater.zugewiesene_projekte → projekte: hält die Hub-record_id.
  const [pickProjekteBeraterZugewieseneProjekte, setPickProjekteBeraterZugewieseneProjekte] = useState<string | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug rechnungen.zeiterfassungseintraege → zeiterfassung: hält die Hub-record_id.
  const [pickZeiterfassungRechnungen, setPickZeiterfassungRechnungen] = useState<string | null>(null);
  const enrichedBerater = useMemo(() => enrichBerater(data.berater, { leistungskatalogMap: data.leistungskatalogMap, projekteMap: data.projekteMap }), [data.berater, data.leistungskatalogMap, data.projekteMap]);
  const enrichedLeistungskatalog = useMemo(() => enrichLeistungskatalog(data.leistungskatalog, { beraterMap: data.beraterMap }), [data.leistungskatalog, data.beraterMap]);
  const enrichedProjekte = useMemo(() => enrichProjekte(data.projekte, { kundenMap: data.kundenMap, beraterMap: data.beraterMap }), [data.projekte, data.kundenMap, data.beraterMap]);
  const enrichedAngebote = useMemo(() => enrichAngebote(data.angebote, { projekteMap: data.projekteMap, beraterMap: data.beraterMap }), [data.angebote, data.projekteMap, data.beraterMap]);
  const enrichedZeiterfassung = useMemo(() => enrichZeiterfassung(data.zeiterfassung, { beraterMap: data.beraterMap, projekteMap: data.projekteMap, leistungskatalogMap: data.leistungskatalogMap }), [data.zeiterfassung, data.beraterMap, data.projekteMap, data.leistungskatalogMap]);
  const enrichedRechnungen = useMemo(() => enrichRechnungen(data.rechnungen, { kundenMap: data.kundenMap, projekteMap: data.projekteMap, beraterMap: data.beraterMap, zeiterfassungMap: data.zeiterfassungMap }), [data.rechnungen, data.kundenMap, data.projekteMap, data.beraterMap, data.zeiterfassungMap]);

  function detailKunden(record: Kunden, push = false) {
    const item: OverlayItem = { type: 'kunden', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKunden(fields: Kunden['fields']) {
    const editing = kundenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKunden(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKundenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kunden')} — ${t('crud_updated')}`, async () => {
        data.setKunden(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKundenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKundenEntry(fields);
      undoToast(`${appLabel('kunden')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailBerater(record: Berater, push = false) {
    const rec = enrichedBerater.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'berater', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBerater(fields: Berater['fields']) {
    const editing = beraterDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBerater(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBeraterEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('berater')} — ${t('crud_updated')}`, async () => {
        data.setBerater(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBeraterEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBeraterEntry(fields);
      undoToast(`${appLabel('berater')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  // Link an EXISTING Leistungskatalog to the Berater hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkBeraterLeistungskatalogAusfuehrendeBerater(sourceId: string) {
    const hub = pickBeraterLeistungskatalogAusfuehrendeBerater;
    const src = data.leistungskatalog.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.ausfuehrende_berater);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.BERATER, id));
    data.setLeistungskatalog(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, ausfuehrende_berater: next } } : r)));
    try {
      await LivingAppsService.updateLeistungskatalogEntry(sourceId, { ausfuehrende_berater: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('leistungskatalog')} — ${t('pick_linked')}`, async () => {
      data.setLeistungskatalog(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateLeistungskatalogEntry(sourceId, { ausfuehrende_berater: src.fields.ausfuehrende_berater }); } catch { data.fetchAll(); }
    });
  }

  // Link an EXISTING Rechnungen to the Berater hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkBeraterRechnungen(sourceId: string) {
    const hub = pickBeraterRechnungen;
    const src = data.rechnungen.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.berater);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.BERATER, id));
    data.setRechnungen(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, berater: next } } : r)));
    try {
      await LivingAppsService.updateRechnungenEntry(sourceId, { berater: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('rechnungen')} — ${t('pick_linked')}`, async () => {
      data.setRechnungen(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateRechnungenEntry(sourceId, { berater: src.fields.berater }); } catch { data.fetchAll(); }
    });
  }

  function detailLeistungskatalog(record: Leistungskatalog, push = false) {
    const rec = enrichedLeistungskatalog.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'leistungskatalog', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitLeistungskatalog(fields: Leistungskatalog['fields']) {
    const editing = leistungskatalogDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setLeistungskatalog(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateLeistungskatalogEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('leistungskatalog')} — ${t('crud_updated')}`, async () => {
        data.setLeistungskatalog(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateLeistungskatalogEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createLeistungskatalogEntry(fields);
      undoToast(`${appLabel('leistungskatalog')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  // Link an EXISTING Berater to the Leistungskatalog hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkLeistungskatalogBeraterLeistungen(sourceId: string) {
    const hub = pickLeistungskatalogBeraterLeistungen;
    const src = data.berater.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.leistungen);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.LEISTUNGSKATALOG, id));
    data.setBerater(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, leistungen: next } } : r)));
    try {
      await LivingAppsService.updateBeraterEntry(sourceId, { leistungen: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('berater')} — ${t('pick_linked')}`, async () => {
      data.setBerater(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateBeraterEntry(sourceId, { leistungen: src.fields.leistungen }); } catch { data.fetchAll(); }
    });
  }

  function detailProjekte(record: Projekte, push = false) {
    const rec = enrichedProjekte.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'projekte', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitProjekte(fields: Projekte['fields']) {
    const editing = projekteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setProjekte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateProjekteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('projekte')} — ${t('crud_updated')}`, async () => {
        data.setProjekte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateProjekteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createProjekteEntry(fields);
      undoToast(`${appLabel('projekte')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  // Link an EXISTING Berater to the Projekte hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkProjekteBeraterZugewieseneProjekte(sourceId: string) {
    const hub = pickProjekteBeraterZugewieseneProjekte;
    const src = data.berater.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.zugewiesene_projekte);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.PROJEKTE, id));
    data.setBerater(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, zugewiesene_projekte: next } } : r)));
    try {
      await LivingAppsService.updateBeraterEntry(sourceId, { zugewiesene_projekte: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('berater')} — ${t('pick_linked')}`, async () => {
      data.setBerater(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateBeraterEntry(sourceId, { zugewiesene_projekte: src.fields.zugewiesene_projekte }); } catch { data.fetchAll(); }
    });
  }

  function detailAngebote(record: Angebote, push = false) {
    const rec = enrichedAngebote.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'angebote', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAngebote(fields: Angebote['fields']) {
    const editing = angeboteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAngebote(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAngeboteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('angebote')} — ${t('crud_updated')}`, async () => {
        data.setAngebote(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAngeboteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAngeboteEntry(fields);
      undoToast(`${appLabel('angebote')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailZeiterfassung(record: Zeiterfassung, push = false) {
    const rec = enrichedZeiterfassung.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'zeiterfassung', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitZeiterfassung(fields: Zeiterfassung['fields']) {
    const editing = zeiterfassungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setZeiterfassung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateZeiterfassungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('zeiterfassung')} — ${t('crud_updated')}`, async () => {
        data.setZeiterfassung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateZeiterfassungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createZeiterfassungEntry(fields);
      undoToast(`${appLabel('zeiterfassung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  // Link an EXISTING Rechnungen to the Zeiterfassung hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkZeiterfassungRechnungen(sourceId: string) {
    const hub = pickZeiterfassungRechnungen;
    const src = data.rechnungen.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.zeiterfassungseintraege);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.ZEITERFASSUNG, id));
    data.setRechnungen(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, zeiterfassungseintraege: next } } : r)));
    try {
      await LivingAppsService.updateRechnungenEntry(sourceId, { zeiterfassungseintraege: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('rechnungen')} — ${t('pick_linked')}`, async () => {
      data.setRechnungen(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateRechnungenEntry(sourceId, { zeiterfassungseintraege: src.fields.zeiterfassungseintraege }); } catch { data.fetchAll(); }
    });
  }

  function detailRechnungen(record: Rechnungen, push = false) {
    const rec = enrichedRechnungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'rechnungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitRechnungen(fields: Rechnungen['fields']) {
    const editing = rechnungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setRechnungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateRechnungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('rechnungen')} — ${t('crud_updated')}`, async () => {
        data.setRechnungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateRechnungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createRechnungenEntry(fields);
      undoToast(`${appLabel('rechnungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <KundenDialog
        open={kundenDialog !== null}
        onClose={() => setKundenDialog(null)}
        onSubmit={submitKunden}
        defaultValues={kundenDialog?.defaults}
        recordId={kundenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Kunden']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kunden']}
      />
      <BeraterDialog
        open={beraterDialog !== null}
        onClose={() => setBeraterDialog(null)}
        onSubmit={submitBerater}
        defaultValues={beraterDialog?.defaults}
        recordId={beraterDialog?.editing?.record_id}
        leistungskatalogList={data.leistungskatalog}
        projekteList={data.projekte}
        enablePhotoScan={AI_PHOTO_SCAN['Berater']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Berater']}
      />
      <LeistungskatalogDialog
        open={leistungskatalogDialog !== null}
        onClose={() => setLeistungskatalogDialog(null)}
        onSubmit={submitLeistungskatalog}
        defaultValues={leistungskatalogDialog?.defaults}
        recordId={leistungskatalogDialog?.editing?.record_id}
        beraterList={data.berater}
        enablePhotoScan={AI_PHOTO_SCAN['Leistungskatalog']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Leistungskatalog']}
      />
      <ProjekteDialog
        open={projekteDialog !== null}
        onClose={() => setProjekteDialog(null)}
        onSubmit={submitProjekte}
        defaultValues={projekteDialog?.defaults}
        recordId={projekteDialog?.editing?.record_id}
        kundenList={data.kunden}
        beraterList={data.berater}
        enablePhotoScan={AI_PHOTO_SCAN['Projekte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Projekte']}
      />
      <AngeboteDialog
        open={angeboteDialog !== null}
        onClose={() => setAngeboteDialog(null)}
        onSubmit={submitAngebote}
        defaultValues={angeboteDialog?.defaults}
        recordId={angeboteDialog?.editing?.record_id}
        projekteList={data.projekte}
        beraterList={data.berater}
        enablePhotoScan={AI_PHOTO_SCAN['Angebote']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Angebote']}
      />
      <ZeiterfassungDialog
        open={zeiterfassungDialog !== null}
        onClose={() => setZeiterfassungDialog(null)}
        onSubmit={submitZeiterfassung}
        defaultValues={zeiterfassungDialog?.defaults}
        recordId={zeiterfassungDialog?.editing?.record_id}
        beraterList={data.berater}
        projekteList={data.projekte}
        leistungskatalogList={data.leistungskatalog}
        enablePhotoScan={AI_PHOTO_SCAN['Zeiterfassung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Zeiterfassung']}
      />
      <RechnungenDialog
        open={rechnungenDialog !== null}
        onClose={() => setRechnungenDialog(null)}
        onSubmit={submitRechnungen}
        defaultValues={rechnungenDialog?.defaults}
        recordId={rechnungenDialog?.editing?.record_id}
        kundenList={data.kunden}
        projekteList={data.projekte}
        beraterList={data.berater}
        zeiterfassungList={data.zeiterfassung}
        enablePhotoScan={AI_PHOTO_SCAN['Rechnungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Rechnungen']}
      />
      <PickExistingDialog
        open={pickBeraterLeistungskatalogAusfuehrendeBerater !== null}
        onClose={() => setPickBeraterLeistungskatalogAusfuehrendeBerater(null)}
        title={t('pick_title', { title: appLabel('leistungskatalog') })}
        items={data.leistungskatalog
          .filter(r => !extractRecordIds(r.fields.ausfuehrende_berater).includes(pickBeraterLeistungskatalogAusfuehrendeBerater ?? ''))
          .map(r => ({ id: r.record_id, label: String(r.fields.leistungsname ?? appLabel('leistungskatalog')) }))}
        onPick={linkBeraterLeistungskatalogAusfuehrendeBerater}
      />
      <PickExistingDialog
        open={pickBeraterRechnungen !== null}
        onClose={() => setPickBeraterRechnungen(null)}
        title={t('pick_title', { title: appLabel('rechnungen') })}
        items={data.rechnungen
          .filter(r => !extractRecordIds(r.fields.berater).includes(pickBeraterRechnungen ?? ''))
          .map(r => ({ id: r.record_id, label: String(r.fields.rechnungsnummer ?? appLabel('rechnungen')), hint: r.fields.rechnungsdatum ? String(r.fields.rechnungsdatum) : undefined }))}
        onPick={linkBeraterRechnungen}
      />
      <PickExistingDialog
        open={pickLeistungskatalogBeraterLeistungen !== null}
        onClose={() => setPickLeistungskatalogBeraterLeistungen(null)}
        title={t('pick_title', { title: appLabel('berater') })}
        items={data.berater
          .filter(r => !extractRecordIds(r.fields.leistungen).includes(pickLeistungskatalogBeraterLeistungen ?? ''))
          .map(r => ({ id: r.record_id, label: String(r.fields.vorname ?? appLabel('berater')), hint: r.fields.einstiegsdatum ? String(r.fields.einstiegsdatum) : undefined }))}
        onPick={linkLeistungskatalogBeraterLeistungen}
      />
      <PickExistingDialog
        open={pickProjekteBeraterZugewieseneProjekte !== null}
        onClose={() => setPickProjekteBeraterZugewieseneProjekte(null)}
        title={t('pick_title', { title: appLabel('berater') })}
        items={data.berater
          .filter(r => !extractRecordIds(r.fields.zugewiesene_projekte).includes(pickProjekteBeraterZugewieseneProjekte ?? ''))
          .map(r => ({ id: r.record_id, label: String(r.fields.vorname ?? appLabel('berater')), hint: r.fields.einstiegsdatum ? String(r.fields.einstiegsdatum) : undefined }))}
        onPick={linkProjekteBeraterZugewieseneProjekte}
      />
      <PickExistingDialog
        open={pickZeiterfassungRechnungen !== null}
        onClose={() => setPickZeiterfassungRechnungen(null)}
        title={t('pick_title', { title: appLabel('rechnungen') })}
        items={data.rechnungen
          .filter(r => !extractRecordIds(r.fields.zeiterfassungseintraege).includes(pickZeiterfassungRechnungen ?? ''))
          .map(r => ({ id: r.record_id, label: String(r.fields.rechnungsnummer ?? appLabel('rechnungen')), hint: r.fields.rechnungsdatum ? String(r.fields.rechnungsdatum) : undefined }))}
        onPick={linkZeiterfassungRechnungen}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'kunden') {
            return (
              <>
                <RecordHeader title={top.record.fields.kundenname ?? appLabel('kunden')} subtitle={top.record.fields.anlagedatum ? formatDate(top.record.fields.anlagedatum) : undefined} />
                <KundenDetails
                  record={top.record}
                  projekteList={data.projekte}
                  onOpenProjekte={(r) => detailProjekte(r, true)}
                  onAddProjekte={() => setProjekteDialog({ defaults: { kunde: createRecordUrl(APP_IDS.KUNDEN, top.record.record_id) } })}
                  rechnungenList={data.rechnungen}
                  onOpenRechnungen={(r) => detailRechnungen(r, true)}
                  onAddRechnungen={() => setRechnungenDialog({ defaults: { kunde: createRecordUrl(APP_IDS.KUNDEN, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'berater') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('berater')} subtitle={top.record.fields.einstiegsdatum ? formatDate(top.record.fields.einstiegsdatum) : undefined} />
                <BeraterDetails
                  record={top.record}
                  leistungskatalogList={data.leistungskatalog}
                  projekteList={data.projekte}
                  leistungskatalogAusfuehrendeBeraterList={data.leistungskatalog}
                  onOpenLeistungskatalogAusfuehrendeBerater={(r) => detailLeistungskatalog(r, true)}
                  onAddLeistungskatalogAusfuehrendeBerater={() => setLeistungskatalogDialog({ defaults: { ausfuehrende_berater: [createRecordUrl(APP_IDS.BERATER, top.record.record_id)] } })}
                  onPickLeistungskatalogAusfuehrendeBerater={() => setPickBeraterLeistungskatalogAusfuehrendeBerater(top.record.record_id)}
                  projekteProjektleitungList={data.projekte}
                  onOpenProjekteProjektleitung={(r) => detailProjekte(r, true)}
                  onAddProjekteProjektleitung={() => setProjekteDialog({ defaults: { projektleitung: createRecordUrl(APP_IDS.BERATER, top.record.record_id) } })}
                  angeboteList={data.angebote}
                  onOpenAngebote={(r) => detailAngebote(r, true)}
                  onAddAngebote={() => setAngeboteDialog({ defaults: { berater: createRecordUrl(APP_IDS.BERATER, top.record.record_id) } })}
                  zeiterfassungList={data.zeiterfassung}
                  onOpenZeiterfassung={(r) => detailZeiterfassung(r, true)}
                  onAddZeiterfassung={() => setZeiterfassungDialog({ defaults: { berater: createRecordUrl(APP_IDS.BERATER, top.record.record_id) } })}
                  rechnungenList={data.rechnungen}
                  onOpenRechnungen={(r) => detailRechnungen(r, true)}
                  onAddRechnungen={() => setRechnungenDialog({ defaults: { berater: [createRecordUrl(APP_IDS.BERATER, top.record.record_id)] } })}
                  onPickRechnungen={() => setPickBeraterRechnungen(top.record.record_id)}
                />
              </>
            );
          }
          if (top.type === 'leistungskatalog') {
            return (
              <>
                <RecordHeader title={top.record.fields.leistungsname ?? appLabel('leistungskatalog')} subtitle={undefined} />
                <LeistungskatalogDetails
                  record={top.record}
                  beraterList={data.berater}
                  beraterLeistungenList={data.berater}
                  onOpenBeraterLeistungen={(r) => detailBerater(r, true)}
                  onAddBeraterLeistungen={() => setBeraterDialog({ defaults: { leistungen: [createRecordUrl(APP_IDS.LEISTUNGSKATALOG, top.record.record_id)] } })}
                  onPickBeraterLeistungen={() => setPickLeistungskatalogBeraterLeistungen(top.record.record_id)}
                  zeiterfassungList={data.zeiterfassung}
                  onOpenZeiterfassung={(r) => detailZeiterfassung(r, true)}
                  onAddZeiterfassung={() => setZeiterfassungDialog({ defaults: { leistung: createRecordUrl(APP_IDS.LEISTUNGSKATALOG, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'projekte') {
            return (
              <>
                <RecordHeader title={top.record.fields.projektkennung ?? appLabel('projekte')} subtitle={undefined} />
                <ProjekteDetails
                  record={top.record}
                  kundenList={data.kunden}
                  onOpenKunden={(r) => detailKunden(r, true)}
                  beraterList={data.berater}
                  onOpenBerater={(r) => detailBerater(r, true)}
                  beraterZugewieseneProjekteList={data.berater}
                  onOpenBeraterZugewieseneProjekte={(r) => detailBerater(r, true)}
                  onAddBeraterZugewieseneProjekte={() => setBeraterDialog({ defaults: { zugewiesene_projekte: [createRecordUrl(APP_IDS.PROJEKTE, top.record.record_id)] } })}
                  onPickBeraterZugewieseneProjekte={() => setPickProjekteBeraterZugewieseneProjekte(top.record.record_id)}
                  angeboteList={data.angebote}
                  onOpenAngebote={(r) => detailAngebote(r, true)}
                  onAddAngebote={() => setAngeboteDialog({ defaults: { projekt: createRecordUrl(APP_IDS.PROJEKTE, top.record.record_id) } })}
                  zeiterfassungList={data.zeiterfassung}
                  onOpenZeiterfassung={(r) => detailZeiterfassung(r, true)}
                  onAddZeiterfassung={() => setZeiterfassungDialog({ defaults: { projekt: createRecordUrl(APP_IDS.PROJEKTE, top.record.record_id) } })}
                  rechnungenList={data.rechnungen}
                  onOpenRechnungen={(r) => detailRechnungen(r, true)}
                  onAddRechnungen={() => setRechnungenDialog({ defaults: { projekt: createRecordUrl(APP_IDS.PROJEKTE, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'angebote') {
            return (
              <>
                <RecordHeader title={top.record.fields.dauer ?? appLabel('angebote')} subtitle={top.record.fields.zeitrahmen_anfang ? formatDate(top.record.fields.zeitrahmen_anfang) : undefined} />
                <AngeboteDetails
                  record={top.record}
                  projekteList={data.projekte}
                  onOpenProjekte={(r) => detailProjekte(r, true)}
                  beraterList={data.berater}
                  onOpenBerater={(r) => detailBerater(r, true)}
                />
              </>
            );
          }
          if (top.type === 'zeiterfassung') {
            return (
              <>
                <RecordHeader title={appLabel('zeiterfassung')} subtitle={top.record.fields.datum ? formatDate(top.record.fields.datum) : undefined} />
                <ZeiterfassungDetails
                  record={top.record}
                  beraterList={data.berater}
                  onOpenBerater={(r) => detailBerater(r, true)}
                  projekteList={data.projekte}
                  onOpenProjekte={(r) => detailProjekte(r, true)}
                  leistungskatalogList={data.leistungskatalog}
                  onOpenLeistungskatalog={(r) => detailLeistungskatalog(r, true)}
                  rechnungenList={data.rechnungen}
                  onOpenRechnungen={(r) => detailRechnungen(r, true)}
                  onAddRechnungen={() => setRechnungenDialog({ defaults: { zeiterfassungseintraege: [createRecordUrl(APP_IDS.ZEITERFASSUNG, top.record.record_id)] } })}
                  onPickRechnungen={() => setPickZeiterfassungRechnungen(top.record.record_id)}
                />
              </>
            );
          }
          if (top.type === 'rechnungen') {
            return (
              <>
                <RecordHeader title={top.record.fields.rechnungsnummer ?? appLabel('rechnungen')} subtitle={top.record.fields.rechnungsdatum ? formatDate(top.record.fields.rechnungsdatum) : undefined} />
                <RechnungenDetails
                  record={top.record}
                  kundenList={data.kunden}
                  onOpenKunden={(r) => detailKunden(r, true)}
                  projekteList={data.projekte}
                  onOpenProjekte={(r) => detailProjekte(r, true)}
                  beraterList={data.berater}
                  zeiterfassungList={data.zeiterfassung}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'kunden') setKundenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'berater') setBeraterDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'leistungskatalog') setLeistungskatalogDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'projekte') setProjekteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'angebote') setAngeboteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'zeiterfassung') setZeiterfassungDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'rechnungen') setRechnungenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    kunden: {
      openCreate: (defaults?: KundenDialogDefaults) => setKundenDialog({ defaults }),
      openEdit: (record: Kunden) => setKundenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Kunden) => detailKunden(record, false),
    },
    berater: {
      openCreate: (defaults?: BeraterDialogDefaults) => setBeraterDialog({ defaults }),
      openEdit: (record: Berater) => setBeraterDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Berater) => detailBerater(record, false),
    },
    leistungskatalog: {
      openCreate: (defaults?: LeistungskatalogDialogDefaults) => setLeistungskatalogDialog({ defaults }),
      openEdit: (record: Leistungskatalog) => setLeistungskatalogDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Leistungskatalog) => detailLeistungskatalog(record, false),
    },
    projekte: {
      openCreate: (defaults?: ProjekteDialogDefaults) => setProjekteDialog({ defaults }),
      openEdit: (record: Projekte) => setProjekteDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Projekte) => detailProjekte(record, false),
    },
    angebote: {
      openCreate: (defaults?: AngeboteDialogDefaults) => setAngeboteDialog({ defaults }),
      openEdit: (record: Angebote) => setAngeboteDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Angebote) => detailAngebote(record, false),
    },
    zeiterfassung: {
      openCreate: (defaults?: ZeiterfassungDialogDefaults) => setZeiterfassungDialog({ defaults }),
      openEdit: (record: Zeiterfassung) => setZeiterfassungDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Zeiterfassung) => detailZeiterfassung(record, false),
    },
    rechnungen: {
      openCreate: (defaults?: RechnungenDialogDefaults) => setRechnungenDialog({ defaults }),
      openEdit: (record: Rechnungen) => setRechnungenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Rechnungen) => detailRechnungen(record, false),
    },
    enriched: { kunden: data.kunden, berater: enrichedBerater, leistungskatalog: enrichedLeistungskatalog, projekte: enrichedProjekte, angebote: enrichedAngebote, zeiterfassung: enrichedZeiterfassung, rechnungen: enrichedRechnungen },
  };
}
