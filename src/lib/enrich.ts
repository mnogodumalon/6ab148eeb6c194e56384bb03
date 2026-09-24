import type { EnrichedAngebote, EnrichedBerater, EnrichedLeistungskatalog, EnrichedProjekte, EnrichedRechnungen, EnrichedZeiterfassung } from '@/types/enriched';
import type { Angebote, Berater, Kunden, Leistungskatalog, Projekte, Rechnungen, Zeiterfassung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BeraterMaps {
  leistungskatalogMap: Map<string, Leistungskatalog>;
  projekteMap: Map<string, Projekte>;
}

export function enrichBerater(
  berater: Berater[],
  maps: BeraterMaps
): EnrichedBerater[] {
  return berater.map(r => ({
    ...r,
    leistungenName: resolveDisplay(r.fields.leistungen, maps.leistungskatalogMap, 'leistungsname'),
    zugewiesene_projekteName: resolveDisplay(r.fields.zugewiesene_projekte, maps.projekteMap, 'projektkennung'),
  }));
}

interface LeistungskatalogMaps {
  beraterMap: Map<string, Berater>;
}

export function enrichLeistungskatalog(
  leistungskatalog: Leistungskatalog[],
  maps: LeistungskatalogMaps
): EnrichedLeistungskatalog[] {
  return leistungskatalog.map(r => ({
    ...r,
    ausfuehrende_beraterName: resolveDisplay(r.fields.ausfuehrende_berater, maps.beraterMap, 'vorname', 'nachname'),
  }));
}

interface ProjekteMaps {
  kundenMap: Map<string, Kunden>;
  beraterMap: Map<string, Berater>;
}

export function enrichProjekte(
  projekte: Projekte[],
  maps: ProjekteMaps
): EnrichedProjekte[] {
  return projekte.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'kundenname'),
    projektleitungName: resolveDisplay(r.fields.projektleitung, maps.beraterMap, 'vorname', 'nachname'),
  }));
}

interface AngeboteMaps {
  projekteMap: Map<string, Projekte>;
  beraterMap: Map<string, Berater>;
}

export function enrichAngebote(
  angebote: Angebote[],
  maps: AngeboteMaps
): EnrichedAngebote[] {
  return angebote.map(r => ({
    ...r,
    projektName: resolveDisplay(r.fields.projekt, maps.projekteMap, 'projektkennung'),
    beraterName: resolveDisplay(r.fields.berater, maps.beraterMap, 'vorname', 'nachname'),
  }));
}

interface ZeiterfassungMaps {
  beraterMap: Map<string, Berater>;
  projekteMap: Map<string, Projekte>;
  leistungskatalogMap: Map<string, Leistungskatalog>;
}

export function enrichZeiterfassung(
  zeiterfassung: Zeiterfassung[],
  maps: ZeiterfassungMaps
): EnrichedZeiterfassung[] {
  return zeiterfassung.map(r => ({
    ...r,
    beraterName: resolveDisplay(r.fields.berater, maps.beraterMap, 'vorname', 'nachname'),
    projektName: resolveDisplay(r.fields.projekt, maps.projekteMap, 'projektkennung'),
    leistungName: resolveDisplay(r.fields.leistung, maps.leistungskatalogMap, 'leistungsname'),
  }));
}

interface RechnungenMaps {
  kundenMap: Map<string, Kunden>;
  projekteMap: Map<string, Projekte>;
  beraterMap: Map<string, Berater>;
  zeiterfassungMap: Map<string, Zeiterfassung>;
}

export function enrichRechnungen(
  rechnungen: Rechnungen[],
  maps: RechnungenMaps
): EnrichedRechnungen[] {
  return rechnungen.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'kundenname'),
    projektName: resolveDisplay(r.fields.projekt, maps.projekteMap, 'projektkennung'),
    beraterName: resolveDisplay(r.fields.berater, maps.beraterMap, 'vorname', 'nachname'),
    zeiterfassungseintraegeName: resolveDisplay(r.fields.zeiterfassungseintraege, maps.zeiterfassungMap, 'taetigkeit'),
  }));
}
