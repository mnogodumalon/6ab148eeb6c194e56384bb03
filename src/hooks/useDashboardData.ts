import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kunden, Berater, Leistungskatalog, Projekte, Angebote, Zeiterfassung, Rechnungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { t } from '@/i18n';

/** Dashboard data + the OPTIMISTIC-WRITE API.
 *
 *  The per-entity setters (`set<Entity>`) are exported for exactly one job:
 *  optimistic updates on drag writes (onEventDrop / onEventResize /
 *  onCardMove). Call the setter FIRST — the bar/card lands instantly — then
 *  fire the PATCH in the background and call `fetchAll()` ONLY in the catch.
 *  Never await the PATCH before updating state (the UI freezes for the full
 *  round-trip on every drag) and never refetch after a successful write.
 *  There is no other mechanism (no `__optimistic`, no `mutate`).
 */
/** Entities this hook can load — the same keys the journey layer uses. */
export type DashboardEntity = 'kunden' | 'berater' | 'leistungskatalog' | 'projekte' | 'angebote' | 'zeiterfassung' | 'rechnungen';

export interface DashboardDataOptions {
  /** Entities this page does NOT need (picked through useRecordSearch instead).
   *  Every flow page mounts this hook on its own route, so without `omit` a
   *  page that searches 3.000 guests server-side would still pull all 3.000
   *  through the side door. */
  omit?: DashboardEntity[];
}

export function useDashboardData(options: DashboardDataOptions = {}) {
  // A string key, not the array: an inline `omit={['gaeste']}` is a new array
  // on every render and would restart the fetch forever.
  const omitKey = (options.omit ?? []).slice().sort().join('|');
  const [kunden, setKunden] = useState<Kunden[]>([]);
  const [berater, setBerater] = useState<Berater[]>([]);
  const [leistungskatalog, setLeistungskatalog] = useState<Leistungskatalog[]>([]);
  const [projekte, setProjekte] = useState<Projekte[]>([]);
  const [angebote, setAngebote] = useState<Angebote[]>([]);
  const [zeiterfassung, setZeiterfassung] = useState<Zeiterfassung[]>([]);
  const [rechnungen, setRechnungen] = useState<Rechnungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    const omit = new Set(omitKey ? omitKey.split('|') : []);
    try {
      const [kundenData, beraterData, leistungskatalogData, projekteData, angeboteData, zeiterfassungData, rechnungenData] = await Promise.all([
        omit.has('kunden') ? Promise.resolve([] as Kunden[]) : LivingAppsService.getKunden(),
        omit.has('berater') ? Promise.resolve([] as Berater[]) : LivingAppsService.getBerater(),
        omit.has('leistungskatalog') ? Promise.resolve([] as Leistungskatalog[]) : LivingAppsService.getLeistungskatalog(),
        omit.has('projekte') ? Promise.resolve([] as Projekte[]) : LivingAppsService.getProjekte(),
        omit.has('angebote') ? Promise.resolve([] as Angebote[]) : LivingAppsService.getAngebote(),
        omit.has('zeiterfassung') ? Promise.resolve([] as Zeiterfassung[]) : LivingAppsService.getZeiterfassung(),
        omit.has('rechnungen') ? Promise.resolve([] as Rechnungen[]) : LivingAppsService.getRechnungen(),
      ]);
      setKunden(kundenData);
      setBerater(beraterData);
      setLeistungskatalog(leistungskatalogData);
      setProjekte(projekteData);
      setAngebote(angeboteData);
      setZeiterfassung(zeiterfassungData);
      setRechnungen(rechnungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(t('data_load_failed')));
    } finally {
      setLoading(false);
    }
  }, [omitKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    const omit = new Set(omitKey ? omitKey.split('|') : []);
    async function silentRefresh() {
      try {
        const [kundenData, beraterData, leistungskatalogData, projekteData, angeboteData, zeiterfassungData, rechnungenData] = await Promise.all([
          omit.has('kunden') ? Promise.resolve([] as Kunden[]) : LivingAppsService.getKunden(),
          omit.has('berater') ? Promise.resolve([] as Berater[]) : LivingAppsService.getBerater(),
          omit.has('leistungskatalog') ? Promise.resolve([] as Leistungskatalog[]) : LivingAppsService.getLeistungskatalog(),
          omit.has('projekte') ? Promise.resolve([] as Projekte[]) : LivingAppsService.getProjekte(),
          omit.has('angebote') ? Promise.resolve([] as Angebote[]) : LivingAppsService.getAngebote(),
          omit.has('zeiterfassung') ? Promise.resolve([] as Zeiterfassung[]) : LivingAppsService.getZeiterfassung(),
          omit.has('rechnungen') ? Promise.resolve([] as Rechnungen[]) : LivingAppsService.getRechnungen(),
        ]);
        setKunden(kundenData);
        setBerater(beraterData);
        setLeistungskatalog(leistungskatalogData);
        setProjekte(projekteData);
        setAngebote(angeboteData);
        setZeiterfassung(zeiterfassungData);
        setRechnungen(rechnungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    // assistant:data-changed comes from the assistant (<la-klar-assistant>)
    // after every mutation. The element additionally fires the legacy
    // dashboard-refresh event for OLD deployed bundles — do NOT subscribe to
    // both here, or every mutation fetches twice.
    window.addEventListener('assistant:data-changed', handleRefresh);
    return () => window.removeEventListener('assistant:data-changed', handleRefresh);
  }, [omitKey]);

  const kundenMap = useMemo(() => {
    const m = new Map<string, Kunden>();
    kunden.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kunden]);

  const beraterMap = useMemo(() => {
    const m = new Map<string, Berater>();
    berater.forEach(r => m.set(r.record_id, r));
    return m;
  }, [berater]);

  const leistungskatalogMap = useMemo(() => {
    const m = new Map<string, Leistungskatalog>();
    leistungskatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [leistungskatalog]);

  const projekteMap = useMemo(() => {
    const m = new Map<string, Projekte>();
    projekte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [projekte]);

  const zeiterfassungMap = useMemo(() => {
    const m = new Map<string, Zeiterfassung>();
    zeiterfassung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [zeiterfassung]);

  return { kunden, setKunden, berater, setBerater, leistungskatalog, setLeistungskatalog, projekte, setProjekte, angebote, setAngebote, zeiterfassung, setZeiterfassung, rechnungen, setRechnungen, loading, error, fetchAll, kundenMap, beraterMap, leistungskatalogMap, projekteMap, zeiterfassungMap };
}

/** The hook's return — the `data` prop of DashboardOverview in the Ready-Wrapper form. */
export type DashboardData = ReturnType<typeof useDashboardData>;