import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel } from '@/i18n';
import { lookupKey, formatCurrency, formatDate } from '@/lib/formatters';
import { lookupOption } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard } from '@/components/widgets/KanbanWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import type { ChartRow } from '@/components/widgets/ChartWidget';
import {
  IconAlertTriangle,
  IconBriefcase,
  IconFileInvoice,
  IconClockHour4,
  IconChartBar,
} from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    projekte, angebote, rechnungen, berater, zeiterfassung,
    setProjekte, setRechnungen,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const r = top.record;
        const status = lookupKey(r.fields.rechnungsstatus);
        if (status === 'entwurf') return { label: tx('Versenden'), onClick: () => advanceRechnung(r, 'versendet') };
        if (status === 'versendet') return { label: tx('Als bezahlt markieren'), onClick: () => advanceRechnung(r, 'bezahlt') };
      }
      if (top.type === 'projekte') {
        const p = top.record;
        const status = lookupKey(p.fields.projektstatus);
        if (status === 'akquise') return { label: tx('In Bearbeitung setzen'), onClick: () => advanceProjekt(p, 'in_bearbeitung') };
        if (status === 'in_bearbeitung') return { label: tx('Abschließen'), onClick: () => advanceProjekt(p, 'abgeschlossen') };
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedAngebote = crud.enriched.angebote;

  const clock = useClock();
  const currentMonthKey = format(clock, 'yyyy-MM');

  // Projekt-Advance
  const advanceProjekt = async (p: typeof projekte[0], newStatus: string) => {
    const prev = p.fields.projektstatus;
    const newLookup = lookupOption('projekte', 'projektstatus', newStatus);
    setProjekte(ps => ps.map(x => x.record_id === p.record_id ? { ...x, fields: { ...x.fields, projektstatus: newLookup } } : x));
    try {
      await LivingAppsService.updateProjekteEntry(p.record_id, { projektstatus: newStatus });
      undoToast(tx`${p.fields.projektkennung ?? ''} — Status aktualisiert`, async () => {
        setProjekte(ps => ps.map(x => x.record_id === p.record_id ? { ...x, fields: { ...x.fields, projektstatus: prev } } : x));
        await LivingAppsService.updateProjekteEntry(p.record_id, { projektstatus: lookupKey(prev) });
      });
    } catch {
      fetchAll();
    }
  };

  // Rechnung-Advance
  const advanceRechnung = async (r: typeof rechnungen[0], newStatus: string) => {
    const prev = r.fields.rechnungsstatus;
    const newLookup = lookupOption('rechnungen', 'rechnungsstatus', newStatus);
    setRechnungen(rs => rs.map(x => x.record_id === r.record_id ? { ...x, fields: { ...x.fields, rechnungsstatus: newLookup } } : x));
    try {
      await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: newStatus });
      undoToast(tx`${r.fields.rechnungsnummer ?? ''} — Status aktualisiert`, async () => {
        setRechnungen(rs => rs.map(x => x.record_id === r.record_id ? { ...x, fields: { ...x.fields, rechnungsstatus: prev } } : x));
        await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: lookupKey(prev) });
      });
    } catch {
      fetchAll();
    }
  };

  // Kanban-Status-Filter für Projekte
  const [projektFilter, setProjektFilter] = useState<string | null>(null);

  // Überfällige Rechnungen
  const ueberfaelligeRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'),
    [enrichedRechnungen]
  );

  // Offene Rechnungen (Entwurf + Versendet + Überfällig)
  const offeneRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => {
      const s = lookupKey(r.fields.rechnungsstatus);
      return s === 'entwurf' || s === 'versendet' || s === 'ueberfaellig';
    }),
    [enrichedRechnungen]
  );

  const offenGesamtbetrag = useMemo(
    () => offeneRechnungen.reduce((sum, r) => sum + (r.fields.gesamtbetrag ?? 0), 0),
    [offeneRechnungen]
  );

  // Aktive Angebote (Entwurf + Versendet)
  const aktiveAngebote = useMemo(
    () => enrichedAngebote.filter(r => {
      const s = lookupKey(r.fields.angebotsstatus);
      return s === 'entwurf' || s === 'versendet';
    }),
    [enrichedAngebote]
  );

  // Stunden aktueller Monat (aus Zeiterfassung-Einträgen)
  const stundenAktuellerMonat = useMemo(() => {
    const [year, month] = currentMonthKey.split('-').map(Number);
    return zeiterfassung
      .filter(z => {
        const mKey = lookupKey(z.fields.erfassungsmonat);
        const yr = z.fields.erfassungsjahr;
        if (!yr || !mKey) return false;
        // Monatsname zu Nummer-Mapping
        const monatMap: Record<string, number> = {
          januar: 1, februar: 2, maerz: 3, april: 4, mai: 5, juni: 6,
          juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
        };
        return yr === year && monatMap[mKey] === month;
      })
      .reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0);
  }, [zeiterfassung, currentMonthKey]);

  // Projekte Kanban-Karten
  const kanbanColumns = useMemo(() =>
    (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? 'primary' as const
        : o.key === 'abgeschlossen' ? 'success' as const
        : 'default' as const,
    })),
    []
  );

  const kanbanCards = useMemo((): KanbanCard[] =>
    enrichedProjekte
      .filter(p => !projektFilter || lookupKey(p.fields.projektstatus) === projektFilter)
      .map(p => ({
        id: p.record_id,
        column: lookupKey(p.fields.projektstatus) ?? '',
        title: p.fields.projektkennung ?? p.fields.projektnummer?.toString() ?? tx('Ohne Kennung'),
        subtitle: p.kundeName ? p.kundeName : undefined,
        tone: lookupKey(p.fields.projektstatus) === 'akquise' ? 'warning' as const : 'default' as const,
      })),
    [enrichedProjekte, projektFilter]
  );

  // Berater-Auslastung ChartRows (Stunden aktueller Monat pro Berater)
  const beraterStundenRows = useMemo((): ChartRow<{ beraterName: string; stunden: number }>[] => {
    // Summiere Zeiterfassung-Stunden pro Berater für aktuellen Monat
    const [year, month] = currentMonthKey.split('-').map(Number);
    const monatMap: Record<string, number> = {
      januar: 1, februar: 2, maerz: 3, april: 4, mai: 5, juni: 6,
      juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
    };
    const stundenByBerater = new Map<string, number>();
    for (const z of zeiterfassung) {
      const mKey = lookupKey(z.fields.erfassungsmonat);
      const yr = z.fields.erfassungsjahr;
      if (!yr || !mKey || yr !== year || monatMap[mKey] !== month) continue;
      if (!z.fields.berater) continue;
      const bId = z.fields.berater as string;
      stundenByBerater.set(bId, (stundenByBerater.get(bId) ?? 0) + (z.fields.stunden ?? 0));
    }
    return berater.map(b => ({
      id: `berater:${b.record_id}`,
      data: {
        beraterName: [b.fields.vorname, b.fields.nachname].filter(Boolean).join(' ') || b.record_id,
        stunden: stundenByBerater.get(b.record_id) ?? 0,
      },
    }));
  }, [berater, zeiterfassung, currentMonthKey]);

  // Kontext-Zeile
  const kontextZeile = useMemo(() => {
    const inBearbeitung = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung');
    const ueberfaellig = ueberfaelligeRechnungen.length;
    if (inBearbeitung.length === 0 && ueberfaellig === 0) {
      return tx('Alle Projekte im Plan — keine überfälligen Rechnungen.');
    }
    const projNames = namen(inBearbeitung.slice(0, 3).map(p => p.fields.projektkennung ?? ''));
    if (ueberfaellig > 0) {
      return tx`${projNames} aktiv — ${ueberfaellig} Rechnung überfällig.`;
    }
    return tx`${projNames} aktiv.`;
  }, [enrichedProjekte, ueberfaelligeRechnungen]);

  // WorkList: Offene Rechnungen nach Priorität (überfällig zuerst)
  const rechnungenWorkItems = useMemo(() =>
    offeneRechnungen
      .sort((a, b) => {
        const prio = (r: typeof offeneRechnungen[0]) =>
          lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig' ? 0
          : lookupKey(r.fields.rechnungsstatus) === 'versendet' ? 1 : 2;
        return prio(a) - prio(b);
      })
      .slice(0, 8)
      .map(r => {
        const status = lookupKey(r.fields.rechnungsstatus);
        const isUeberfaellig = status === 'ueberfaellig';
        const nextStep = status === 'entwurf' ? tx('Versenden')
          : status === 'versendet' || isUeberfaellig ? tx('Als bezahlt markieren')
          : undefined;
        return {
          id: r.record_id,
          title: r.kundeName || r.fields.rechnungsnummer || tx('Ohne Kunde'),
          secondLine: (
            <span className="flex gap-2 items-center min-w-0">
              <span className={isUeberfaellig ? 'font-medium text-destructive' : 'text-amber-600 font-medium'}>
                {r.fields.rechnungsstatus?.label ?? status}
              </span>
              {r.fields.gesamtbetrag != null && (
                <span className="text-muted-foreground">· {formatCurrency(r.fields.gesamtbetrag)}</span>
              )}
              {r.fields.faelligkeitsdatum && (
                <span className="text-muted-foreground">· {formatDate(r.fields.faelligkeitsdatum)}</span>
              )}
            </span>
          ),
          action: nextStep ? {
            label: nextStep,
            onClick: () => advanceRechnung(r, status === 'entwurf' ? 'versendet' : 'bezahlt'),
          } : undefined,
        };
      }),
    [offeneRechnungen]
  );

  // WorkList: Aktive Angebote
  const angeboteWorkItems = useMemo(() =>
    aktiveAngebote
      .slice(0, 5)
      .map(a => ({
        id: a.record_id,
        title: a.projektName || `${tx('Angebot')} ${a.fields.angebotsnummer ?? ''}`,
        secondLine: (
          <span className="flex gap-2 items-center min-w-0">
            <span className="text-amber-600 font-medium">
              {a.fields.angebotsstatus?.label ?? ''}
            </span>
            {a.fields.kostenbetrag != null && (
              <span className="text-muted-foreground">· {formatCurrency(a.fields.kostenbetrag)}</span>
            )}
          </span>
        ),
        action: lookupKey(a.fields.angebotsstatus) === 'entwurf' ? {
          label: tx('Versenden'),
          onClick: () => {
            const prev = a.fields.angebotsstatus;
            const newLookup = lookupOption('angebote', 'angebotsstatus', 'versendet');
            // optimistic
            crud.enriched.angebote; // no direct setter here, use fetchAll
            LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' })
              .then(() => {
                undoToast(tx`${a.fields.angebotsnummer?.toString() ?? ''} — versendet`, async () => {
                  await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: lookupKey(prev) });
                  fetchAll();
                });
                fetchAll();
              })
              .catch(() => fetchAll());
          },
        } : undefined,
      })),
    [aktiveAngebote, crud.enriched.angebote, fetchAll]
  );

  return (
    <div className="space-y-6">
      {/* Seiten-Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{kontextZeile}</p>
        </div>
        <button
          onClick={() => crud.projekte.openCreate({ projektstatus: 'akquise' })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <IconBriefcase size={16} className="shrink-0" />
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
              onClick: () => advanceRechnung(ueberfaelligeRechnungen[0], 'bezahlt'),
            }}
          >
            <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? r.fields.rechnungsnummer ?? ''))}</b>
            {' '}— {ueberfaelligeRechnungen.length === 1 ? tx('Rechnung überfällig') : tx('Rechnungen überfällig')}
            {ueberfaelligeRechnungen[0]?.fields.faelligkeitsdatum && (
              <>, {tx('fällig war')} <b>{formatDate(ueberfaelligeRechnungen[0].fields.faelligkeitsdatum)}</b></>
            )}
          </HeroBanner>
        )}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length > 0 ? formatCurrency(offenGesamtbetrag) : '—'}
              icon={<IconFileInvoice size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Aktive Angebote')}
              value={aktiveAngebote.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone={aktiveAngebote.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Stunden diesen Monat')}
              value={stundenAktuellerMonat > 0 ? `${stundenAktuellerMonat.toFixed(1)} h` : '—'}
              icon={<IconClockHour4 size={16} className="shrink-0" />}
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
              const p = projekte.find(x => x.record_id === card.id);
              if (p) crud.projekte.openDetail(p);
            }}
            onCardMove={async (cardId, newColumn) => {
              const p = projekte.find(x => x.record_id === cardId);
              if (!p) return;
              await advanceProjekt(p, newColumn);
            }}
            onAddCard={column => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene Rechnungen')}
              items={rechnungenWorkItems}
              onItemClick={id => {
                const r = rechnungen.find(x => x.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Keine offenen Rechnungen — alles beglichen.'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />
            <ChartWidget
              title={tx('Berater-Auslastung')}
              rows={beraterStundenRows}
              dimension={{ kind: 'category', accessor: r => r.data.beraterName }}
              measure={{ aggregate: 'sum', label: tx('Stunden'), value: r => r.data.stunden, format: 'number' }}
              footer={tx('Gebuchte Stunden im aktuellen Monat')}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
