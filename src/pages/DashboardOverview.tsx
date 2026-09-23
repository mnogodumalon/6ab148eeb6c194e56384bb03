import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel } from '@/i18n';
import { gruss, useClock, namen, undoToast } from '@/lib/polish';
import { formatCurrency, formatDate, lookupKey } from '@/lib/formatters';
import { lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard, KanbanColumn } from '@/components/widgets/KanbanWidget';
import {
  IconAlertTriangle,
  IconPlus,
  IconClock,
  IconReceipt,
  IconFileText,
  IconBriefcase,
} from '@tabler/icons-react';
import { LOOKUP_OPTIONS } from '@/types/app';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    projekte, setProjekte,
    angebote,
    zeiterfassung,
    rechnungen,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data);
  const enrichedProjekte = crud.enriched.projekte;
  const enrichedAngebote = crud.enriched.angebote;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedBerater = crud.enriched.berater;

  const clock = useClock();
  const today = format(clock, 'yyyy-MM-dd');

  // --- Filter state ---
  const [projektFilter, setProjektFilter] = useState<string | null>(null);

  // --- Derived data ---

  // Offene / überfällige Rechnungen
  const offeneRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => {
      const status = lookupKey(r.fields.rechnungsstatus);
      return status === 'versendet' || status === 'ueberfaellig';
    }),
    [enrichedRechnungen]
  );

  const ueberfaelligeRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => {
      const status = lookupKey(r.fields.rechnungsstatus);
      const faellig = r.fields.faelligkeitsdatum;
      return status === 'versendet' && faellig && faellig < today;
    }),
    [enrichedRechnungen, today]
  );

  // Stunden aktueller Monat je Berater
  const currentMonth = format(clock, 'yyyy-MM');
  const stundenProBerater = useMemo(() => {
    const map = new Map<string, number>();
    zeiterfassung.forEach(z => {
      const bid = z.fields.berater ? z.fields.berater.split('/').pop() ?? '' : '';
      if (!bid) return;
      const monat = z.fields.erfassungsjahr
        ? `${z.fields.erfassungsjahr}-${String(z.fields.erfassungsmonat?.key === 'januar' ? 1 : z.fields.erfassungsmonat?.key === 'februar' ? 2 : z.fields.erfassungsmonat?.key === 'maerz' ? 3 : z.fields.erfassungsmonat?.key === 'april' ? 4 : z.fields.erfassungsmonat?.key === 'mai' ? 5 : z.fields.erfassungsmonat?.key === 'juni' ? 6 : z.fields.erfassungsmonat?.key === 'juli' ? 7 : z.fields.erfassungsmonat?.key === 'august' ? 8 : z.fields.erfassungsmonat?.key === 'september' ? 9 : z.fields.erfassungsmonat?.key === 'oktober' ? 10 : z.fields.erfassungsmonat?.key === 'november' ? 11 : 12).padStart(2, '0')}`
        : '';
      if (!monat || !monat.startsWith(currentMonth.slice(0, 4))) return;
      const cur = map.get(bid) ?? 0;
      map.set(bid, cur + (z.fields.stunden ?? 0));
    });
    return map;
  }, [zeiterfassung, currentMonth]);

  // Total stunden dieser Monat
  const totalStundenMonat = useMemo(() => {
    return enrichedBerater.reduce((sum, b) => sum + (b.fields.stunden_aktueller_monat ?? 0), 0);
  }, [enrichedBerater]);

  // Angebote im Status Entwurf oder Versendet
  const aktiveAngebote = useMemo(() =>
    enrichedAngebote.filter(a => {
      const s = lookupKey(a.fields.angebotsstatus);
      return s === 'entwurf' || s === 'versendet';
    }),
    [enrichedAngebote]
  );

  // Projekte nach Status
  const projekteInBearbeitung = useMemo(() =>
    enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'),
    [enrichedProjekte]
  );

  // Offener Rechnungsbetrag
  const offenerBetrag = useMemo(() =>
    offeneRechnungen.reduce((sum, r) => sum + (r.fields.gesamtbetrag ?? r.fields.nettobetrag ?? 0), 0),
    [offeneRechnungen]
  );

  // --- Kanban columns ---
  const kanbanColumns: KanbanColumn[] = useMemo(() =>
    (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? 'primary' as const
        : o.key === 'abgeschlossen' ? 'success' as const
        : 'default' as const,
    })),
    []
  );

  const kanbanCards: KanbanCard[] = useMemo(() => {
    const filtered = projektFilter
      ? enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === projektFilter)
      : enrichedProjekte;
    return filtered.map(p => ({
      id: `projekt:${p.record_id}`,
      column: lookupKey(p.fields.projektstatus) ?? '',
      title: p.fields.projektkennung ?? p.fields.projektart?.label ?? tx('Ohne Kennung'),
      subtitle: (
        <span className="text-xs text-muted-foreground">
          {p.kundeName && <span className="font-medium">{p.kundeName}</span>}
          {p.projektleitungName && <span> · {p.projektleitungName}</span>}
          {p.fields.letzter_schritt && (
            <span className="block truncate mt-0.5 text-muted-foreground/70">
              {p.fields.letzter_schritt}
            </span>
          )}
        </span>
      ),
    }));
  }, [enrichedProjekte, projektFilter]);

  // --- Card move handler (optimistic) ---
  const handleCardMove = async (cardId: string, newColumn: string) => {
    const id = cardId.split(':')[1];
    const projekt = projekte.find(p => p.record_id === id);
    if (!projekt) return;

    const prevStatus = projekt.fields.projektstatus;
    const newStatusOption = lookupOption('projekte', 'projektstatus', newColumn);

    // Optimistic update
    setProjekte(prev => prev.map(p =>
      p.record_id === id
        ? { ...p, fields: { ...p.fields, projektstatus: newStatusOption } }
        : p
    ));

    const label = newStatusOption.label;

    undoToast(
      tx`Projektstatus → ${label}`,
      async () => {
        setProjekte(prev => prev.map(p =>
          p.record_id === id
            ? { ...p, fields: { ...p.fields, projektstatus: prevStatus } }
            : p
        ));
        await LivingAppsService.updateProjekteEntry(id, { projektstatus: lookupKey(prevStatus) }).catch(() => fetchAll());
      }
    );

    LivingAppsService.updateProjekteEntry(id, { projektstatus: newColumn }).catch(() => {
      fetchAll();
    });
  };

  // --- Hero: überfällige Rechnungen ---
  const markRechnungBezahlt = async (id: string) => {
    const rechnung = rechnungen.find(r => r.record_id === id);
    if (!rechnung) return;
    const prev = rechnung.fields.rechnungsstatus;
    const newStatus = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');

    undoToast(
      tx`Rechnung als bezahlt markiert`,
      async () => {
        await LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: 'versendet' }).catch(() => fetchAll());
        fetchAll();
      }
    );
    await LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: 'bezahlt' }).catch(() => fetchAll());
    fetchAll();
  };

  // Greeting context line
  const kundenNamen = useMemo(() => {
    return projekteInBearbeitung
      .map(p => p.kundeName)
      .filter(Boolean)
      .slice(0, 3);
  }, [projekteInBearbeitung]);

  const contextLine = useMemo(() => {
    if (projekteInBearbeitung.length === 0) {
      return tx('Noch keine aktiven Projekte — lege das erste an.');
    }
    if (kundenNamen.length > 0) {
      return tx`${namen(kundenNamen)} — aktive Projekte in Bearbeitung.`;
    }
    return tx`${projekteInBearbeitung.length} Projekte aktuell in Bearbeitung.`;
  }, [projekteInBearbeitung, kundenNamen]);

  // --- KPI strip values (resolved inside component body) ---
  const statusOptions = LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? [];
  const inBearbeitungLabel = statusOptions.find(o => o.key === 'in_bearbeitung')?.label ?? tx('In Bearbeitung');
  const akquiseLabel = statusOptions.find(o => o.key === 'akquise')?.label ?? tx('Akquise');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{contextLine}</p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 shrink-0"
          onClick={() => crud.projekte.openCreate({ projektstatus: 'akquise' })}
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={ueberfaelligeRechnungen.length > 0 && (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{
              label: tx('Als bezahlt markieren'),
              onClick: () => markRechnungBezahlt(ueberfaelligeRechnungen[0].record_id),
            }}
          >
            <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? r.fields.rechnungsnummer ?? ''))}</b>
            {' '}{tx('— Rechnung überfällig seit')}{' '}
            {formatDate(ueberfaelligeRechnungen[0].fields.faelligkeitsdatum)}.
          </HeroBanner>
        )}
        kpis={
          <StatStrip>
            <StatStripItem
              title={inBearbeitungLabel}
              value={projekteInBearbeitung.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone={projekteInBearbeitung.length > 0 ? 'primary' : 'default'}
              onClick={() => setProjektFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={projektFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={akquiseLabel}
              value={enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise').length}
              icon={<IconFileText size={16} className="shrink-0" />}
              tone="default"
              onClick={() => setProjektFilter(f => f === 'akquise' ? null : 'akquise')}
              active={projektFilter === 'akquise'}
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length > 0 ? formatCurrency(offenerBetrag) : '—'}
              icon={<IconReceipt size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
              onClick={() => crud.rechnungen.openCreate({ rechnungsstatus: 'entwurf' })}
            />
            <StatStripItem
              title={tx('Stunden diesen Monat')}
              value={totalStundenMonat > 0 ? `${totalStundenMonat} h` : '—'}
              icon={<IconClock size={16} className="shrink-0" />}
              tone="default"
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={kanbanColumns}
            cards={kanbanCards}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={card => {
              const id = card.id.split(':')[1];
              const rec = projekte.find(p => p.record_id === id);
              if (rec) crud.projekte.openDetail(rec);
            }}
            onCardMove={handleCardMove}
            onAddCard={columnKey =>
              crud.projekte.openCreate({ projektstatus: columnKey })
            }
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene & überfällige Rechnungen')}
              items={offeneRechnungen
                .sort((a, b) => {
                  const fa = a.fields.faelligkeitsdatum ?? '';
                  const fb = b.fields.faelligkeitsdatum ?? '';
                  return fa < fb ? -1 : fa > fb ? 1 : 0;
                })
                .map(r => {
                  const isOverdue = ueberfaelligeRechnungen.some(u => u.record_id === r.record_id);
                  return {
                    id: r.record_id,
                    title: r.kundeName || r.fields.rechnungsnummer || tx('Unbekannt'),
                    secondLine: (
                      <>
                        <span className={isOverdue ? 'font-medium text-destructive' : 'font-medium text-amber-600'}>
                          {isOverdue ? tx('Überfällig') : tx('Ausstehend')}
                        </span>
                        {r.fields.faelligkeitsdatum && (
                          <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
                        )}
                        {r.fields.gesamtbetrag != null && (
                          <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)}</span>
                        )}
                      </>
                    ),
                    action: isOverdue
                      ? {
                          label: tx('Bezahlt'),
                          onClick: () => markRechnungBezahlt(r.record_id),
                        }
                      : undefined,
                  };
                })}
              onItemClick={id => {
                const rec = rechnungen.find(r => r.record_id === id);
                if (rec) crud.rechnungen.openDetail(rec);
              }}
              empty={{
                text: tx('Keine offenen Rechnungen — alles beglichen.'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({ rechnungsstatus: 'entwurf' }) },
              }}
            />
            <WorkList
              title={tx('Angebote in Bearbeitung')}
              items={aktiveAngebote
                .sort((a, b) => {
                  const sa = lookupKey(a.fields.angebotsstatus) ?? '';
                  const sb = lookupKey(b.fields.angebotsstatus) ?? '';
                  return sa.localeCompare(sb);
                })
                .map(a => {
                  const status = lookupKey(a.fields.angebotsstatus);
                  return {
                    id: a.record_id,
                    title: a.projektName || a.fields.angebotstyp?.label || tx('Angebot'),
                    secondLine: (
                      <>
                        <span className={status === 'versendet' ? 'font-medium text-amber-600' : 'font-medium text-muted-foreground'}>
                          {a.fields.angebotsstatus?.label ?? status}
                        </span>
                        {a.beraterName && (
                          <span className="text-muted-foreground"> · {a.beraterName}</span>
                        )}
                        {a.fields.kostenbetrag != null && (
                          <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
                        )}
                      </>
                    ),
                    action: status === 'entwurf'
                      ? {
                          label: tx('Versenden'),
                          onClick: async () => {
                            const prev = a.fields.angebotsstatus;
                            undoToast(
                              tx`Angebot → Versendet`,
                              async () => {
                                await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: lookupKey(prev) }).catch(() => fetchAll());
                                fetchAll();
                              }
                            );
                            await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' }).catch(() => fetchAll());
                            fetchAll();
                          },
                        }
                      : undefined,
                  };
                })}
              onItemClick={id => {
                const rec = angebote.find(a => a.record_id === id);
                if (rec) crud.angebote.openDetail(rec);
              }}
              empty={{
                text: tx('Keine offenen Angebote.'),
                action: { label: tx('Neues Angebot'), onClick: () => crud.angebote.openCreate({ angebotsstatus: 'entwurf' }) },
              }}
            />
          </>
        }
      />

      {/* Stundenübersicht Berater */}
      {enrichedBerater.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">{tx('Stunden diesen Monat — je Berater:in')}</h2>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => crud.zeiterfassung.openCreate({})}
            >
              <IconPlus size={14} className="inline shrink-0 mr-0.5" />
              {tx('Zeit erfassen')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {enrichedBerater
              .filter(b => b.fields.status?.key !== 'sonstiges')
              .sort((a, b) => (b.fields.stunden_aktueller_monat ?? 0) - (a.fields.stunden_aktueller_monat ?? 0))
              .map(b => {
                const stunden = b.fields.stunden_aktueller_monat ?? 0;
                const name = [b.fields.vorname, b.fields.nachname].filter(Boolean).join(' ') || tx('Unbekannt');
                const status = b.fields.status;
                return (
                  <button
                    key={b.record_id}
                    className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 hover:bg-muted/50 text-left w-full"
                    onClick={() => crud.berater.openDetail(b)}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{name}</div>
                      {status && status.key !== 'aktiv' && (
                        <div className="text-xs text-muted-foreground truncate">{status.label}</div>
                      )}
                    </div>
                    <div className="text-sm font-semibold shrink-0 ml-3 tabular-nums">
                      <span className={stunden > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                        {stunden} h
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {crud.surfaces}
    </div>
  );
}
