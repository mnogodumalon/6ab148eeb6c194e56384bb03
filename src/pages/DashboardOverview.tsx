import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { useState, useMemo, useCallback } from 'react';
import { format, parseISO, isBefore, isAfter } from 'date-fns';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { formatCurrency, formatDate, lookupKey } from '@/lib/formatters';
import { lookupOption } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard } from '@/components/widgets/KanbanWidget';

import {
  IconAlertCircle,
  IconClock,
  IconBriefcase,
  IconFileInvoice,
  IconReportMoney,
  IconPlus,
  IconCheck,
} from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    projekte, angebote, zeiterfassung, rechnungen, berater,
    setProjekte, setRechnungen,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const r = top.record;
        const status = r.fields.rechnungsstatus?.key;
        if (status === 'versendet' || status === 'ueberfaellig') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: async () => {
              const snapshot = r.fields.rechnungsstatus;
              const next = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');
              setRechnungen(prev => prev.map(x =>
                x.record_id === r.record_id
                  ? { ...x, fields: { ...x.fields, rechnungsstatus: next } }
                  : x
              ));
              try {
                await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                undoToast(tx`${r.fields.rechnungsnummer ?? ''} — als bezahlt markiert`, async () => {
                  setRechnungen(prev => prev.map(x =>
                    x.record_id === r.record_id
                      ? { ...x, fields: { ...x.fields, rechnungsstatus: snapshot } }
                      : x
                  ));
                  await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: snapshot?.key ?? 'versendet' });
                });
              } catch {
                fetchAll();
              }
            },
          };
        }
      }
      if (top.type === 'angebote') {
        const a = top.record;
        const status = a.fields.angebotsstatus?.key;
        if (status === 'entwurf') {
          return {
            label: tx('Als versendet markieren'),
            onClick: async () => {
              const next = lookupOption('angebote', 'angebotsstatus', 'versendet');
              try {
                await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
                undoToast(tx`${a.fields.angebotsnummer ? String(a.fields.angebotsnummer) : ''} — versendet`);
                fetchAll();
              } catch {
                fetchAll();
              }
            },
          };
        }
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;
  const enrichedAngebote = crud.enriched.angebote;

  const clock = useClock();
  const heute = format(clock, 'yyyy-MM-dd');

  // KPI derivations
  const aktiveProjekte = useMemo(() =>
    enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'),
    [enrichedProjekte]
  );
  const akquiseProjekte = useMemo(() =>
    enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise'),
    [enrichedProjekte]
  );
  const offeneRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => {
      const s = lookupKey(r.fields.rechnungsstatus);
      return s === 'versendet' || s === 'ueberfaellig';
    }),
    [enrichedRechnungen]
  );
  const ueberfaelligeRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'),
    [enrichedRechnungen]
  );
  const offeneBetrag = useMemo(() =>
    offeneRechnungen.reduce((sum, r) => sum + (r.fields.gesamtbetrag ?? r.fields.nettobetrag ?? 0), 0),
    [offeneRechnungen]
  );

  const letzteZeiterfassung = useMemo(() =>
    [...enrichedZeiterfassung]
      .sort((a, b) => (b.fields.datum ?? '').localeCompare(a.fields.datum ?? ''))
      .slice(0, 8),
    [enrichedZeiterfassung]
  );

  const entwurfAngebote = useMemo(() =>
    enrichedAngebote.filter(a => {
      const s = lookupKey(a.fields.angebotsstatus);
      return s === 'entwurf' || s === 'versendet';
    }).sort((a, b) => (b.fields.angebotsjahr ?? 0) - (a.fields.angebotsjahr ?? 0)),
    [enrichedAngebote]
  );

  // Kanban columns — built inside component body (locale-aware getters)
  const kanbanColumns = useMemo(() =>
    (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? ('primary' as const)
        : o.key === 'akquise' ? ('warning' as const)
        : ('default' as const),
    })),
    []
  );

  const kanbanCards: KanbanCard[] = useMemo(() =>
    enrichedProjekte.map(p => ({
      id: `projekt:${p.record_id}`,
      column: lookupKey(p.fields.projektstatus) ?? '',
      title: p.fields.projektkennung ?? tx('Kein Titel'),
      subtitle: p.kundeName
        ? `${p.kundeName}${p.projektleitungName ? ` · ${p.projektleitungName}` : ''}`
        : p.projektleitungName ?? undefined,
      tone: lookupKey(p.fields.projektstatus) === 'in_bearbeitung' ? 'primary' as const : 'default' as const,
    })),
    [enrichedProjekte]
  );

  const handleCardMove = useCallback(async (cardId: string, newColumn: string) => {
    const recordId = cardId.split(':')[1];
    const projekt = projekte.find(p => p.record_id === recordId);
    if (!projekt) return;
    const snapshot = projekt.fields.projektstatus;
    const next = lookupOption('projekte', 'projektstatus', newColumn);
    setProjekte(prev => prev.map(p =>
      p.record_id === recordId
        ? { ...p, fields: { ...p.fields, projektstatus: next } }
        : p
    ));
    try {
      await LivingAppsService.updateProjekteEntry(recordId, { projektstatus: newColumn });
      undoToast(tx`${projekt.fields.projektkennung ?? ''} — verschoben nach ${next.label}`, async () => {
        setProjekte(prev => prev.map(p =>
          p.record_id === recordId
            ? { ...p, fields: { ...p.fields, projektstatus: snapshot } }
            : p
        ));
        await LivingAppsService.updateProjekteEntry(recordId, { projektstatus: snapshot?.key ?? 'akquise' });
      });
    } catch {
      fetchAll();
    }
  }, [projekte, setProjekte, fetchAll]);

  // Context line: name people present today
  const kontextlinie = useMemo(() => {
    const aktiv = berater.filter(b => lookupKey(b.fields.status) === 'aktiv');
    if (aktiv.length === 0) return tx('Keine aktiven Berater.');
    const names = aktiv.map(b => b.fields.vorname ?? b.fields.nachname ?? '').filter(Boolean);
    return tx`${namen(names)} aktiv · ${aktiveProjekte.length} Projekte in Bearbeitung`;
  }, [berater, aktiveProjekte]);

  // Hero: überfällige Rechnungen
  const ersteUeberfaellige = ueberfaelligeRechnungen[0];

  const markiereAlsBezahlt = useCallback(async (r: typeof ersteUeberfaellige) => {
    if (!r) return;
    const snapshot = r.fields.rechnungsstatus;
    const next = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');
    setRechnungen(prev => prev.map(x =>
      x.record_id === r.record_id
        ? { ...x, fields: { ...x.fields, rechnungsstatus: next } }
        : x
    ));
    try {
      await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
      undoToast(tx`${r.fields.rechnungsnummer ?? ''} — als bezahlt markiert`, async () => {
        setRechnungen(prev => prev.map(x =>
          x.record_id === r.record_id
            ? { ...x, fields: { ...x.fields, rechnungsstatus: snapshot } }
            : x
        ));
        await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: snapshot?.key ?? 'versendet' });
      });
    } catch {
      fetchAll();
    }
  }, [setRechnungen, fetchAll]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{kontextlinie}</p>
        </div>
        <button
          onClick={() => crud.projekte.openCreate({})}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={ueberfaelligeRechnungen.length > 0 && ersteUeberfaellige ? (
          <HeroBanner
            icon={<IconAlertCircle size={18} />}
            action={{
              label: tx('Als bezahlt markieren'),
              onClick: () => markiereAlsBezahlt(ersteUeberfaellige),
            }}
          >
            <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? r.fields.rechnungsnummer ?? ''))}</b>
            {' — '}{tx('überfällige Rechnung')}{ueberfaelligeRechnungen.length > 1 ? tx`n (${ueberfaelligeRechnungen.length})` : ''}{' · '}
            {formatCurrency(ueberfaelligeRechnungen.reduce((s, r) => s + (r.fields.gesamtbetrag ?? 0), 0))}
          </HeroBanner>
        ) : undefined}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={aktiveProjekte.length}
              icon={<IconBriefcase size={16} />}
              tone={aktiveProjekte.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Akquise')}
              value={akquiseProjekte.length}
              icon={<IconBriefcase size={16} />}
              tone={akquiseProjekte.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length}
              icon={<IconFileInvoice size={16} />}
              tone={offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Ausstehend')}
              value={formatCurrency(offeneBetrag)}
              icon={<IconReportMoney size={16} />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneBetrag > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={kanbanColumns}
            cards={kanbanCards}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={(card) => {
              const recordId = card.id.split(':')[1];
              const projekt = enrichedProjekte.find(p => p.record_id === recordId);
              if (projekt) crud.projekte.openDetail(projekt);
            }}
            onCardMove={handleCardMove}
            onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene & überfällige Rechnungen')}
              max={6}
              items={offeneRechnungen
                .sort((a, b) => {
                  const aO = lookupKey(a.fields.rechnungsstatus) === 'ueberfaellig' ? 0 : 1;
                  const bO = lookupKey(b.fields.rechnungsstatus) === 'ueberfaellig' ? 0 : 1;
                  if (aO !== bO) return aO - bO;
                  return (a.fields.faelligkeitsdatum ?? '').localeCompare(b.fields.faelligkeitsdatum ?? '');
                })
                .map(r => {
                  const isUeberfaellig = lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig';
                  return {
                    id: r.record_id,
                    title: r.kundeName ?? r.fields.rechnungsnummer ?? tx('Unbekannt'),
                    secondLine: (
                      <>
                        <span className={isUeberfaellig ? 'font-medium text-destructive' : 'font-medium text-amber-600'}>
                          {isUeberfaellig ? tx('Überfällig') : tx('Versendet')}
                        </span>
                        {r.fields.gesamtbetrag
                          ? <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)}</span>
                          : null}
                        {r.fields.faelligkeitsdatum
                          ? <span className="text-muted-foreground"> · {tx('fällig')} {formatDate(r.fields.faelligkeitsdatum)}</span>
                          : null}
                      </>
                    ),
                    action: {
                      label: tx('Bezahlt'),
                      onClick: () => markiereAlsBezahlt(r),
                    },
                  };
                })}
              onItemClick={(id) => {
                const r = enrichedRechnungen.find(x => x.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Alle Rechnungen beglichen — gut gemacht!'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />

            <WorkList
              title={tx('Angebote in Bearbeitung')}
              max={5}
              items={entwurfAngebote.map(a => {
                const status = lookupKey(a.fields.angebotsstatus);
                return {
                  id: a.record_id,
                  title: a.projektName ?? `${tx('Angebot')} ${a.fields.angebotsnummer ?? ''}`,
                  secondLine: (
                    <>
                      <span className={status === 'entwurf' ? 'font-medium text-muted-foreground' : 'font-medium text-amber-600'}>
                        {status === 'entwurf' ? tx('Entwurf') : tx('Versendet')}
                      </span>
                      {a.fields.kostenbetrag
                        ? <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
                        : null}
                      {a.beraterName
                        ? <span className="text-muted-foreground"> · {a.beraterName}</span>
                        : null}
                    </>
                  ),
                  action: status === 'entwurf' ? {
                    label: tx('Versenden'),
                    onClick: async () => {
                      try {
                        await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
                        undoToast(tx`Angebot ${String(a.fields.angebotsnummer ?? '')} — versendet`);
                        fetchAll();
                      } catch {
                        fetchAll();
                      }
                    },
                  } : undefined,
                };
              })}
              onItemClick={(id) => {
                const a = enrichedAngebote.find(x => x.record_id === id);
                if (a) crud.angebote.openDetail(a);
              }}
              empty={{
                text: tx('Keine offenen Angebote.'),
                action: { label: tx('Neues Angebot'), onClick: () => crud.angebote.openCreate({}) },
              }}
            />

            <WorkList
              title={tx('Letzte Zeiterfassung')}
              max={6}
              items={letzteZeiterfassung.map(z => ({
                id: z.record_id,
                title: z.beraterName ?? tx('Unbekannt'),
                secondLine: (
                  <>
                    <span className="font-medium text-muted-foreground">
                      {z.fields.stunden != null ? `${z.fields.stunden}h` : '—'}
                    </span>
                    {z.projektName
                      ? <span className="text-muted-foreground"> · {z.projektName}</span>
                      : null}
                    {z.fields.datum
                      ? <span className="text-muted-foreground"> · {formatDate(z.fields.datum)}</span>
                      : null}
                  </>
                ),
              }))}
              onItemClick={(id) => {
                const z = enrichedZeiterfassung.find(x => x.record_id === id);
                if (z) crud.zeiterfassung.openDetail(z);
              }}
              empty={{
                text: tx('Noch keine Stunden erfasst.'),
                action: { label: tx('Stunden buchen'), onClick: () => crud.zeiterfassung.openCreate({}) },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
