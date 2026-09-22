import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedProjekte, EnrichedAngebote, EnrichedRechnungen } from '@/types/enriched';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { tx, appLabel } from '@/i18n';
import { useState, useMemo } from 'react';
import { DashboardGrid } from '@/components/DashboardGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard } from '@/components/widgets/KanbanWidget';
import {
  IconAlertTriangle,
  IconClock,
  IconFileInvoice,
  IconBriefcase,
  IconPlus,
  IconChartBar,
} from '@tabler/icons-react';
import { format } from 'date-fns';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    projekte, angebote, zeiterfassung, rechnungen, berater,
    fetchAll,
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
              await LivingAppsService.updateRechnungenEntry(r.record_id, {
                rechnungsstatus: 'bezahlt',
              });
              undoToast(tx`${r.fields.rechnungsnummer ?? ''} — als bezahlt markiert`, async () => {
                await LivingAppsService.updateRechnungenEntry(r.record_id, {
                  rechnungsstatus: lookupKey(prev) ?? 'versendet',
                });
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
              await LivingAppsService.updateAngeboteEntry(a.record_id, {
                angebotsstatus: 'versendet',
              });
              undoToast(tx`Angebot ${String(a.fields.angebotsnummer ?? '')} — versendet`, async () => {
                await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'entwurf' });
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
  const enrichedAngebote = crud.enriched.angebote as EnrichedAngebote[];
  const enrichedRechnungen = crud.enriched.rechnungen as EnrichedRechnungen[];

  const clock = useClock();

  // ── Filter state for KPI strip ──
  const [rechnungFilter, setRechnungFilter] = useState<'ueberfaellig' | 'versendet' | null>(null);

  // ── Derived data ──
  const heute = format(clock, 'yyyy-MM-dd');
  const currentYear = clock.getFullYear();
  const currentMonth = clock.getMonth() + 1; // 1-based

  const ueberfaelligeRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => {
      const status = lookupKey(r.fields.rechnungsstatus);
      if (status === 'ueberfaellig') return true;
      if (status === 'versendet' && r.fields.faelligkeitsdatum && r.fields.faelligkeitsdatum < heute) return true;
      return false;
    }),
    [enrichedRechnungen, heute]
  );

  const offeneRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => {
      const status = lookupKey(r.fields.rechnungsstatus);
      return status === 'versendet' || status === 'ueberfaellig';
    }),
    [enrichedRechnungen]
  );

  const aktiveProjekte = useMemo(() =>
    enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'),
    [enrichedProjekte]
  );

  // Stunden dieser Woche (aktueller Monat aus Zeiterfassung)
  const stundenDieserMonat = useMemo(() => {
    return zeiterfassung.reduce((sum, z) => {
      const year = z.fields.erfassungsjahr;
      const monatKey = lookupKey(z.fields.erfassungsmonat);
      const monthKeyToNum: Record<string, number> = {
        januar: 1, februar: 2, maerz: 3, april: 4, mai: 5, juni: 6,
        juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
      };
      const monatNum = monatKey ? monthKeyToNum[monatKey] : undefined;
      if (year === currentYear && monatNum === currentMonth) {
        return sum + (z.fields.stunden ?? 0);
      }
      return sum;
    }, 0);
  }, [zeiterfassung, currentYear, currentMonth]);

  // Angebote nach Status
  const angeboteVersendet = useMemo(() =>
    enrichedAngebote.filter(a => lookupKey(a.fields.angebotsstatus) === 'versendet'),
    [enrichedAngebote]
  );
  const angeboteEntwurf = useMemo(() =>
    enrichedAngebote.filter(a => lookupKey(a.fields.angebotsstatus) === 'entwurf'),
    [enrichedAngebote]
  );

  // ── Kanban columns from schema ──
  const projektColumns = useMemo(() =>
    (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'abgeschlossen' ? ('success' as const)
        : o.key === 'akquise' ? ('warning' as const)
        : ('primary' as const),
    })),
    []
  );

  // ── Kanban cards ──
  const projektCards = useMemo((): KanbanCard[] =>
    enrichedProjekte.map(p => ({
      id: `projekt:${p.record_id}`,
      column: lookupKey(p.fields.projektstatus) ?? '',
      title: p.fields.projektkennung ?? tx('Ohne Kennung'),
      subtitle: [
        p.kundeName,
        p.fields.projektart?.label,
      ].filter(Boolean).join(' · '),
      tone: lookupKey(p.fields.projektstatus) === 'akquise' ? 'warning' : 'default',
    })),
    [enrichedProjekte]
  );

  // ── Kanban status move handler ──
  const handleCardMove = async (cardId: string, newColumn: string) => {
    const id = cardId.split(':')[1];
    const projekt = enrichedProjekte.find(p => p.record_id === id);
    if (!projekt) return;
    const prevStatus = lookupKey(projekt.fields.projektstatus) ?? '';
    const prevOpt = lookupOption('projekte', 'projektstatus', prevStatus);
    const newOpt = lookupOption('projekte', 'projektstatus', newColumn);
    // Optimistic update
    data.setProjekte(prev => prev.map(p =>
      p.record_id === id
        ? { ...p, fields: { ...p.fields, projektstatus: newOpt } }
        : p
    ));
    try {
      await LivingAppsService.updateProjekteEntry(id, { projektstatus: newColumn });
      undoToast(
        tx`${projekt.fields.projektkennung ?? ''} — nach ${newOpt.label} verschoben`,
        async () => {
          await LivingAppsService.updateProjekteEntry(id, { projektstatus: prevOpt.key });
          fetchAll();
        }
      );
    } catch {
      fetchAll();
    }
  };

  // ── Context line ──
  const kontextZeile = useMemo(() => {
    if (ueberfaelligeRechnungen.length > 0) {
      const namen_ = namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? r.fields.rechnungsnummer ?? ''));
      return tx`${namen_} — offene Rechnungen überfällig.`;
    }
    if (aktiveProjekte.length > 0) {
      const n = aktiveProjekte.length;
      const namen_ = namen(aktiveProjekte.slice(0, 3).map(p => p.fields.projektkennung ?? p.kundeName ?? ''));
      return n === 1
        ? tx`${namen_} — 1 aktives Projekt läuft gerade.`
        : tx`${namen_} — ${n} aktive Projekte laufen gerade.`;
    }
    return tx('Alles ruhig — starte mit einem neuen Projekt.');
  }, [ueberfaelligeRechnungen, aktiveProjekte]);

  // ── Displayed rechnungen (filtered by strip) ──
  const displayedRechnungen = useMemo(() => {
    if (rechnungFilter === 'ueberfaellig') return ueberfaelligeRechnungen;
    if (rechnungFilter === 'versendet') return offeneRechnungen;
    return offeneRechnungen;
  }, [rechnungFilter, ueberfaelligeRechnungen, offeneRechnungen]);

  // ── Berater Stunden this month ──
  const beraterStunden = useMemo(() => {
    return berater
      .filter(b => lookupKey(b.fields.status) === 'aktiv')
      .map(b => ({
        name: `${b.fields.vorname ?? ''} ${b.fields.nachname ?? ''}`.trim(),
        stunden: b.fields.stunden_aktueller_monat ?? 0,
        record: b,
      }))
      .sort((a, b) => b.stunden - a.stunden);
  }, [berater]);

  const totalStundenBerater = useMemo(() =>
    beraterStunden.reduce((s, b) => s + b.stunden, 0),
    [beraterStunden]
  );

  // ── Mark a Rechnung as paid ──
  const markiereAlsBezahlt = async (r: EnrichedRechnungen) => {
    const prev = lookupKey(r.fields.rechnungsstatus) ?? 'versendet';
    data.setRechnungen(prev_ => prev_.map(rec =>
      rec.record_id === r.record_id
        ? { ...rec, fields: { ...rec.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt') } }
        : rec
    ));
    try {
      await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
      undoToast(
        tx`${r.fields.rechnungsnummer ?? ''} — als bezahlt markiert`,
        async () => {
          await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: prev });
          fetchAll();
        }
      );
    } catch {
      fetchAll();
    }
  };

  // ── Empty state ──
  if (projekte.length === 0 && rechnungen.length === 0 && angebote.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <IconBriefcase size={48} className="text-muted-foreground" stroke={1.5} />
        <div>
          <h2 className="text-xl font-semibold mb-1">{tx('Willkommen im inclou. ERP')}</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            {tx('Lege dein erstes Projekt an und starte mit der Verwaltung.')}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          onClick={() => crud.projekte.openCreate({ projektstatus: 'akquise' })}
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Erstes Projekt anlegen')}
        </button>
        {crud.surfaces}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{kontextZeile}</p>
        </div>
        <button
          className="self-start inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
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
              onClick: () => markiereAlsBezahlt(ueberfaelligeRechnungen[0]),
            }}
          >
            <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? r.fields.rechnungsnummer ?? ''))}</b>
            {' — '}
            {ueberfaelligeRechnungen.length === 1
              ? tx('1 Rechnung ist überfällig')
              : tx`${ueberfaelligeRechnungen.length} Rechnungen sind überfällig`}
            {ueberfaelligeRechnungen[0].fields.faelligkeitsdatum && (
              <> · {tx('fällig seit')} <b>{formatDate(ueberfaelligeRechnungen[0].fields.faelligkeitsdatum)}</b></>
            )}
          </HeroBanner>
        )}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={aktiveProjekte.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone="primary"
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length}
              icon={<IconFileInvoice size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
              onClick={() => setRechnungFilter(f => f === 'versendet' ? null : 'versendet')}
              active={rechnungFilter === 'versendet'}
            />
            <StatStripItem
              title={tx('Überfällig')}
              value={ueberfaelligeRechnungen.length}
              icon={<IconAlertTriangle size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : 'default'}
              onClick={() => setRechnungFilter(f => f === 'ueberfaellig' ? null : 'ueberfaellig')}
              active={rechnungFilter === 'ueberfaellig'}
            />
            <StatStripItem
              title={tx('Stunden diesen Monat')}
              value={`${stundenDieserMonat.toFixed(1)} h`}
              icon={<IconClock size={16} className="shrink-0" />}
              tone="default"
            />
            <StatStripItem
              title={tx('Angebote offen')}
              value={angeboteVersendet.length + angeboteEntwurf.length}
              icon={<IconChartBar size={16} className="shrink-0" />}
              tone={angeboteVersendet.length > 0 ? 'warning' : 'default'}
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
              const projekt = enrichedProjekte.find(p => p.record_id === id);
              if (projekt) crud.projekte.openDetail(projekt);
            }}
            onCardMove={handleCardMove}
            onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            {/* Offene / überfällige Rechnungen */}
            <WorkList
              title={rechnungFilter === 'ueberfaellig' ? tx('Überfällige Rechnungen') : tx('Offene Rechnungen')}
              items={displayedRechnungen.slice(0, 8).map(r => {
                const isUeberfaellig = ueberfaelligeRechnungen.some(u => u.record_id === r.record_id);
                return {
                  id: r.record_id,
                  title: r.kundeName ?? r.fields.rechnungsnummer ?? tx('Unbekannt'),
                  secondLine: (
                    <>
                      {isUeberfaellig
                        ? <span className="font-medium text-destructive">{tx('Überfällig')}</span>
                        : <span className="text-amber-600 font-medium">{tx('Versendet')}</span>
                      }
                      {r.fields.faelligkeitsdatum && (
                        <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
                      )}
                      {r.fields.gesamtbetrag != null && (
                        <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)}</span>
                      )}
                    </>
                  ),
                  action: {
                    label: tx('✓ Bezahlt'),
                    onClick: () => markiereAlsBezahlt(r),
                  },
                };
              })}
              onItemClick={(id) => {
                const r = enrichedRechnungen.find(r => r.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Alle Rechnungen bezahlt — super!'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />

            {/* Angebote & Berater-Stunden */}
            <WorkList
              title={tx('Angebote & Beraterauslastung')}
              items={[
                // Angebote zuerst
                ...angeboteVersendet.slice(0, 4).map(a => ({
                  id: `ang:${a.record_id}`,
                  title: `${tx('Angebot')} #${a.fields.angebotsnummer ?? ''}`,
                  secondLine: (
                    <>
                      <span className="text-amber-600 font-medium">{tx('Versendet')}</span>
                      {a.projektName && (
                        <span className="text-muted-foreground"> · {a.projektName}</span>
                      )}
                      {a.fields.kostenbetrag != null && (
                        <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
                      )}
                    </>
                  ),
                  action: {
                    label: tx('Angenommen'),
                    onClick: async () => {
                      await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'angenommen' });
                      undoToast(tx`Angebot ${String(a.fields.angebotsnummer ?? '')} — angenommen`, async () => {
                        await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
                        fetchAll();
                      });
                      fetchAll();
                    },
                  },
                })),
                // Berater-Stunden
                ...beraterStunden.slice(0, 4).map(b => ({
                  id: `berater:${b.record.record_id}`,
                  title: b.name || appLabel('berater'),
                  secondLine: (
                    <>
                      <span className="text-muted-foreground">{tx('Diesen Monat:')}</span>
                      {' '}
                      <span className="font-medium">{b.stunden.toFixed(1)} h</span>
                      {totalStundenBerater > 0 && (
                        <span className="text-muted-foreground">
                          {' '}({Math.round((b.stunden / totalStundenBerater) * 100)} %)
                        </span>
                      )}
                    </>
                  ),
                })),
              ]}
              onItemClick={(id) => {
                if (id.startsWith('ang:')) {
                  const rid = id.slice(4);
                  const a = enrichedAngebote.find(a => a.record_id === rid);
                  if (a) crud.angebote.openDetail(a);
                } else if (id.startsWith('berater:')) {
                  const rid = id.slice(8);
                  const b = berater.find(b => b.record_id === rid);
                  if (b) crud.berater.openDetail(b);
                }
              }}
              empty={{
                text: tx('Keine offenen Angebote — erstelle ein neues.'),
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
