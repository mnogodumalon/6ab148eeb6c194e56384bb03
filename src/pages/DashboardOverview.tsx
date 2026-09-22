import { useMemo, useState } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { APP_IDS, LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupKey, formatDate, formatCurrency } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { downloadCsv } from '@/lib/export';
import { tx, appLabel } from '@/i18n';
import { DashboardGrid } from '@/components/DashboardGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import {
  KanbanWidget,
  type KanbanCard,
  type KanbanColumn,
} from '@/components/widgets/KanbanWidget';
import {
  IconAlertCircle,
  IconBriefcase,
  IconClock,
  IconFileInvoice,
  IconReceipt,
  IconDownload,
  IconPlus,
} from '@tabler/icons-react';
import { format } from 'date-fns';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    projekte,
    setProjekte,
    angebote,
    rechnungen,
    zeiterfassung,
    kunden,
    berater,
    kundenMap,
    beraterMap,
    leistungskatalogMap,
    projekteMap,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const rec = (crud.enriched.rechnungen).find(r => r.record_id === top.record.record_id);
        if (!rec) return undefined;
        const status = lookupKey(rec.fields.rechnungsstatus);
        if (status === 'entwurf') return { label: tx('Versenden'), onClick: () => markRechnungVersendet(rec.record_id) };
        if (status === 'versendet') return { label: tx('Als bezahlt markieren'), onClick: () => markRechnungBezahlt(rec.record_id) };
      }
      if (top.type === 'angebote') {
        const rec = (crud.enriched.angebote).find(a => a.record_id === top.record.record_id);
        if (!rec) return undefined;
        const status = lookupKey(rec.fields.angebotsstatus);
        if (status === 'entwurf') return { label: tx('Versenden'), onClick: () => advanceAngebot(rec.record_id, 'versendet') };
        if (status === 'versendet') return { label: tx('Als angenommen markieren'), onClick: () => advanceAngebot(rec.record_id, 'angenommen') };
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte;
  const enrichedAngebote = crud.enriched.angebote;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;
  const enrichedRechnungen = crud.enriched.rechnungen;

  const clock = useClock();
  const [projektFilter, setProjektFilter] = useState<string | null>(null);

  // Current month/year for Zeiterfassung KPI
  const currentMonth = format(clock, 'MM');
  const currentYear = Number(format(clock, 'yyyy'));
  const monthKey = format(clock, 'yyyy-MM');

  // Month key mapping (lookup keys → month number strings)
  const MONAT_KEY_MAP: Record<string, string> = {
    januar: '01', februar: '02', maerz: '03', april: '04',
    mai: '05', juni: '06', juli: '07', august: '08',
    september: '09', oktober: '10', november: '11', dezember: '12',
  };

  // Stunden laufender Monat
  const stundenMonat = useMemo(() => {
    return enrichedZeiterfassung
      .filter(z => {
        const monatKey = lookupKey(z.fields.erfassungsmonat);
        const monatNr = monatKey ? MONAT_KEY_MAP[monatKey] : undefined;
        const jahr = z.fields.erfassungsjahr;
        return monatNr === currentMonth && jahr === currentYear;
      })
      .reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0);
  }, [enrichedZeiterfassung, currentMonth, currentYear]);

  // Offene Rechnungen (versendet + überfällig)
  const offeneRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => {
      const s = lookupKey(r.fields.rechnungsstatus);
      return s === 'versendet' || s === 'ueberfaellig';
    }),
    [enrichedRechnungen],
  );

  const ueberfaelligeRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'),
    [enrichedRechnungen],
  );

  // Angebote im Status 'versendet' (warten auf Rückmeldung)
  const wartendeAngebote = useMemo(
    () => enrichedAngebote.filter(a => lookupKey(a.fields.angebotsstatus) === 'versendet'),
    [enrichedAngebote],
  );

  // Projekte gefiltert
  const filteredProjekte = useMemo(() => {
    if (!projektFilter) return enrichedProjekte;
    return enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === projektFilter);
  }, [enrichedProjekte, projektFilter]);

  // Context line
  const aktiveNames = useMemo(() => {
    const akt = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung');
    return namen(akt.map(p => p.fields.projektkennung ?? '').filter(Boolean));
  }, [enrichedProjekte]);

  const contextLine = useMemo(() => {
    const inBearbeitung = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung').length;
    const akquise = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise').length;
    if (inBearbeitung === 0 && akquise === 0) {
      return tx('Noch keine Projekte angelegt — lege jetzt das erste Projekt an.');
    }
    if (aktiveNames) {
      return tx`${aktiveNames} in Bearbeitung${akquise > 0 ? tx` · ${akquise} in Akquise` : ''}.`;
    }
    return tx`${inBearbeitung} Projekte aktiv${akquise > 0 ? tx` · ${akquise} in Akquise` : ''}.`;
  }, [enrichedProjekte, aktiveNames]);

  // Kanban columns — inside component body (locale-aware getter)
  const PROJEKT_COLUMNS = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? 'primary' : o.key === 'akquise' ? 'warning' : 'default',
    })) as KanbanColumn[],
    [],
  );

  const kanbanCards = useMemo<KanbanCard[]>(
    () => filteredProjekte.map(p => {
      const status = lookupKey(p.fields.projektstatus) ?? 'akquise';
      return {
        id: `projekt:${p.record_id}`,
        column: status,
        title: p.fields.projektkennung ?? p.fields.projektart?.label ?? tx('Unbenanntes Projekt'),
        subtitle: p.kundeName || undefined,
        tone: status === 'in_bearbeitung' ? 'primary' : status === 'akquise' ? 'warning' : 'default',
      } as KanbanCard;
    }),
    [filteredProjekte],
  );

  // Status-Advance Helpers
  const markRechnungVersendet = async (id: string) => {
    const prev = rechnungen.find(r => r.record_id === id);
    if (!prev) return;
    const snapshot = prev.fields.rechnungsstatus;
    data.setRechnungen(rs => rs.map(r => r.record_id === id
      ? { ...r, fields: { ...r.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'versendet') } }
      : r));
    try {
      await LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: 'versendet' });
      undoToast(tx('Rechnung als versendet markiert'), async () => {
        data.setRechnungen(rs => rs.map(r => r.record_id === id
          ? { ...r, fields: { ...r.fields, rechnungsstatus: snapshot } }
          : r));
        await LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: lookupKey(snapshot) ?? 'entwurf' });
      });
    } catch {
      await fetchAll();
    }
  };

  const markRechnungBezahlt = async (id: string) => {
    const prev = rechnungen.find(r => r.record_id === id);
    if (!prev) return;
    const snapshot = prev.fields.rechnungsstatus;
    data.setRechnungen(rs => rs.map(r => r.record_id === id
      ? { ...r, fields: { ...r.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt') } }
      : r));
    try {
      await LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: 'bezahlt' });
      undoToast(tx('Rechnung als bezahlt markiert'), async () => {
        data.setRechnungen(rs => rs.map(r => r.record_id === id
          ? { ...r, fields: { ...r.fields, rechnungsstatus: snapshot } }
          : r));
        await LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: lookupKey(snapshot) ?? 'versendet' });
      });
    } catch {
      await fetchAll();
    }
  };

  const advanceAngebot = async (id: string, newStatus: string) => {
    const prev = angebote.find(a => a.record_id === id);
    if (!prev) return;
    const snapshot = prev.fields.angebotsstatus;
    data.setAngebote(as => as.map(a => a.record_id === id
      ? { ...a, fields: { ...a.fields, angebotsstatus: lookupOption('angebote', 'angebotsstatus', newStatus) } }
      : a));
    try {
      await LivingAppsService.updateAngeboteEntry(id, { angebotsstatus: newStatus });
      undoToast(tx('Angebotsstatus aktualisiert'), async () => {
        data.setAngebote(as => as.map(a => a.record_id === id
          ? { ...a, fields: { ...a.fields, angebotsstatus: snapshot } }
          : a));
        await LivingAppsService.updateAngeboteEntry(id, { angebotsstatus: lookupKey(snapshot) ?? 'entwurf' });
      });
    } catch {
      await fetchAll();
    }
  };

  // Move card = change Projektstatus
  const moveCard = async (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    const prev = projekte.find(p => p.record_id === rid);
    if (!prev) return;
    const snapshot = prev.fields.projektstatus;
    setProjekte(ps => ps.map(p => p.record_id === rid
      ? { ...p, fields: { ...p.fields, projektstatus: lookupOption('projekte', 'projektstatus', newColumn) } }
      : p));
    try {
      await LivingAppsService.updateProjekteEntry(rid, { projektstatus: newColumn });
      undoToast(tx('Projektstatus aktualisiert'), async () => {
        setProjekte(ps => ps.map(p => p.record_id === rid
          ? { ...p, fields: { ...p.fields, projektstatus: snapshot } }
          : p));
        await LivingAppsService.updateProjekteEntry(rid, { projektstatus: lookupKey(snapshot) ?? 'akquise' });
      });
    } catch {
      await fetchAll();
    }
  };

  // Exports
  const handleExportRechnungen = () => {
    downloadCsv(rechnungen, [
      { key: 'rechnungsnummer', label: tx('Rechnungsnummer') },
      { key: 'rechnungsdatum', label: tx('Rechnungsdatum') },
      { key: 'faelligkeitsdatum', label: tx('Fälligkeitsdatum') },
      { key: 'rechnungsstatus', label: tx('Status') },
      { key: 'rechnungsmonat', label: tx('Monat') },
      { key: 'rechnungsjahr', label: tx('Jahr') },
      { key: 'kunde', label: tx('Kunde'), value: (r) => {
        const id = r.fields.kunde?.match?.(/([a-f0-9]{24})$/i)?.[1];
        return id ? kundenMap.get(id)?.fields.kundenname : undefined;
      }},
      { key: 'projekt', label: appLabel('projekte'), value: (r) => {
        const id = r.fields.projekt?.match?.(/([a-f0-9]{24})$/i)?.[1];
        return id ? projekteMap.get(id)?.fields.projektkennung : undefined;
      }},
      { key: 'nettobetrag', label: tx('Nettobetrag') },
      { key: 'mehrwertsteuer', label: tx('Mehrwertsteuer') },
      { key: 'gesamtbetrag', label: tx('Gesamtbetrag') },
      { key: 'notizen', label: tx('Notizen') },
    ], {
      filename: 'rechnungen',
      groupBy: { label: tx('Jahr'), value: (r) => String(r.fields.rechnungsjahr ?? '') },
    });
  };

  const handleExportAngebote = () => {
    downloadCsv(angebote, [
      { key: 'angebotsnummer', label: tx('Angebotsnummer') },
      { key: 'angebotsjahr', label: tx('Jahr') },
      { key: 'angebotstyp', label: tx('Typ') },
      { key: 'angebotsstatus', label: tx('Status') },
      { key: 'zeitrahmen_anfang', label: tx('Zeitrahmen Anfang') },
      { key: 'zeitrahmen_ende', label: tx('Zeitrahmen Ende') },
      { key: 'dauer', label: tx('Dauer') },
      { key: 'kostentyp', label: tx('Kostentyp') },
      { key: 'kostenbetrag', label: tx('Kostenbetrag') },
      { key: 'projekt', label: appLabel('projekte'), value: (r) => {
        const id = r.fields.projekt?.match?.(/([a-f0-9]{24})$/i)?.[1];
        return id ? projekteMap.get(id)?.fields.projektkennung : undefined;
      }},
      { key: 'berater', label: appLabel('berater'), value: (r) => {
        const id = r.fields.berater?.match?.(/([a-f0-9]{24})$/i)?.[1];
        if (!id) return undefined;
        const b = beraterMap.get(id);
        return b ? `${b.fields.vorname ?? ''} ${b.fields.nachname ?? ''}`.trim() : undefined;
      }},
      { key: 'beschreibung', label: tx('Beschreibung') },
    ], {
      filename: 'angebote',
      groupBy: { label: tx('Jahr'), value: (r) => String(r.fields.angebotsjahr ?? '') },
    });
  };

  const handleExportZeiterfassung = () => {
    downloadCsv(zeiterfassung, [
      { key: 'datum', label: tx('Datum') },
      { key: 'erfassungsmonat', label: tx('Monat') },
      { key: 'erfassungsjahr', label: tx('Jahr') },
      { key: 'berater', label: appLabel('berater'), value: (r) => {
        const id = r.fields.berater?.match?.(/([a-f0-9]{24})$/i)?.[1];
        if (!id) return undefined;
        const b = beraterMap.get(id);
        return b ? `${b.fields.vorname ?? ''} ${b.fields.nachname ?? ''}`.trim() : undefined;
      }},
      { key: 'projekt', label: appLabel('projekte'), value: (r) => {
        const id = r.fields.projekt?.match?.(/([a-f0-9]{24})$/i)?.[1];
        return id ? projekteMap.get(id)?.fields.projektkennung : undefined;
      }},
      { key: 'leistung', label: appLabel('leistungskatalog'), value: (r) => {
        const id = r.fields.leistung?.match?.(/([a-f0-9]{24})$/i)?.[1];
        return id ? leistungskatalogMap.get(id)?.fields.leistungsname : undefined;
      }},
      { key: 'stunden', label: tx('Stunden') },
      { key: 'abrechenbar', label: tx('Abrechenbar') },
      { key: 'taetigkeit', label: tx('Tätigkeit') },
    ], {
      filename: 'zeiterfassung',
      groupBy: { label: tx('Jahr'), value: (r) => String(r.fields.erfassungsjahr ?? '') },
    });
  };

  // KPI derived values
  const inBearbeitungCount = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung').length;
  const akquiseCount = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise').length;
  const offeneRechnungenSumme = offeneRechnungen.reduce((s, r) => s + (r.fields.gesamtbetrag ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{gruss(clock)}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{contextLine}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 mt-2 sm:mt-0">
          <button
            onClick={handleExportRechnungen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <IconDownload size={14} className="shrink-0" />
            {tx('Rechnungen (zeitlich strukturiert)')}
          </button>
          <button
            onClick={handleExportAngebote}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <IconDownload size={14} className="shrink-0" />
            {tx('Angebote pro Jahr')}
          </button>
          <button
            onClick={handleExportZeiterfassung}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <IconDownload size={14} className="shrink-0" />
            {tx('Zeiterfassung (monatlich)')}
          </button>
        </div>
      </div>

      <DashboardGrid
        variant="wide"
        hero={ueberfaelligeRechnungen.length > 0 && (
          <HeroBanner
            icon={<IconAlertCircle size={18} />}
            action={{
              label: tx('Als bezahlt markieren'),
              onClick: () => markRechnungBezahlt(ueberfaelligeRechnungen[0].record_id),
            }}
          >
            <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName || r.fields.rechnungsnummer || ''))}</b>
            {' '}{ueberfaelligeRechnungen.length === 1 ? tx('— Rechnung überfällig') : tx`— ${ueberfaelligeRechnungen.length} Rechnungen überfällig`}
            {ueberfaelligeRechnungen[0].fields.faelligkeitsdatum ? tx` · fällig seit ${formatDate(ueberfaelligeRechnungen[0].fields.faelligkeitsdatum)}` : ''}
          </HeroBanner>
        )}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('In Bearbeitung')}
              value={inBearbeitungCount}
              icon={<IconBriefcase size={16} />}
              tone={inBearbeitungCount > 0 ? 'primary' : 'default'}
              onClick={() => setProjektFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={projektFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={tx('Akquise')}
              value={akquiseCount}
              icon={<IconBriefcase size={16} />}
              tone={akquiseCount > 0 ? 'warning' : 'default'}
              onClick={() => setProjektFilter(f => f === 'akquise' ? null : 'akquise')}
              active={projektFilter === 'akquise'}
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length > 0 ? formatCurrency(offeneRechnungenSumme) : '—'}
              icon={<IconFileInvoice size={16} />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Stunden (lfd. Monat)')}
              value={stundenMonat > 0 ? `${stundenMonat} h` : '—'}
              icon={<IconClock size={16} />}
              tone="default"
            />
            <StatStripItem
              title={tx('Wartende Angebote')}
              value={wartendeAngebote.length}
              icon={<IconReceipt size={16} />}
              tone={wartendeAngebote.length > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            cards={kanbanCards}
            columns={PROJEKT_COLUMNS}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={card => {
              const rid = card.id.split(':')[1];
              const proj = enrichedProjekte.find(p => p.record_id === rid);
              if (proj) crud.projekte.openDetail(proj);
            }}
            onCardMove={moveCard}
            onAddCard={column => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene Rechnungen')}
              items={offeneRechnungen.slice(0, 8).map(r => ({
                id: r.record_id,
                title: r.kundeName || r.fields.rechnungsnummer || tx('Rechnung'),
                secondLine: (
                  <>
                    <span className={`font-medium ${lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig' ? 'text-destructive' : 'text-amber-600'}`}>
                      {r.fields.rechnungsstatus?.label}
                    </span>
                    {r.fields.faelligkeitsdatum && (
                      <span className="text-muted-foreground">
                        {' · '}{tx('fällig')}: {formatDate(r.fields.faelligkeitsdatum)}
                      </span>
                    )}
                    {r.fields.gesamtbetrag != null && (
                      <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)}</span>
                    )}
                  </>
                ),
                action: lookupKey(r.fields.rechnungsstatus) === 'versendet'
                  ? { label: tx('Bezahlt'), onClick: () => markRechnungBezahlt(r.record_id) }
                  : undefined,
              }))}
              onItemClick={id => {
                const r = enrichedRechnungen.find(x => x.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Keine offenen Rechnungen — alles beglichen.'),
                action: { label: tx('Rechnung erstellen'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />
            <WorkList
              title={tx('Wartende Angebote')}
              items={wartendeAngebote.slice(0, 6).map(a => ({
                id: a.record_id,
                title: a.projektName || `${tx('Angebot')} #${a.fields.angebotsnummer ?? ''}`,
                secondLine: (
                  <>
                    <span className="font-medium text-amber-600">{tx('Warten auf Rückmeldung')}</span>
                    {a.fields.zeitrahmen_anfang && (
                      <span className="text-muted-foreground"> · {tx('ab')} {formatDate(a.fields.zeitrahmen_anfang)}</span>
                    )}
                    {a.fields.kostenbetrag != null && (
                      <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
                    )}
                  </>
                ),
                action: { label: tx('Angenommen'), onClick: () => advanceAngebot(a.record_id, 'angenommen') },
              }))}
              onItemClick={id => {
                const a = enrichedAngebote.find(x => x.record_id === id);
                if (a) crud.angebote.openDetail(a);
              }}
              empty={{
                text: tx('Keine Angebote in Wartestellung.'),
                action: { label: tx('Angebot erstellen'), onClick: () => crud.angebote.openCreate({}) },
              }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
