import { useState, useMemo } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { lookupOption, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';
import {
  IconAlertTriangle,
  IconBriefcase,
  IconClock,
  IconFileInvoice,
  IconPlus,
  IconChartBar,
} from '@tabler/icons-react';
import type { EnrichedProjekte, EnrichedRechnungen, EnrichedZeiterfassung } from '@/types/enriched';
import type { Rechnungen } from '@/types/app';
import { format } from 'date-fns';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    berater, projekte, angebote, zeiterfassung, rechnungen,
    setProjekte, setRechnungen, fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'projekte') {
        const p = top.record as EnrichedProjekte;
        const status = lookupKey(p.fields.projektstatus);
        if (status === 'akquise') {
          return {
            label: tx('In Bearbeitung setzen'),
            onClick: () => advanceProjektStatus(p, 'in_bearbeitung'),
          };
        }
        if (status === 'in_bearbeitung') {
          return {
            label: tx('Als abgeschlossen markieren'),
            onClick: () => advanceProjektStatus(p, 'abgeschlossen'),
          };
        }
      }
      if (top.type === 'rechnungen') {
        const r = top.record as EnrichedRechnungen;
        const status = lookupKey(r.fields.rechnungsstatus);
        if (status === 'versendet' || status === 'ueberfaellig') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: () => markRechnungBezahlt(r),
          };
        }
        if (status === 'entwurf') {
          return {
            label: tx('Als versendet markieren'),
            onClick: () => markRechnungVersendet(r),
          };
        }
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte as EnrichedProjekte[];
  const enrichedRechnungen = crud.enriched.rechnungen as EnrichedRechnungen[];
  const enrichedZeiterfassung = crud.enriched.zeiterfassung as EnrichedZeiterfassung[];

  const clock = useClock();

  const currentMonthKey = format(clock, 'yyyy-MM');
  const currentMonthName = format(clock, 'MMMM yyyy');

  // --- Status filter for Projekte ---
  const [projektFilter, setProjektFilter] = useState<string | null>(null);

  // --- Derived data ---
  const offeneRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => {
      const s = lookupKey(r.fields.rechnungsstatus);
      return s === 'versendet' || s === 'ueberfaellig' || s === 'entwurf';
    }),
    [enrichedRechnungen]
  );

  const ueberfaelligeRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'),
    [enrichedRechnungen]
  );

  const aktiveProjekte = useMemo(
    () => enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'),
    [enrichedProjekte]
  );

  const akquiseProjekte = useMemo(
    () => enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise'),
    [enrichedProjekte]
  );

  // Current month time entries
  const currentMonthZeit = useMemo(
    () => zeiterfassung.filter(z => {
      if (!z.fields.datum) return false;
      return z.fields.datum.startsWith(currentMonthKey);
    }),
    [zeiterfassung, currentMonthKey]
  );

  const currentMonthStunden = useMemo(
    () => currentMonthZeit.reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0),
    [currentMonthZeit]
  );

  const totalOffenerBetrag = useMemo(
    () => offeneRechnungen.reduce((sum, r) => sum + (r.fields.gesamtbetrag ?? r.fields.nettobetrag ?? 0), 0),
    [offeneRechnungen]
  );

  // Angebote offen (Entwurf + Versendet)
  const offeneAngebote = useMemo(
    () => angebote.filter(a => {
      const s = lookupKey(a.fields.angebotsstatus);
      return s === 'entwurf' || s === 'versendet';
    }),
    [angebote]
  );

  // Context line names
  const projektNamen = useMemo(
    () => aktiveProjekte.map(p => p.fields.projektkennung ?? p.kundeName ?? '').filter(Boolean),
    [aktiveProjekte]
  );

  const contextLine = useMemo(() => {
    if (aktiveProjekte.length === 0 && akquiseProjekte.length === 0) {
      return tx('Lege das erste Projekt an, um loszulegen.');
    }
    if (ueberfaelligeRechnungen.length > 0) {
      const kundenNamen = ueberfaelligeRechnungen.map(r => r.kundeName).filter(Boolean);
      return tx`${namen(kundenNamen)} — überfällige Rechnung(en) warten auf Begleichung.`;
    }
    if (aktiveProjekte.length > 0) {
      return tx`Aktiv: ${namen(projektNamen)} — ${String(aktiveProjekte.length)} Projekte laufen.`;
    }
    return tx`${String(akquiseProjekte.length)} Projekte in der Akquise-Phase.`;
  }, [aktiveProjekte, akquiseProjekte, ueberfaelligeRechnungen, projektNamen]);

  // --- Write helpers ---
  async function advanceProjektStatus(p: EnrichedProjekte, newStatus: string) {
    const prevStatus = p.fields.projektstatus;
    const newLookup = lookupOption('projekte', 'projektstatus', newStatus);
    // Optimistic update
    setProjekte(prev => prev.map(r =>
      r.record_id === p.record_id
        ? { ...r, fields: { ...r.fields, projektstatus: newLookup } }
        : r
    ));
    undoToast(
      tx`${p.fields.projektkennung ?? p.kundeName ?? ''} — Status geändert`,
      async () => {
        setProjekte(prev => prev.map(r =>
          r.record_id === p.record_id
            ? { ...r, fields: { ...r.fields, projektstatus: prevStatus } }
            : r
        ));
        await LivingAppsService.updateProjekteEntry(p.record_id, { projektstatus: lookupKey(prevStatus) });
      }
    );
    try {
      await LivingAppsService.updateProjekteEntry(p.record_id, { projektstatus: newStatus });
    } catch {
      fetchAll();
    }
  }

  async function markRechnungBezahlt(r: EnrichedRechnungen) {
    const prevStatus = r.fields.rechnungsstatus;
    const newLookup = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');
    setRechnungen(prev => prev.map(rec =>
      rec.record_id === r.record_id
        ? { ...rec, fields: { ...rec.fields, rechnungsstatus: newLookup } }
        : rec
    ));
    undoToast(
      tx`Rechnung ${r.fields.rechnungsnummer ?? ''} — als bezahlt markiert`,
      async () => {
        setRechnungen(prev => prev.map(rec =>
          rec.record_id === r.record_id
            ? { ...rec, fields: { ...rec.fields, rechnungsstatus: prevStatus } }
            : rec
        ));
        await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: lookupKey(prevStatus) });
      }
    );
    try {
      await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
    } catch {
      fetchAll();
    }
  }

  async function markRechnungVersendet(r: Rechnungen) {
    const prevStatus = r.fields.rechnungsstatus;
    const newLookup = lookupOption('rechnungen', 'rechnungsstatus', 'versendet');
    setRechnungen(prev => prev.map(rec =>
      rec.record_id === r.record_id
        ? { ...rec, fields: { ...rec.fields, rechnungsstatus: newLookup } }
        : rec
    ));
    undoToast(
      tx`Rechnung ${r.fields.rechnungsnummer ?? ''} — versendet`,
      async () => {
        setRechnungen(prev => prev.map(rec =>
          rec.record_id === r.record_id
            ? { ...rec, fields: { ...rec.fields, rechnungsstatus: prevStatus } }
            : rec
        ));
        await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: lookupKey(prevStatus) });
      }
    );
    try {
      await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'versendet' });
    } catch {
      fetchAll();
    }
  }

  // --- Kanban ---
  const projektColumns = useMemo(
    () => (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? 'primary' as const
          : o.key === 'abgeschlossen' ? 'success' as const
          : 'default' as const,
    })),
    []
  );

  const projektCards = useMemo(
    () => enrichedProjekte
      .filter(p => !projektFilter || lookupKey(p.fields.projektstatus) === projektFilter)
      .map(p => ({
        id: `projekte:${p.record_id}`,
        column: lookupKey(p.fields.projektstatus) ?? '',
        title: p.fields.projektkennung ?? p.kundeName ?? tx('Unbenannt'),
        subtitle: p.kundeName
          ? (p.fields.projektkennung ? p.kundeName : undefined)
          : undefined,
        tone: lookupKey(p.fields.projektstatus) === 'in_bearbeitung' ? 'primary' as const : 'default' as const,
      })),
    [enrichedProjekte, projektFilter]
  );

  async function handleCardMove(cardId: string, newColumn: string) {
    const id = cardId.split(':')[1];
    const p = projekte.find(r => r.record_id === id);
    if (!p) return;
    const prevStatus = p.fields.projektstatus;
    const newLookup = lookupOption('projekte', 'projektstatus', newColumn);
    setProjekte(prev => prev.map(r =>
      r.record_id === id
        ? { ...r, fields: { ...r.fields, projektstatus: newLookup } }
        : r
    ));
    undoToast(
      tx`${p.fields.projektkennung ?? ''} — Status geändert`,
      async () => {
        setProjekte(prev => prev.map(r =>
          r.record_id === id
            ? { ...r, fields: { ...r.fields, projektstatus: prevStatus } }
            : r
        ));
        await LivingAppsService.updateProjekteEntry(id, { projektstatus: lookupKey(prevStatus) });
      }
    );
    try {
      await LivingAppsService.updateProjekteEntry(id, { projektstatus: newColumn });
    } catch {
      fetchAll();
    }
  }

  // --- Chart rows for Rechnungen by month ---
  const rechnungenChartRows = useMemo(
    (): ChartRow<EnrichedRechnungen>[] =>
      enrichedRechnungen
        .filter(r => r.fields.rechnungsdatum)
        .map(r => ({ id: `rechnungen:${r.record_id}`, data: r })),
    [enrichedRechnungen]
  );

  // --- Chart rows for Zeiterfassung by Berater ---
  const zeitChartRows = useMemo(
    (): ChartRow<EnrichedZeiterfassung>[] =>
      enrichedZeiterfassung.map(z => ({ id: `zeit:${z.record_id}`, data: z })),
    [enrichedZeiterfassung]
  );

  // --- WorkList: offene Rechnungen ---
  const rechnungItems = useMemo(
    () => offeneRechnungen
      .sort((a, b) => {
        const fa = a.fields.faelligkeitsdatum ?? '';
        const fb = b.fields.faelligkeitsdatum ?? '';
        return fa.localeCompare(fb);
      })
      .slice(0, 8)
      .map(r => {
        const status = lookupKey(r.fields.rechnungsstatus);
        const isUeberfaellig = status === 'ueberfaellig';
        return {
          id: r.record_id,
          title: r.kundeName || r.fields.rechnungsnummer || tx('Rechnung'),
          secondLine: (
            <span className="flex gap-2 text-xs flex-wrap">
              <span className={isUeberfaellig ? 'font-medium text-destructive' : 'text-amber-600'}>
                {isUeberfaellig ? tx('Überfällig') : lookupKey(r.fields.rechnungsstatus) === 'entwurf' ? tx('Entwurf') : tx('Versendet')}
              </span>
              {r.fields.faelligkeitsdatum && (
                <span className="text-muted-foreground">{formatDate(r.fields.faelligkeitsdatum)}</span>
              )}
              {(r.fields.gesamtbetrag ?? r.fields.nettobetrag) != null && (
                <span className="text-muted-foreground">{formatCurrency(r.fields.gesamtbetrag ?? r.fields.nettobetrag)}</span>
              )}
            </span>
          ),
          action: lookupKey(r.fields.rechnungsstatus) !== 'entwurf'
            ? { label: tx('✓ Bezahlt'), onClick: () => markRechnungBezahlt(r) }
            : { label: tx('Versenden'), onClick: () => markRechnungVersendet(r) },
        };
      }),
    [offeneRechnungen]
  );

  // --- WorkList: aktuelle Stunden je Berater ---
  const beraterStundenItems = useMemo(
    () => berater
      .filter(b => b.fields.status && lookupKey(b.fields.status) === 'aktiv')
      .map(b => {
        const stunden = b.fields.stunden_aktueller_monat ?? 0;
        return {
          id: b.record_id,
          title: `${b.fields.vorname ?? ''} ${b.fields.nachname ?? ''}`.trim() || tx('Berater'),
          secondLine: (
            <span className="text-xs text-muted-foreground">
              {tx`${String(stunden)} Std. — ${currentMonthName}`}
            </span>
          ),
        };
      })
      .sort((a, b) => String(a.title).localeCompare(String(b.title))),
    [berater, currentMonthName]
  );

  // Empty state
  const isEmpty = projekte.length === 0 && rechnungen.length === 0;

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1">{tx('Starte mit dem ERP und lege die ersten Daten an.')}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-[27px] bg-card border border-border">
          <IconBriefcase size={48} className="text-muted-foreground" />
          <div className="text-center">
            <h2 className="font-semibold text-lg mb-1">{tx('Noch keine Projekte')}</h2>
            <p className="text-muted-foreground text-sm max-w-xs">{tx('Lege dein erstes Projekt an, um die Verwaltung zu starten.')}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={() => crud.projekte.openCreate({})}
          >
            <IconPlus size={16} />
            {tx('Erstes Projekt anlegen')}
          </button>
        </div>
        {crud.surfaces}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{contextLine}</p>
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          onClick={() => crud.projekte.openCreate({})}
        >
          <IconPlus size={16} />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={ueberfaelligeRechnungen.length > 0 ? (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{
              label: tx('Als bezahlt markieren'),
              onClick: () => markRechnungBezahlt(ueberfaelligeRechnungen[0]),
            }}
          >
            <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName).filter(Boolean))}</b>
            {' '}{tx('— überfällige Rechnung(en) müssen beglichen werden.')}
            {ueberfaelligeRechnungen[0]?.fields.faelligkeitsdatum && (
              <span className="ml-1 text-sm opacity-80">
                {tx`Fällig seit: ${formatDate(ueberfaelligeRechnungen[0].fields.faelligkeitsdatum)}`}
              </span>
            )}
          </HeroBanner>
        ) : undefined}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={aktiveProjekte.length}
              icon={<IconBriefcase size={16} />}
              tone={aktiveProjekte.length > 0 ? 'primary' : 'default'}
              onClick={() => setProjektFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={projektFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={tx('Akquise')}
              value={akquiseProjekte.length}
              icon={<IconChartBar size={16} />}
              tone={akquiseProjekte.length > 0 ? 'warning' : 'default'}
              onClick={() => setProjektFilter(f => f === 'akquise' ? null : 'akquise')}
              active={projektFilter === 'akquise'}
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length}
              icon={<IconFileInvoice size={16} />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Offener Betrag')}
              value={formatCurrency(totalOffenerBetrag)}
              icon={<IconFileInvoice size={16} />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : 'default'}
            />
            <StatStripItem
              title={tx('Std. aktueller Monat')}
              value={`${currentMonthStunden} h`}
              icon={<IconClock size={16} />}
              tone="default"
            />
            <StatStripItem
              title={tx('Offene Angebote')}
              value={offeneAngebote.length}
              icon={<IconChartBar size={16} />}
              tone={offeneAngebote.length > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={projektColumns}
            cards={projektCards}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={(card) => {
              const id = card.id.split(':')[1];
              const p = enrichedProjekte.find(r => r.record_id === id);
              if (p) crud.projekte.openDetail(p);
            }}
            onCardMove={handleCardMove}
            onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene Rechnungen')}
              items={rechnungItems}
              onItemClick={(id) => {
                const r = enrichedRechnungen.find(rec => rec.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Alle Rechnungen beglichen — super!'),
                action: {
                  label: tx('Neue Rechnung'),
                  onClick: () => crud.rechnungen.openCreate({}),
                },
              }}
            />
            <WorkList
              title={tx('Stundenübersicht — aktueller Monat')}
              items={beraterStundenItems}
              onItemClick={(id) => {
                const b = berater.find(r => r.record_id === id);
                if (b) crud.berater.openDetail(b);
              }}
              empty={{
                text: tx('Keine aktiven Berater erfasst.'),
                action: {
                  label: tx('Berater anlegen'),
                  onClick: () => crud.berater.openCreate({}),
                },
              }}
            />
          </>
        }
      />

      {/* Bottom band: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartWidget
          title={tx('Umsatz pro Monat')}
          rows={rechnungenChartRows}
          dimension={{
            kind: 'time',
            accessor: (row) => row.data.fields.rechnungsdatum ?? null,
          }}
          measure={{
            aggregate: 'sum',
            label: tx('Nettobetrag'),
            value: (row) => row.data.fields.nettobetrag ?? null,
            format: 'currency',
          }}
        />
        <ChartWidget
          title={tx('Stunden pro Berater')}
          rows={zeitChartRows}
          dimension={{
            kind: 'category',
            accessor: (row) => row.data.beraterName || tx('Unbekannt'),
          }}
          measure={{
            aggregate: 'sum',
            label: tx('Stunden'),
            value: (row) => row.data.fields.stunden ?? null,
            format: 'number',
          }}
        />
      </div>

      {crud.surfaces}
    </div>
  );
}
