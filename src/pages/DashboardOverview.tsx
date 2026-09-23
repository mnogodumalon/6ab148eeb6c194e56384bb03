import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { useState, useMemo } from 'react';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard } from '@/components/widgets/KanbanWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import { format } from 'date-fns';
import {
  IconAlertCircle,
  IconBriefcase,
  IconClock,
  IconFileInvoice,
  IconUsers,
  IconPlus,
} from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    kunden, berater, projekte, angebote, zeiterfassung, rechnungen,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const rec = top.record;
        const status = lookupKey(rec.fields.rechnungsstatus);
        if (status === 'versendet' || status === 'ueberfaellig') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: async () => {
              const prev = rec.fields.rechnungsstatus;
              const next = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');
              data.setRechnungen(rs => rs.map(r => r.record_id === rec.record_id
                ? { ...r, fields: { ...r.fields, rechnungsstatus: next } } : r));
              try {
                await LivingAppsService.updateRechnungenEntry(rec.record_id, { rechnungsstatus: 'bezahlt' });
                undoToast(tx`${rec.fields.rechnungsnummer ?? ''} — als bezahlt markiert`, async () => {
                  data.setRechnungen(rs => rs.map(r => r.record_id === rec.record_id
                    ? { ...r, fields: { ...r.fields, rechnungsstatus: prev } } : r));
                  await LivingAppsService.updateRechnungenEntry(rec.record_id, { rechnungsstatus: status ?? 'versendet' });
                });
              } catch {
                await fetchAll();
              }
            },
          };
        }
      }
      if (top.type === 'projekte') {
        const rec = top.record;
        const status = lookupKey(rec.fields.projektstatus);
        if (status === 'akquise') {
          return {
            label: tx('In Bearbeitung setzen'),
            onClick: async () => {
              const next = lookupOption('projekte', 'projektstatus', 'in_bearbeitung');
              data.setProjekte(ps => ps.map(p => p.record_id === rec.record_id
                ? { ...p, fields: { ...p.fields, projektstatus: next } } : p));
              try {
                await LivingAppsService.updateProjekteEntry(rec.record_id, { projektstatus: 'in_bearbeitung' });
                undoToast(tx`${rec.fields.projektkennung ?? ''} — in Bearbeitung`, async () => {
                  data.setProjekte(ps => ps.map(p => p.record_id === rec.record_id
                    ? { ...p, fields: { ...p.fields, projektstatus: lookupOption('projekte', 'projektstatus', 'akquise') } } : p));
                  await LivingAppsService.updateProjekteEntry(rec.record_id, { projektstatus: 'akquise' });
                });
              } catch {
                await fetchAll();
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

  const clock = useClock();

  const currentMonthKey = format(clock, 'yyyy-MM');
  const currentYear = clock.getFullYear();

  // Projektstatus-Pipeline
  const projektColumns = useMemo(() =>
    (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? 'primary' as const
        : o.key === 'abgeschlossen' ? 'success' as const
        : 'default' as const,
    })),
    []
  );

  const projektCards: KanbanCard[] = useMemo(() =>
    enrichedProjekte.map(p => ({
      id: `projekt:${p.record_id}`,
      column: lookupKey(p.fields.projektstatus) ?? 'akquise',
      title: p.fields.projektkennung ?? tx('Ohne Kennung'),
      subtitle: p.kundeName ? p.kundeName : undefined,
      tone: lookupKey(p.fields.projektstatus) === 'in_bearbeitung' ? 'primary' as const : 'default' as const,
    })),
    [enrichedProjekte]
  );

  // Rechnungen
  const ueberfaelligeRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'),
    [enrichedRechnungen]
  );

  const offeneRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => {
      const s = lookupKey(r.fields.rechnungsstatus);
      return s === 'versendet' || s === 'entwurf';
    }),
    [enrichedRechnungen]
  );

  const bezahlteRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'bezahlt'),
    [enrichedRechnungen]
  );

  // Zeiterfassung aktueller Monat
  const zeitCurrentMonth = useMemo(() =>
    enrichedZeiterfassung.filter(z => {
      if (!z.fields.datum) return false;
      return z.fields.datum.startsWith(currentMonthKey);
    }),
    [enrichedZeiterfassung, currentMonthKey]
  );

  const stundenMonat = useMemo(() =>
    zeitCurrentMonth.reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0),
    [zeitCurrentMonth]
  );

  // Angebote offen
  const offeneAngebote = useMemo(() =>
    angebote.filter(a => {
      const s = lookupKey(a.fields.angebotsstatus);
      return s === 'entwurf' || s === 'versendet';
    }),
    [angebote]
  );

  // KPI filter state
  const [rechnungsFilter, setRechnungsFilter] = useState<'ueberfaellig' | 'offen' | null>(null);

  // Advance Rechnung to bezahlt
  const advanceRechnung = async (r: typeof enrichedRechnungen[0]) => {
    const prev = r.fields.rechnungsstatus;
    const next = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');
    data.setRechnungen(rs => rs.map(rec => rec.record_id === r.record_id
      ? { ...rec, fields: { ...rec.fields, rechnungsstatus: next } } : rec));
    try {
      await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
      undoToast(tx`${r.fields.rechnungsnummer ?? ''} — als bezahlt markiert`, async () => {
        data.setRechnungen(rs => rs.map(rec => rec.record_id === r.record_id
          ? { ...rec, fields: { ...rec.fields, rechnungsstatus: prev } } : rec));
        await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: lookupKey(prev) ?? 'versendet' });
      });
    } catch {
      await fetchAll();
    }
  };

  // Advance Projekt to in_bearbeitung
  const advanceProjekt = async (p: typeof enrichedProjekte[0]) => {
    const next = lookupOption('projekte', 'projektstatus', 'in_bearbeitung');
    data.setProjekte(ps => ps.map(proj => proj.record_id === p.record_id
      ? { ...proj, fields: { ...proj.fields, projektstatus: next } } : proj));
    try {
      await LivingAppsService.updateProjekteEntry(p.record_id, { projektstatus: 'in_bearbeitung' });
      undoToast(tx`${p.fields.projektkennung ?? ''} — in Bearbeitung`, async () => {
        data.setProjekte(ps => ps.map(proj => proj.record_id === p.record_id
          ? { ...proj, fields: { ...proj.fields, projektstatus: lookupOption('projekte', 'projektstatus', 'akquise') } } : proj));
        await LivingAppsService.updateProjekteEntry(p.record_id, { projektstatus: 'akquise' });
      });
    } catch {
      await fetchAll();
    }
  };

  // Kanban drag write
  const handleCardMove = async (cardId: string, newColumn: string) => {
    const id = cardId.split(':')[1];
    const p = projekte.find(x => x.record_id === id);
    if (!p) return;
    const prev = p.fields.projektstatus;
    const next = lookupOption('projekte', 'projektstatus', newColumn);
    data.setProjekte(ps => ps.map(proj => proj.record_id === id
      ? { ...proj, fields: { ...proj.fields, projektstatus: next } } : proj));
    try {
      await LivingAppsService.updateProjekteEntry(id, { projektstatus: newColumn });
      undoToast(tx`${p.fields.projektkennung ?? ''} — Status geändert`, async () => {
        data.setProjekte(ps => ps.map(proj => proj.record_id === id
          ? { ...proj, fields: { ...proj.fields, projektstatus: prev } } : proj));
        const prevKey = lookupKey(prev);
        if (prevKey) await LivingAppsService.updateProjekteEntry(id, { projektstatus: prevKey });
      });
    } catch {
      await fetchAll();
    }
  };

  // Context line
  const akquise = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise');
  const contextLine = useMemo(() => {
    const inProgress = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung');
    if (inProgress.length === 0 && akquise.length === 0) {
      return tx('Noch keine Projekte erfasst — lege das erste Projekt an.');
    }
    const names = namen(inProgress.map(p => p.kundeName ?? p.fields.projektkennung ?? ''));
    if (inProgress.length > 0 && ueberfaelligeRechnungen.length > 0) {
      return tx`${names} in Bearbeitung — ${String(ueberfaelligeRechnungen.length)} Rechnung(en) überfällig.`;
    }
    if (inProgress.length > 0) {
      return tx`${names} in Bearbeitung — ${String(stundenMonat)} Std. diesen Monat erfasst.`;
    }
    return tx`${String(akquise.length)} Projekte in der Akquise.`;
  }, [enrichedProjekte, ueberfaelligeRechnungen, stundenMonat]);

  // Rechnungen list based on filter
  const rechnungsListItems = useMemo(() => {
    const list = rechnungsFilter === 'ueberfaellig' ? ueberfaelligeRechnungen
      : rechnungsFilter === 'offen' ? offeneRechnungen
      : [...ueberfaelligeRechnungen, ...offeneRechnungen.slice(0, Math.max(0, 8 - ueberfaelligeRechnungen.length))];
    return list.map(r => {
      const s = lookupKey(r.fields.rechnungsstatus);
      const isUeberfaellig = s === 'ueberfaellig';
      return {
        id: r.record_id,
        title: r.kundeName ?? r.fields.rechnungsnummer ?? tx('Rechnung'),
        secondLine: (
          <>
            <span className={isUeberfaellig ? 'font-medium text-destructive' : 'font-medium text-amber-600'}>
              {isUeberfaellig ? tx('Überfällig') : tx('Versendet')}
            </span>
            {r.fields.faelligkeitsdatum && (
              <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
            )}
            {r.fields.gesamtbetrag && (
              <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)}</span>
            )}
          </>
        ),
        action: isUeberfaellig
          ? { label: tx('Bezahlt'), onClick: () => advanceRechnung(r) }
          : undefined,
      };
    });
  }, [enrichedRechnungen, rechnungsFilter, ueberfaelligeRechnungen, offeneRechnungen]);

  // Chart rows for Zeiterfassung by Berater (current month)
  const zeitChartRows = useMemo(() =>
    zeitCurrentMonth.map(z => ({
      id: `zeit:${z.record_id}`,
      data: z,
    })),
    [zeitCurrentMonth]
  );

  // Angebote WorkList — versendet (waiting for response)
  const versendetAngebote = useMemo(() =>
    offeneAngebote.filter(a => lookupKey(a.fields.angebotsstatus) === 'versendet'),
    [offeneAngebote]
  );

  const heroRechnung = ueberfaelligeRechnungen[0];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground truncate">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.projekte.openCreate({})}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <IconPlus size={16} className="shrink-0" />
          <span className="hidden sm:inline">{tx('Neues Projekt')}</span>
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroRechnung && (
          <HeroBanner
            icon={<IconAlertCircle size={18} />}
            action={{
              label: tx('Als bezahlt markieren'),
              onClick: () => advanceRechnung(heroRechnung),
            }}
          >
            <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? ''))}</b>
            {' — '}{tx(`${ueberfaelligeRechnungen.length} Rechnung(en) überfällig`)}.
            {heroRechnung.fields.faelligkeitsdatum && (
              <> {tx('Fällig seit')} <b>{formatDate(heroRechnung.fields.faelligkeitsdatum)}</b>.</>
            )}
          </HeroBanner>
        )}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Projekte aktiv')}
              value={enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung').length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone="primary"
            />
            <StatStripItem
              title={tx('Akquise')}
              value={akquise.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone={akquise.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Std. diesen Monat')}
              value={stundenMonat}
              icon={<IconClock size={16} className="shrink-0" />}
              tone={stundenMonat > 0 ? 'default' : 'default'}
            />
            <StatStripItem
              title={tx('Rechnungen offen')}
              value={offeneRechnungen.length + ueberfaelligeRechnungen.length}
              icon={<IconFileInvoice size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
              onClick={() => setRechnungsFilter(f => f === 'ueberfaellig' ? null : 'ueberfaellig')}
              active={rechnungsFilter === 'ueberfaellig'}
            />
            <StatStripItem
              title={tx('Kunden')}
              value={kunden.length}
              icon={<IconUsers size={16} className="shrink-0" />}
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
              const p = projekte.find(x => x.record_id === id);
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
              items={rechnungsListItems}
              onItemClick={(id) => {
                const r = rechnungen.find(x => x.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              max={6}
              empty={{
                text: tx('Alle Rechnungen bezahlt — keine offenen Posten.'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />
            <ChartWidget
              title={tx('Stunden diesen Monat')}
              rows={zeitChartRows}
              dimension={{
                kind: 'category',
                accessor: (r) => r.data.beraterName ?? r.data.fields.berater ?? null,
                label: tx('Berater'),
              }}
              measure={{
                aggregate: 'sum',
                value: (r) => r.data.fields.stunden ?? null,
                label: tx('Stunden'),
                format: 'number',
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
