import { useState, useMemo } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedProjekte, EnrichedRechnungen, EnrichedAngebote } from '@/types/enriched';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatCurrency, formatDate, lookupKey } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { tx, appLabel } from '@/i18n';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard } from '@/components/widgets/KanbanWidget';
import {
  IconAlertTriangle,
  IconBriefcase,
  IconFileInvoice,
  IconClock,
  IconPlus,
  IconCurrencyEuro,
} from '@tabler/icons-react';
import { format } from 'date-fns';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    projekte, setProjekte, fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const r = top.record as EnrichedRechnungen;
        const status = lookupKey(r.fields.rechnungsstatus);
        if (status === 'versendet' || status === 'ueberfaellig') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: async () => {
              const prev = r.fields.rechnungsstatus;
              await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
              undoToast(tx`${r.fields.rechnungsnummer ?? '—'} — als bezahlt markiert`, async () => {
                await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: lookupKey(prev) ?? 'versendet' });
                fetchAll();
              });
              fetchAll();
            },
          };
        }
      }
      if (top.type === 'angebote') {
        const a = top.record as EnrichedAngebote;
        const status = lookupKey(a.fields.angebotsstatus);
        if (status === 'entwurf') {
          return {
            label: tx('Als versendet markieren'),
            onClick: async () => {
              await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
              undoToast(tx`Angebot ${a.fields.angebotsnummer ?? '—'} — versendet`, async () => {
                await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'entwurf' });
                fetchAll();
              });
              fetchAll();
            },
          };
        }
        if (status === 'versendet') {
          return {
            label: tx('Als angenommen markieren'),
            onClick: async () => {
              await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'angenommen' });
              undoToast(tx`Angebot ${a.fields.angebotsnummer ?? '—'} — angenommen`, async () => {
                await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
                fetchAll();
              });
              fetchAll();
            },
          };
        }
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte as EnrichedProjekte[];
  const enrichedRechnungen = crud.enriched.rechnungen as EnrichedRechnungen[];
  const enrichedAngebote = crud.enriched.angebote as EnrichedAngebote[];

  const clock = useClock();
  const today = format(clock, 'yyyy-MM-dd');

  const [projektFilter, setProjektFilter] = useState<string | null>(null);

  // Projekte nach Status
  const aktive = useMemo(() => enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'), [enrichedProjekte]);
  const akquise = useMemo(() => enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise'), [enrichedProjekte]);

  // Rechnungen: offen + überfällig
  const offeneRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => {
      const st = lookupKey(r.fields.rechnungsstatus);
      return st === 'versendet' || st === 'entwurf';
    }), [enrichedRechnungen]);

  const ueberfaelligeRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => {
      const st = lookupKey(r.fields.rechnungsstatus);
      if (st === 'bezahlt' || st === 'storniert') return false;
      if (st === 'ueberfaellig') return true;
      const faellig = r.fields.faelligkeitsdatum;
      return !!faellig && faellig < today;
    }), [enrichedRechnungen, today]);

  // Angebote: offen (Entwurf + Versendet)
  const offeneAngebote = useMemo(() =>
    enrichedAngebote.filter(a => {
      const st = lookupKey(a.fields.angebotsstatus);
      return st === 'entwurf' || st === 'versendet';
    }), [enrichedAngebote]);

  // Gesamtstunden aktueller Monat (aus Berater-Feld)
  const gesamtstundenMonat = useMemo(() =>
    data.berater.reduce((sum, b) => sum + (b.fields.stunden_aktueller_monat ?? 0), 0),
    [data.berater]);

  // Offener Rechnungsbetrag
  const offenerBetrag = useMemo(() =>
    offeneRechnungen.reduce((sum, r) => sum + (r.fields.gesamtbetrag ?? r.fields.nettobetrag ?? 0), 0),
    [offeneRechnungen]);

  // Kanban: Status → Tone
  const statusTone = (key: string) => {
    if (key === 'in_bearbeitung') return 'primary' as const;
    if (key === 'akquise') return 'warning' as const;
    if (key === 'abgeschlossen') return 'success' as const;
    return 'default' as const;
  };

  const projektColumns = useMemo(() =>
    (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: statusTone(o.key),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const projektCards = useMemo((): KanbanCard[] => {
    const source = projektFilter
      ? enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === projektFilter)
      : enrichedProjekte;
    return source.map(p => ({
      id: p.record_id,
      column: lookupKey(p.fields.projektstatus) ?? '',
      title: p.fields.projektkennung ?? p.fields.projektnummer?.toString() ?? tx('Kein Titel'),
      subtitle: p.kundeName ? p.kundeName : undefined,
      tone: statusTone(lookupKey(p.fields.projektstatus) ?? ''),
    }));
  }, [enrichedProjekte, projektFilter]);

  const handleCardMove = async (cardId: string, newColumn: string) => {
    const projekt = projekte.find(p => p.record_id === cardId);
    if (!projekt) return;
    const prev = projekt.fields.projektstatus;
    // Optimistic update
    setProjekte(prev_ => prev_.map(p =>
      p.record_id === cardId
        ? { ...p, fields: { ...p.fields, projektstatus: lookupOption('projekte', 'projektstatus', newColumn) } }
        : p
    ));
    try {
      await LivingAppsService.updateProjekteEntry(cardId, { projektstatus: newColumn });
      const colLabel = projektColumns.find(c => c.key === newColumn)?.label ?? newColumn;
      undoToast(tx`${projekt.fields.projektkennung ?? '—'} — nach ${colLabel} verschoben`, async () => {
        const prevKey = lookupKey(prev) ?? 'akquise';
        setProjekte(prev_ => prev_.map(p =>
          p.record_id === cardId
            ? { ...p, fields: { ...p.fields, projektstatus: lookupOption('projekte', 'projektstatus', prevKey) } }
            : p
        ));
        await LivingAppsService.updateProjekteEntry(cardId, { projektstatus: prevKey });
      });
    } catch {
      fetchAll();
    }
  };

  // Hero: überfällige Rechnungen
  const heroBanner = ueberfaelligeRechnungen.length > 0 ? (
    <HeroBanner
      icon={<IconAlertTriangle size={18} />}
      action={{
        label: tx('Als bezahlt markieren'),
        onClick: async () => {
          const r = ueberfaelligeRechnungen[0];
          await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
          undoToast(tx`${r.fields.rechnungsnummer ?? '—'} — als bezahlt markiert`, async () => {
            await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'ueberfaellig' });
            fetchAll();
          });
          fetchAll();
        },
      }}
    >
      <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? r.fields.rechnungsnummer ?? ''))}</b>
      {' — '}{tx('überfällige Rechnungen')} ({ueberfaelligeRechnungen.length})
    </HeroBanner>
  ) : undefined;

  // Context line
  const contextLine = useMemo(() => {
    const aktiveNames = aktive.slice(0, 3).map(p => p.fields.projektkennung ?? p.kundeName ?? '').filter(Boolean);
    if (aktiveNames.length > 0) {
      return tx`${aktive.length} Projekte laufen — ${namen(aktiveNames)}`;
    }
    if (akquise.length > 0) {
      return tx`${akquise.length} Projekte in Akquise`;
    }
    return tx('Noch keine Projekte angelegt.');
  }, [aktive, akquise]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.projekte.openCreate({})}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroBanner}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={aktive.length}
              icon={<IconBriefcase size={16} />}
              tone={aktive.length > 0 ? 'primary' : 'default'}
              onClick={() => setProjektFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={projektFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={tx('In Akquise')}
              value={akquise.length}
              icon={<IconBriefcase size={16} />}
              tone={akquise.length > 0 ? 'warning' : 'default'}
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
              value={formatCurrency(offenerBetrag)}
              icon={<IconCurrencyEuro size={16} />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offenerBetrag > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Stunden (Monat)')}
              value={gesamtstundenMonat}
              icon={<IconClock size={16} />}
              tone="default"
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={projektColumns}
            cards={projektCards}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={(card) => {
              const p = enrichedProjekte.find(p => p.record_id === card.id);
              if (p) crud.projekte.openDetail(p);
            }}
            onCardMove={handleCardMove}
            onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene & überfällige Rechnungen')}
              items={[...ueberfaelligeRechnungen, ...offeneRechnungen.filter(r => !ueberfaelligeRechnungen.includes(r))].slice(0, 8).map(r => {
                const isUeberfaellig = ueberfaelligeRechnungen.includes(r);
                const status = lookupKey(r.fields.rechnungsstatus);
                return {
                  id: r.record_id,
                  title: r.kundeName || r.fields.rechnungsnummer || tx('Unbekannt'),
                  secondLine: (
                    <>
                      <span className={isUeberfaellig ? 'font-medium text-destructive' : 'font-medium text-amber-600'}>
                        {isUeberfaellig ? tx('Überfällig') : (status === 'entwurf' ? tx('Entwurf') : tx('Versendet'))}
                      </span>
                      {r.fields.faelligkeitsdatum && (
                        <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
                      )}
                      {r.fields.gesamtbetrag != null && (
                        <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)}</span>
                      )}
                    </>
                  ),
                  action: isUeberfaellig || status === 'versendet' ? {
                    label: tx('Bezahlt'),
                    onClick: async () => {
                      const prev = r.fields.rechnungsstatus;
                      await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                      undoToast(tx`${r.fields.rechnungsnummer ?? '—'} — bezahlt`, async () => {
                        await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: lookupKey(prev) ?? 'versendet' });
                        fetchAll();
                      });
                      fetchAll();
                    },
                  } : undefined,
                };
              })}
              onItemClick={(id) => {
                const r = enrichedRechnungen.find(r => r.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Alle Rechnungen beglichen — keine offenen Posten.'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />
            <WorkList
              title={tx('Angebote in Bearbeitung')}
              items={offeneAngebote.slice(0, 6).map(a => {
                const status = lookupKey(a.fields.angebotsstatus);
                return {
                  id: a.record_id,
                  title: a.projektName || tx('Kein Projekt'),
                  secondLine: (
                    <>
                      <span className={status === 'entwurf' ? 'font-medium text-muted-foreground' : 'font-medium text-primary'}>
                        {status === 'entwurf' ? tx('Entwurf') : tx('Versendet')}
                      </span>
                      {a.fields.kostenbetrag != null && (
                        <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
                      )}
                      {a.beraterName && (
                        <span className="text-muted-foreground"> · {a.beraterName}</span>
                      )}
                    </>
                  ),
                  action: status === 'entwurf' ? {
                    label: tx('Versenden'),
                    onClick: async () => {
                      await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
                      undoToast(tx`Angebot ${a.fields.angebotsnummer ?? '—'} — versendet`, async () => {
                        await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'entwurf' });
                        fetchAll();
                      });
                      fetchAll();
                    },
                  } : {
                    label: tx('Angenommen'),
                    onClick: async () => {
                      await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'angenommen' });
                      undoToast(tx`Angebot ${a.fields.angebotsnummer ?? '—'} — angenommen`, async () => {
                        await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
                        fetchAll();
                      });
                      fetchAll();
                    },
                  },
                };
              })}
              onItemClick={(id) => {
                const a = enrichedAngebote.find(a => a.record_id === id);
                if (a) crud.angebote.openDetail(a);
              }}
              empty={{
                text: tx('Keine offenen Angebote.'),
                action: { label: tx('Neues Angebot'), onClick: () => crud.angebote.openCreate({}) },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
